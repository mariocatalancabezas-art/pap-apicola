import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, ChevronLeft } from 'lucide-react'
import { db, SYNC_STATUS, generateUUID } from '../lib/db'
import { syncAll } from '../lib/sync'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function NuevoApicultor() {
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    nif: '',
    telefono: '',
    email: '',
    direccion: '',
    municipio: '',
    provincia: '',
    codigo_postal: '',
    num_colmenas: '',
    notas: '',
  })

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const now = new Date().toISOString()
    try {
      await db.apicultores.add({
        uuid: generateUUID(),
        ...form,
        num_colmenas: Number(form.num_colmenas) || 0,
        sync_status: SYNC_STATUS.PENDING,
        created_at: now,
        updated_at: now,
      })
      if (isOnline) syncAll()
      navigate('/apicultores')
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold">Nuevo apicultor</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Datos personales</h3>

          <div>
            <label className="label">Nombre completo *</label>
            <input type="text" name="nombre" value={form.nombre} onChange={handleChange} className="input-field" required placeholder="Juan García…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">NIF / DNI</label>
              <input type="text" name="nif" value={form.nif} onChange={handleChange} className="input-field" placeholder="12345678A" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} className="input-field" placeholder="600000000" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" placeholder="apicultor@email.com" />
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Ubicación</h3>
          <div>
            <label className="label">Dirección</label>
            <input type="text" name="direccion" value={form.direccion} onChange={handleChange} className="input-field" placeholder="Calle…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Municipio</label>
              <input type="text" name="municipio" value={form.municipio} onChange={handleChange} className="input-field" placeholder="Municipio" />
            </div>
            <div>
              <label className="label">Provincia</label>
              <input type="text" name="provincia" value={form.provincia} onChange={handleChange} className="input-field" placeholder="Provincia" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código postal</label>
              <input type="text" name="codigo_postal" value={form.codigo_postal} onChange={handleChange} className="input-field" placeholder="00000" />
            </div>
            <div>
              <label className="label">Nº colmenas</label>
              <input type="number" name="num_colmenas" value={form.num_colmenas} onChange={handleChange} min="0" className="input-field" placeholder="0" />
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Notas</h3>
          <textarea name="notas" value={form.notas} onChange={handleChange} rows={3} className="input-field resize-none" placeholder="Observaciones…" />
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          <Save className="w-5 h-5" />
          {saving ? 'Guardando…' : 'Guardar apicultor'}
        </button>
      </form>
    </div>
  )
}
