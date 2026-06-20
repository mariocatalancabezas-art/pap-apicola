import React, { useState, useEffect } from 'react'
import { Download, Upload, Trash2, AlertTriangle, Info } from 'lucide-react'
import { db } from '../lib/db'
import { exportBackup, shareBackup } from '../lib/exports'
import ShareButton from '../components/ShareButton'

export default function Backups() {
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [alertas, setAlertas] = useState([])
  const [totalLocal, setTotalLocal] = useState(0)

  useEffect(() => {
    db.visitas.count().then(setTotalLocal)
  }, [])

  function msg(text, type = 'info') {
    setStatus(text)
    setStatusType(type)
  }

  async function doExportBackup() {
    try {
      const visitas = await db.visitas.toArray()
      exportBackup(visitas)
      msg(`✓ Copia exportada (${visitas.length} diagnósticos)`, 'ok')
    } catch (err) {
      msg('✗ Error: ' + err.message, 'error')
    }
  }

  async function doShareBackup() {
    try {
      const visitas = await db.visitas.toArray()
      shareBackup(visitas)
      msg(`✓ Compartiendo copia (${visitas.length} diagnósticos)`, 'ok')
    } catch (err) {
      msg('✗ Error: ' + err.message, 'error')
    }
  }

  async function importBackup(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.visitas) throw new Error('Formato inválido')

      const localVisitas = await db.visitas.toArray()
      const localNums = new Map(localVisitas.map(v => [String(v.f20_numero_encuesta), v]))
      const localUuids = new Set(localVisitas.map(v => v.uuid))

      const nuevosDiags = []
      const dupNums = []
      const dupUuids = []

      for (const item of data.visitas) {
        const numEnc = String(item.f20_numero_encuesta || '')
        if (localUuids.has(item.uuid)) {
          dupUuids.push(numEnc || item.uuid)
          continue
        }
        if (numEnc && localNums.has(numEnc)) {
          dupNums.push({ numEnc, remoto: item, local: localNums.get(numEnc) })
        } else {
          nuevosDiags.push(item)
        }
      }

      let importados = 0
      for (const item of nuevosDiags) {
        const { id, ...rest } = item
        await db.visitas.add(rest)
        importados++
      }

      const nuevasAlertas = dupNums.map(d => ({
        id: d.numEnc,
        msg: `⚠️ N° encuesta ${d.numEnc} ya existe en este dispositivo`,
        remoto: d.remoto,
        local: d.local,
      }))

      setAlertas(nuevasAlertas)
      db.visitas.count().then(setTotalLocal)

      let resumen = `✓ Importados: ${importados} nuevos diagnósticos.`
      if (dupUuids.length) resumen += ` ${dupUuids.length} ya existían (omitidos).`
      if (dupNums.length) resumen += ` ⚠️ ${dupNums.length} con N° encuesta duplicado — ver alertas abajo.`
      msg(resumen, importados > 0 ? 'ok' : 'warn')
    } catch (err) {
      msg('✗ Error al importar: ' + err.message, 'error')
    }
  }

  async function resolverDup(alerta, accion) {
    if (accion === 'mantener') {
      msg(`✓ Se mantuvo el diagnóstico local N° ${alerta.id}`, 'ok')
    } else if (accion === 'reemplazar') {
      const local = await db.visitas.where('uuid').equals(alerta.local.uuid).first()
      if (local) {
        const { id, ...rest } = alerta.remoto
        await db.visitas.update(local.id, rest)
      } else {
        const { id, ...rest } = alerta.remoto
        await db.visitas.add(rest)
      }
      msg(`✓ Diagnóstico N° ${alerta.id} reemplazado con versión importada`, 'ok')
    } else if (accion === 'ambos') {
      const { id, ...rest } = alerta.remoto
      delete rest.uuid
      rest.uuid = crypto.randomUUID()
      rest.f20_numero_encuesta = alerta.remoto.f20_numero_encuesta + '-imp'
      await db.visitas.add(rest)
      msg(`✓ Diagnóstico N° ${alerta.id} importado como copia (${rest.f20_numero_encuesta})`, 'ok')
    }
    setAlertas(prev => prev.filter(a => a.id !== alerta.id))
    db.visitas.count().then(setTotalLocal)
  }

  async function clearLocalData() {
    if (!confirm('¿Borrar TODOS los datos locales? Esta acción no se puede deshacer.')) return
    await db.visitas.clear()
    setTotalLocal(0)
    setAlertas([])
    msg('✓ Datos locales eliminados', 'ok')
  }

  const statusClass =
    statusType === 'ok'    ? 'bg-green-50 text-green-700 border-green-200' :
    statusType === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
    statusType === 'warn'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                             'bg-blue-50 text-blue-700 border-blue-200'

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Copias de seguridad y sincronización</h2>

      <div className="card bg-blue-50 border-blue-100 text-xs text-blue-700 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Cómo sincronizar entre dispositivos:</strong> exporta el backup desde cada dispositivo y luego impórtalo en los demás.
          La app detectará automáticamente qué diagnósticos son nuevos y cuáles están duplicados.
        </p>
      </div>

      {status && (
        <div className={`card text-sm font-medium ${statusClass}`}>{status}</div>
      )}

      {alertas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            {alertas.length} diagnóstico{alertas.length !== 1 ? 's' : ''} con N° encuesta duplicado
          </div>
          {alertas.map(a => (
            <div key={a.id} className="card border-amber-200 bg-amber-50 space-y-2">
              <p className="text-sm font-medium text-amber-800">{a.msg}</p>
              <p className="text-xs text-gray-500">
                Local: {a.local.f1_nombre} {a.local.f2_apellido} · {a.local.f19_fecha_encuesta}
              </p>
              <p className="text-xs text-gray-500">
                Importado: {a.remoto.f1_nombre} {a.remoto.f2_apellido} · {a.remoto.f19_fecha_encuesta}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => resolverDup(a, 'mantener')} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium">Mantener local</button>
                <button onClick={() => resolverDup(a, 'reemplazar')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">Reemplazar con importado</button>
                <button onClick={() => resolverDup(a, 'ambos')} className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium">Guardar ambos</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Exportar copia</h3>
        <p className="text-sm text-gray-500">{totalLocal} diagnóstico{totalLocal !== 1 ? 's' : ''} almacenado{totalLocal !== 1 ? 's' : ''} en este dispositivo.</p>
        <div className="flex items-center gap-2">
          <button onClick={doExportBackup} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar backup (.json)
          </button>
          <ShareButton onClick={doShareBackup} title="Compartir backup" size="sm" />
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Importar / Sincronizar</h3>
        <p className="text-sm text-gray-500">Importa un backup de otro dispositivo. Los nuevos diagnósticos se agregarán. Los duplicados por UUID se omiten. Los duplicados de N° encuesta generarán una alerta.</p>
        <label className="btn-secondary flex items-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4" />
          Importar backup (.json)
          <input type="file" accept=".json" onChange={importBackup} className="hidden" />
        </label>
      </div>

      <div className="card space-y-3 border-red-100">
        <h3 className="font-semibold text-red-600 text-sm uppercase tracking-wide">Zona de peligro</h3>
        <p className="text-sm text-gray-500">Elimina todos los datos almacenados localmente en este dispositivo. Asegúrate de tener una copia exportada antes.</p>
        <button onClick={clearLocalData} className="btn-danger flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Borrar datos locales
        </button>
      </div>
    </div>
  )
}
