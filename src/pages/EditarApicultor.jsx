import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ChevronLeft } from 'lucide-react'
import { db, SYNC_STATUS } from '../lib/db'
import { syncAll } from '../lib/sync'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function EditarApicultor() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isOnline = useOnlineStatus()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    nombre: '', nif: '', telefono: '', email: '',
    direccion: '', municipio: '', provincia: '',
    codigo_postal: '', num_colmenas: '', notas: '',
  })

  useEffect(() => {
    db.apicultores.get(Number(id)).then(a => {
      if (a) setForm({ ...a })
      setLoading(false)
    })
  }, [id])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const now = new Date().toISOString()
    try {
      await db.apicultores.update(Number(id), {
        ...form,
        num_colmenas: Number(form.num_colmenas) || 0,
        sync_status: SYNC_STATUS.PENDING,
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

  if (loading) return <div className="p-4 text-gray-400 text-center">Cargando…</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold">Editar apicultor</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Datos personales</h3>
          <div>
            <label className="label">Nombre completo *</label>
            <input type="text" name="nombre" value={form.nombre} onChange={handleChange} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">NIF / DNI</label>
              <input type="text" name="nif" value={form.nif} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" />
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Ubicación</h3>
          <div>
            <label className="label">Dirección</label>
            <input type="text" name="direccion" value={form.direccion} onChange={handleChange} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Municipio</label>
              <input type="text" name="municipio" value={form.municipio} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="label">Provincia</label>
              <input type="text" name="provincia" value={form.provincia} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código postal</label>
              <input type="text" name="codigo_postal" value={form.codigo_postal} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="label">Nº colmenas</label>
              <input type="number" name="num_colmenas" value={form.num_colmenas} onChange={handleChange} min="0" className="input-field" />
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Notas</h3>
          <textarea name="notas" value={form.notas} onChange={handleChange} rows={3} className="input-field resize-none" />
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          <Save className="w-5 h-5" />
          {saving ? 'Guardando…' : 'Actualizar apicultor'}
        </button>
      </form>
    </div>
  )
}
