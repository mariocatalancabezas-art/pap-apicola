import React, { useEffect, useState } from 'react'
import { HardHat, Plus, Trash2, Save, X, Phone, Mail, User, Building2, Briefcase, Loader2 } from 'lucide-react'
import { db, generateUUID, SYNC_STATUS } from '../lib/db'
import { useAuth } from '../lib/AuthContext'
import { syncAll } from '../lib/sync'

const MIEMBROS_INICIALES = [
  { nombres: 'MARIO', apellidos: '' },
  { nombres: 'FERNANDA', apellidos: '' },
  { nombres: 'YESSICA', apellidos: '' },
  { nombres: 'JACINTO', apellidos: '' },
  { nombres: 'EDGARDO', apellidos: '' },
]

const SEED_FLAG = 'equipo_tecnico_seed_done'

function nombreCompleto(p) {
  return `${p.nombres || ''} ${p.apellidos || ''}`.trim().toUpperCase()
}

function formatearRut(rut) {
  if (!rut) return ''
  const limpio = String(rut).replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length < 2) return rut
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  const formateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formateado}-${dv}`
}

export default function EquipoTecnico() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'
  const [miembros, setMiembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [nuevo, setNuevo] = useState(null)

  async function cargar() {
    setLoading(true)
    try {
      const all = await db.equipo_tecnico.filter(m => !m.deleted_at).sortBy('nombre_completo')

      // Deduplicar por nombre_completo, mantener el más reciente y eliminar duplicados locales
      const unicosMap = new Map()
      const duplicados = []
      for (const m of all) {
        const key = (m.nombre_completo || '').trim().toUpperCase()
        if (!key) continue
        const existente = unicosMap.get(key)
        if (!existente || new Date(m.updated_at || 0) > new Date(existente.updated_at || 0)) {
          if (existente) duplicados.push(existente.id)
          unicosMap.set(key, m)
        } else {
          duplicados.push(m.id)
        }
      }
      if (duplicados.length > 0) {
        const now = new Date().toISOString()
        for (const id of duplicados) {
          await db.equipo_tecnico.update(id, {
            deleted_at: now,
            updated_at: now,
            sync_status: SYNC_STATUS.PENDING,
          })
        }
        syncAll(true).catch(err => console.error('Sync cleanup error:', err))
      }

      const unicos = Array.from(unicosMap.values()).sort((a, b) =>
        (a.nombre_completo || '').localeCompare(b.nombre_completo || '')
      )

      // Verificar si falta algún miembro inicial (solo la primera vez por dispositivo)
      const seedDone = localStorage.getItem(SEED_FLAG) === '1'
      const nombresActuales = new Set(unicos.map(m => (m.nombre_completo || '').trim().toUpperCase()))
      const faltantes = !seedDone
        ? MIEMBROS_INICIALES.filter(m => !nombresActuales.has(m.nombres.trim().toUpperCase()))
        : []

      if (faltantes.length > 0) {
        const iniciales = faltantes.map(m => ({
          uuid: generateUUID(),
          nombres: m.nombres.toUpperCase(),
          apellidos: m.apellidos.toUpperCase(),
          nombre_completo: m.nombres.toUpperCase(),
          rut: '',
          telefono: '',
          email: '',
          cargo: '',
          institucion: '',
          sync_status: SYNC_STATUS.PENDING,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        }))
        await db.equipo_tecnico.bulkAdd(iniciales)
        unicos.push(...iniciales)
        unicos.sort((a, b) => (a.nombre_completo || '').localeCompare(b.nombre_completo || ''))
        localStorage.setItem(SEED_FLAG, '1')
        syncAll(true).catch(err => console.error('Sync error:', err))
      }

      setMiembros(unicos)
    } catch (err) {
      setMsg('✗ Error al cargar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  function actualizarMiembro(id, campo, valor) {
    setMiembros(prev => prev.map(m => {
      if (m.id !== id) return m
      const actualizado = { ...m, [campo]: valor }
      if (campo === 'nombres' || campo === 'apellidos') {
        actualizado.nombre_completo = nombreCompleto(actualizado)
      }
      return actualizado
    }))
  }

  function iniciarNuevo() {
    setNuevo({
      uuid: generateUUID(),
      nombres: '',
      apellidos: '',
      nombre_completo: '',
      rut: '',
      telefono: '',
      email: '',
      cargo: '',
      institucion: '',
    })
  }

  function cancelarNuevo() {
    setNuevo(null)
  }

  async function guardarNuevo() {
    if (!nuevo.nombres.trim()) {
      setMsg('✗ El nombre es obligatorio')
      return
    }
    const nombreNuevo = nombreCompleto(nuevo)
    const existe = await db.equipo_tecnico
      .filter(m => !m.deleted_at && (m.nombre_completo || '').trim().toUpperCase() === nombreNuevo)
      .first()
    if (existe) {
      setMsg('✗ Ya existe un miembro con ese nombre')
      return
    }
    const now = new Date().toISOString()
    const data = {
      ...nuevo,
      nombres: nuevo.nombres.toUpperCase(),
      apellidos: nuevo.apellidos.toUpperCase(),
      nombre_completo: nombreNuevo,
      sync_status: SYNC_STATUS.PENDING,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
    try {
      await db.equipo_tecnico.add(data)
      setNuevo(null)
      setMsg('✓ Miembro agregado')
      cargar()
      syncAll(true).catch(err => console.error('Sync error:', err))
    } catch (err) {
      setMsg('✗ Error: ' + err.message)
    }
  }

  async function guardarCambios(m) {
    const nombreNuevo = nombreCompleto(m)
    const existe = await db.equipo_tecnico
      .filter(mm => !mm.deleted_at && mm.id !== m.id && (mm.nombre_completo || '').trim().toUpperCase() === nombreNuevo)
      .first()
    if (existe) {
      setMsg('✗ Ya existe otro miembro con ese nombre')
      return
    }
    const now = new Date().toISOString()
    try {
      await db.equipo_tecnico.update(m.id, {
        ...m,
        nombre_completo: nombreNuevo,
        updated_at: now,
        sync_status: SYNC_STATUS.PENDING,
      })
      setMsg('✓ Cambios guardados')
      syncAll(true).catch(err => console.error('Sync error:', err))
    } catch (err) {
      setMsg('✗ Error: ' + err.message)
    }
  }

  async function eliminarMiembro(id) {
    if (!confirm('¿Eliminar este miembro del equipo?')) return
    try {
      const m = await db.equipo_tecnico.get(id)
      if (m) {
        await db.equipo_tecnico.update(id, {
          ...m,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: SYNC_STATUS.PENDING,
        })
      }
      setMsg('✓ Miembro eliminado')
      cargar()
      syncAll(true).catch(err => console.error('Sync error:', err))
    } catch (err) {
      setMsg('✗ Error: ' + err.message)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <HardHat className="w-5 h-5 text-honey-600" />
          <h2 className="text-lg font-bold">Equipo Técnico</h2>
        </div>
        <button
          onClick={iniciarNuevo}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-honey-100 text-honey-700 hover:bg-honey-200 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {msg && (
        <div className={`card text-sm font-medium ${msg.startsWith('✓') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {nuevo && (
            <div className="card p-3 bg-honey-50 border-honey-200 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="w-4 h-4 text-honey-600" />
                <span className="font-semibold text-sm">Nuevo miembro</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <input
                  value={nuevo.nombres}
                  onChange={e => setNuevo({ ...nuevo, nombres: e.target.value })}
                  placeholder="Nombres"
                  className="input-field text-sm"
                />
                <input
                  value={nuevo.apellidos}
                  onChange={e => setNuevo({ ...nuevo, apellidos: e.target.value })}
                  placeholder="Apellidos"
                  className="input-field text-sm"
                />
                <input
                  value={nuevo.rut}
                  onChange={e => setNuevo({ ...nuevo, rut: e.target.value })}
                  placeholder="RUT"
                  className="input-field text-sm"
                />
                <input
                  value={nuevo.telefono}
                  onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })}
                  placeholder="Teléfono"
                  className="input-field text-sm"
                />
                <input
                  value={nuevo.email}
                  onChange={e => setNuevo({ ...nuevo, email: e.target.value })}
                  placeholder="Correo"
                  className="input-field text-sm"
                />
                <input
                  value={nuevo.cargo}
                  onChange={e => setNuevo({ ...nuevo, cargo: e.target.value })}
                  placeholder="Cargo"
                  className="input-field text-sm"
                />
                <input
                  value={nuevo.institucion}
                  onChange={e => setNuevo({ ...nuevo, institucion: e.target.value })}
                  placeholder="Institución o empresa"
                  className="input-field text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={guardarNuevo}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-honey-500 text-white hover:bg-honey-600 text-sm font-medium"
                >
                  <Save className="w-4 h-4" /> Guardar
                </button>
                <button
                  onClick={cancelarNuevo}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
              </div>
            </div>
          )}

          {miembros.map(m => (
            <div key={m.id} className="card p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <User className="w-4 h-4 text-honey-600" />
                <span className="font-semibold text-sm">{m.nombre_completo || 'Sin nombre'}</span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => guardarCambios(m)}
                    className="p-1.5 rounded-lg text-honey-600 hover:bg-honey-50"
                    title="Guardar cambios"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => eliminarMiembro(m.id)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={m.nombres || ''}
                    onChange={e => actualizarMiembro(m.id, 'nombres', e.target.value)}
                    placeholder="Nombres"
                    className="input-field text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={m.apellidos || ''}
                    onChange={e => actualizarMiembro(m.id, 'apellidos', e.target.value)}
                    placeholder="Apellidos"
                    className="input-field text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 font-mono">RUT</span>
                  <input
                    value={m.rut || ''}
                    onChange={e => actualizarMiembro(m.id, 'rut', e.target.value)}
                    placeholder="RUT"
                    className="input-field text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={m.telefono || ''}
                    onChange={e => actualizarMiembro(m.id, 'telefono', e.target.value)}
                    placeholder="Teléfono"
                    className="input-field text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={m.email || ''}
                    onChange={e => actualizarMiembro(m.id, 'email', e.target.value)}
                    placeholder="Correo"
                    className="input-field text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={m.cargo || ''}
                    onChange={e => actualizarMiembro(m.id, 'cargo', e.target.value)}
                    placeholder="Cargo"
                    className="input-field text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={m.institucion || ''}
                    onChange={e => actualizarMiembro(m.id, 'institucion', e.target.value)}
                    placeholder="Institución o empresa"
                    className="input-field text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          {miembros.length === 0 && !nuevo && (
            <div className="card text-center py-8 text-sm text-gray-500">
              No hay miembros en el equipo.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
