import React, { useEffect, useState } from 'react'
import { CalendarDays, Plus, MapPin, Pencil, Trash2, X } from 'lucide-react'
import {
  listActividadesProximas,
  crearActividad,
  editarActividad,
  eliminarActividad,
  formatActividadFecha,
} from '../lib/actividades'
import { useAuth } from '../lib/AuthContext'

const FORM_VACIO = { actividad: '', fecha: '', hora: '', lugar: '' }

// Convierte "HH:MM" (24h) a partes de 12h para los selectores.
function horaToPartes(hora) {
  if (!hora) return { h: '', m: '', ampm: 'AM' }
  const [hh, mm] = hora.slice(0, 5).split(':')
  let h = Number(hh)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return { h: String(h), m: mm, ampm }
}

// Convierte partes de 12h (h, m, ampm) a "HH:MM" (24h) para guardar.
function partesToHora({ h, m, ampm }) {
  if (!h) return ''
  let hh = Number(h) % 12
  if (ampm === 'PM') hh += 12
  return `${String(hh).padStart(2, '0')}:${(m || '00').padStart(2, '0')}`
}

const MINUTOS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

export default function CalendarioActividades() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const puedeEditar = isAdmin || !!user?.puede_editar_calendario
  const puedeEliminar = isAdmin || !!user?.puede_eliminar_calendario
  const [actividades, setActividades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setActividades(await listActividadesProximas())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function abrirNueva() {
    setEditId(null)
    setForm(FORM_VACIO)
    setShowModal(true)
  }

  function abrirEdicion(a) {
    setEditId(a.id)
    setForm({
      actividad: a.actividad || '',
      fecha: a.fecha || '',
      hora: a.hora ? a.hora.slice(0, 5) : '',
      lugar: a.lugar || '',
    })
    setShowModal(true)
  }

  async function guardar() {
    if (!form.actividad.trim() || !form.fecha) return
    setSaving(true)
    setError('')
    try {
      if (editId) {
        await editarActividad(editId, form)
      } else {
        await crearActividad(form)
      }
      setForm(FORM_VACIO)
      setEditId(null)
      setShowModal(false)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function borrar(id) {
    if (!window.confirm('¿Eliminar esta actividad?')) return
    try {
      await eliminarActividad(id)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  function cambiarHora(cambio) {
    const partes = { ...horaToPartes(form.hora), ...cambio }
    setForm({ ...form, hora: partesToHora(partes) })
  }

  const horaPartes = horaToPartes(form.hora)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-honey-500" />
          Calendario Actividades
        </h2>
        {puedeEditar && (
          <button
            onClick={abrirNueva}
            className="btn-primary flex items-center gap-2 py-2 px-3 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva actividad
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando actividades…</p>
      ) : actividades.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No hay actividades programadas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actividades.map(a => (
            <div key={a.id} className="card flex items-start gap-3 p-3">
              <div className="p-2 rounded-lg bg-honey-50 text-honey-600 flex-shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800">{a.actividad}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {formatActividadFecha(a.fecha, a.hora)}
                </p>
                {a.lugar && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {a.lugar}
                  </p>
                )}
              </div>
              {(puedeEditar || puedeEliminar) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {puedeEditar && (
                    <button
                      onClick={() => abrirEdicion(a)}
                      className="p-1.5 rounded hover:bg-honey-50 text-gray-400 hover:text-honey-600"
                      title="Editar actividad"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {puedeEliminar && (
                    <button
                      onClick={() => borrar(a.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                      title="Eliminar actividad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-honey-500" />
                {editId ? 'Editar actividad' : 'Nueva actividad'}
              </h3>
              <button
                onClick={() => { setShowModal(false); setEditId(null); }}
                className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Actividad</label>
                <input
                  type="text"
                  value={form.actividad}
                  onChange={e => setForm({ ...form, actividad: e.target.value })}
                  autoFocus
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-400"
                  placeholder="Ej: Reunión apicultores"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm({ ...form, fecha: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Hora</label>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    <select
                      value={horaPartes.h}
                      onChange={e => cambiarHora({ h: e.target.value })}
                      className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-400"
                    >
                      <option value="">--</option>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <select
                      value={horaPartes.m}
                      onChange={e => cambiarHora({ m: e.target.value })}
                      className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-400"
                    >
                      {MINUTOS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={horaPartes.ampm}
                      onChange={e => cambiarHora({ ampm: e.target.value })}
                      className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-400"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Lugar</label>
                <input
                  type="text"
                  value={form.lugar}
                  onChange={e => setForm({ ...form, lugar: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-400"
                  placeholder="Ej: Sede comunal"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowModal(false); setEditId(null); }}
                  className="flex-1 text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={!form.actividad.trim() || !form.fecha || saving}
                  className="flex-1 text-sm px-3 py-2 rounded-lg bg-honey-500 text-white hover:bg-honey-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
