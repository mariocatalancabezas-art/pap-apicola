import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Pencil, Trash2, Search, Phone, Mail } from 'lucide-react'
import { db } from '../lib/db'

export default function Apicultores() {
  const [apicultores, setApicultores] = useState([])
  const [search, setSearch] = useState('')

  async function load() {
    const all = await db.apicultores.orderBy('nombre').toArray()
    setApicultores(all)
  }

  useEffect(() => { load() }, [])

  async function deleteApicultor(id) {
    const count = await db.visitas.where('apicultor_id').equals(
      apicultores.find(a => a.id === id)?.uuid || ''
    ).count()
    if (count > 0 && !confirm(`Este apicultor tiene ${count} visita(s). ¿Eliminar igualmente?`)) return
    if (!confirm('¿Eliminar apicultor?')) return
    await db.apicultores.delete(id)
    load()
  }

  const filtered = apicultores.filter(a =>
    !search ||
    a.nombre.toLowerCase().includes(search.toLowerCase()) ||
    a.municipio?.toLowerCase().includes(search.toLowerCase()) ||
    a.nif?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Apicultores</h2>
        <Link to="/apicultores/nuevo" className="btn-primary flex items-center gap-1 py-1.5 px-3 text-sm">
          <PlusCircle className="w-4 h-4" /> Nuevo
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar apicultor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">👨‍🌾</p>
          <p>No hay apicultores registrados</p>
          <Link to="/apicultores/nuevo" className="btn-primary mt-3 inline-flex items-center gap-1 text-sm">
            <PlusCircle className="w-4 h-4" /> Añadir apicultor
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(a => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{a.nombre}</p>
                {a.nif && <p className="text-xs text-gray-500">NIF: {a.nif}</p>}
                {a.municipio && <p className="text-xs text-gray-500">📍 {a.municipio}</p>}
                <div className="flex gap-3 mt-1 flex-wrap">
                  {a.telefono && (
                    <a href={`tel:${a.telefono}`} className="text-xs text-honey-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />{a.telefono}
                    </a>
                  )}
                  {a.email && (
                    <a href={`mailto:${a.email}`} className="text-xs text-honey-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" />{a.email}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <Link to={`/apicultores/editar/${a.id}`} className="p-1.5 rounded-lg text-honey-600 hover:bg-honey-50">
                  <Pencil className="w-4 h-4" />
                </Link>
                <button onClick={() => deleteApicultor(a.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
