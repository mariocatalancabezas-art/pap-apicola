import React, { useState, useEffect } from 'react'
import { PlusCircle, Pencil, Trash2, Search, Phone, Save, X, User, ChevronUp, ChevronDown, Group, Copy, Printer, Download } from 'lucide-react'
import { db, generateUUID, SYNC_STATUS } from '../lib/db'
import { useAuth } from '../lib/AuthContext'
import { syncAll, onSyncChange } from '../lib/sync'
import { dedupeApicultoresLocal } from '../lib/initApicultores'
import { exportApicultores, shareApicultores } from '../lib/exports'
import ShareButton from '../components/ShareButton'

export default function Apicultores() {
  const { user } = useAuth()
  const [apicultores, setApicultores] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [sortField, setSortField] = useState('nombre_completo')
  const [sortDirection, setSortDirection] = useState('asc')
  const [groupBy, setGroupBy] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newApicultor, setNewApicultor] = useState({
    nombres: '',
    apellidos: '',
    rut: '',
    telefono: '',
    email: '',
    comuna: '',
    direccion: '',
    programa_indap: ''
  })

  // Verificar permisos - admin siempre puede todo, usuarios según permisos asignados
  const esAdmin = user?.rol === 'admin'
  const puedeEditar = esAdmin || user?.puede_editar_apicultores === true
  const puedeVerAcciones = esAdmin || user?.puede_ver_acciones === true

  async function load() {
    console.log('[Apicultores] Iniciando carga...')
    setLoading(true)
    try {
      // Verificar que db.apicultores existe
      if (!db || !db.apicultores) {
        console.error('[Apicultores] db.apicultores no está disponible')
        setApicultores([])
        return
      }

      // Eliminar duplicados locales antes de mostrar la lista
      await dedupeApicultoresLocal()

      // Filtrar eliminados (soft delete) y ordenar
      const all = await db.apicultores
        .filter(a => !a.deleted_at)
        .toArray()

      // Rellenar emails desde visitas por RUT
      const visitas = await db.visitas.filter(v => !v.deleted_at).toArray()
      const emailPorRut = {}
      for (const v of visitas) {
        const rut = String(v.f3_rut || '').replace(/[^0-9kK]/g, '').toUpperCase()
        const email = v.f5_email?.trim()
        if (rut && email && !emailPorRut[rut]) {
          emailPorRut[rut] = email
        }
      }
      const actualizados = []
      for (const a of all) {
        const rut = String(a.rut || '').replace(/[^0-9kK]/g, '').toUpperCase()
        if (rut && emailPorRut[rut] && !a.email) {
          a.email = emailPorRut[rut]
          actualizados.push(a)
        }
      }
      if (actualizados.length > 0) {
        await db.transaction('rw', db.apicultores, async () => {
          for (const a of actualizados) {
            await db.apicultores.update(a.id, { email: a.email, updated_at: new Date().toISOString(), sync_status: SYNC_STATUS.PENDING })
          }
        })
        syncAll(true).catch(err => console.error('[Apicultores] Error al sincronizar emails:', err))
      }

      console.log('[Apicultores] Cargados:', all.length)
      setApicultores(all)
    } catch (err) {
      console.error('[Apicultores] Error:', err)
      alert('Error al cargar apicultores: ' + err.message)
      setApicultores([])
    } finally {
      setLoading(false)
    }
  }

  // Función para ordenar
  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setGroupBy(null) // Desactivar agrupamiento al ordenar
  }

  // Función para agrupar
  function handleGroup(field) {
    if (groupBy === field) {
      setGroupBy(null) // Desactivar si ya está agrupado por ese campo
    } else {
      setGroupBy(field)
    }
  }

  useEffect(() => {
    load()
    // Forzar sincronización al abrir la página para traer apicultores desde Supabase
    syncAll(true).catch(err => console.error('[Apicultores] Error al sincronizar:', err))
    // Recargar automáticamente cuando termine una sincronización
    const unsub = onSyncChange(status => {
      if (status === 'synced') load()
    })
    return unsub
  }, [])

  async function deleteApicultor(id) {
    if (!confirm('¿Eliminar este apicultor?')) return
    const apicultor = await db.apicultores.get(id)
    if (apicultor) {
      // Soft delete
      await db.apicultores.update(id, {
        ...apicultor,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: SYNC_STATUS.PENDING
      })
    }
    load()
    // Sincronizar automáticamente con full sync
    syncAll(true)
  }

  function startEdit(apicultor) {
    setEditingId(apicultor.id)
    setEditForm({ ...apicultor })
  }

  function openAddModal() {
    setNewApicultor({
      nombres: '',
      apellidos: '',
      rut: '',
      telefono: '',
      comuna: '',
      direccion: '',
      programa_indap: ''
    })
    setShowAddModal(true)
  }

  function closeAddModal() {
    setShowAddModal(false)
    setNewApicultor({
      nombres: '',
      apellidos: '',
      rut: '',
      telefono: '',
      email: '',
      comuna: '',
      direccion: '',
      programa_indap: ''
    })
  }

  async function saveNewApicultor() {
    if (!newApicultor.nombres.trim() || !newApicultor.apellidos.trim()) {
      alert('Nombres y apellidos son obligatorios')
      return
    }

    const now = new Date().toISOString()

    try {
      const apicultorData = {
        uuid: generateUUID(),
        nombres: newApicultor.nombres.toUpperCase(),
        apellidos: newApicultor.apellidos.toUpperCase(),
        nombre_completo: `${newApicultor.nombres} ${newApicultor.apellidos}`.toUpperCase().trim(),
        rut: newApicultor.rut || '',
        telefono: newApicultor.telefono || '',
        email: (newApicultor.email || '').toLowerCase(),
        comuna: (newApicultor.comuna || '').toUpperCase(),
        direccion: (newApicultor.direccion || '').toUpperCase(),
        programa_indap: (newApicultor.programa_indap || '').toUpperCase(),
        sync_status: SYNC_STATUS.PENDING,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }

      await db.apicultores.add(apicultorData)
      alert('✓ Apicultor creado correctamente')
      closeAddModal()
      load()
      // Sincronizar automáticamente con full sync
      syncAll(true)
    } catch (err) {
      alert('Error al crear apicultor: ' + err.message)
    }
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  async function saveEdit() {
    const now = new Date().toISOString()
    const nombreCompleto = `${editForm.nombres} ${editForm.apellidos}`.toUpperCase().trim()
    await db.apicultores.update(editingId, {
      ...editForm,
      nombre_completo: nombreCompleto,
      nombres: editForm.nombres.toUpperCase(),
      apellidos: editForm.apellidos.toUpperCase(),
      comuna: editForm.comuna ? editForm.comuna.toUpperCase() : '',
      direccion: editForm.direccion ? editForm.direccion.toUpperCase() : '',
      programa_indap: editForm.programa_indap ? editForm.programa_indap.toUpperCase() : '',
      updated_at: now,
      sync_status: SYNC_STATUS.PENDING
    })
    setEditingId(null)
    setEditForm({})
    load()
    // Sincronizar automáticamente con full sync
    syncAll(true)
  }

  function handleEditChange(field, value) {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const filtered = apicultores.filter(a =>
    !search ||
    a.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
    a.comuna?.toLowerCase().includes(search.toLowerCase()) ||
    a.rut?.toLowerCase().includes(search.toLowerCase()) ||
    a.telefono?.includes(search) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  )

  // Aplicar ordenamiento a los datos filtrados
  const sortedAndFiltered = [...filtered].sort((a, b) => {
    const aVal = (a[sortField] || '').toString().toLowerCase()
    const bVal = (b[sortField] || '').toString().toLowerCase()
    if (sortDirection === 'asc') {
      return aVal.localeCompare(bVal)
    } else {
      return bVal.localeCompare(aVal)
    }
  })

  // Agrupar datos si está activado
  const groupedData = groupBy
    ? sortedAndFiltered.reduce((groups, item) => {
        const key = item[groupBy] || 'Sin valor'
        if (!groups[key]) groups[key] = []
        groups[key].push(item)
        return groups
      }, {})
    : { 'Todos': sortedAndFiltered }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <User className="w-5 h-5 text-amber-500" />
          Apicultores del Programa
        </h2>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => exportApicultores(filtered)}
            className="btn-secondary flex items-center gap-1 py-1.5 px-3 text-sm"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <ShareButton onClick={() => shareApicultores(filtered)} title="Compartir lista de apicultores" size="sm" />
          <button 
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-1 py-1.5 px-3 text-sm"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <ShareButton onClick={() => shareApicultores(filtered)} title="Compartir lista de apicultores" size="sm" />
          {esAdmin && (
            <button 
              onClick={openAddModal}
              className="btn-primary flex items-center gap-1 py-1.5 px-3 text-sm"
            >
              <PlusCircle className="w-4 h-4" /> Nuevo
            </button>
          )}
        </div>
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

      {filtered.length === 0 && !loading && (
        <div className="card text-center py-8 text-gray-400">
          <img
            src="/Logo/LOGO%20ASB.png.png"
            alt="PAP Apícola"
            className="w-16 h-16 mx-auto mb-3 object-contain opacity-50"
          />
          <p className="mb-2">No hay apicultores registrados</p>
          <p className="text-xs text-gray-500">Si hay apicultores en Supabase, se sincronizarán automáticamente en unos segundos.</p>
        </div>
      )}

      {loading && (
        <div className="card text-center py-8 text-gray-400">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p>Cargando apicultores…</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="text-left px-2 py-2 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('nombres')}
                  >
                    <div className="flex items-center gap-1">
                      Nombres
                      {sortField === 'nombres' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left px-2 py-2 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('apellidos')}
                  >
                    <div className="flex items-center gap-1">
                      Apellidos
                      {sortField === 'apellidos' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th className="text-left px-2 py-2 font-semibold text-gray-700 whitespace-nowrap min-w-[110px]">RUT</th>
                  <th className="text-left px-2 py-2 font-semibold text-gray-700">Teléfono</th>
                  <th className="text-left px-2 py-2 font-semibold text-gray-700">Correo</th>
                  <th 
                    className="text-left px-3 py-2 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleGroup('comuna')}
                  >
                    <div className="flex items-center gap-1">
                      Comuna
                      {groupBy === 'comuna' && <Group className="w-4 h-4 text-amber-500" />}
                    </div>
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Dirección</th>
                  <th 
                    className="text-left px-3 py-2 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleGroup('programa_indap')}
                  >
                    <div className="flex items-center gap-1">
                      Programa INDAP
                      {groupBy === 'programa_indap' && <Group className="w-4 h-4 text-amber-500" />}
                    </div>
                  </th>
                  {puedeVerAcciones && <th className="text-center px-3 py-2 font-semibold text-gray-700">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(groupedData).map(([groupName, items]) => (
                  <React.Fragment key={groupName}>
                    {groupBy && (
                      <tr className="bg-amber-50">
                        <td colSpan={puedeVerAcciones ? 9 : 8} className="px-3 py-2 font-bold text-amber-800">
                          {groupBy === 'comuna' ? '📍 ' : '📋 '}
                          {groupName} ({items.length} apicultores)
                        </td>
                      </tr>
                    )}
                    {items.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    {editingId === a.id && puedeVerAcciones ? (
                      // Modo edición - solo admin
                      <>
                        <td className="px-3 py-2">
                          <input
                            value={editForm.nombres || ''}
                            onChange={e => handleEditChange('nombres', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editForm.apellidos || ''}
                            onChange={e => handleEditChange('apellidos', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editForm.rut || ''}
                            onChange={e => handleEditChange('rut', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editForm.telefono || ''}
                            onChange={e => handleEditChange('telefono', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editForm.email || ''}
                            onChange={e => handleEditChange('email', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editForm.comuna || ''}
                            onChange={e => handleEditChange('comuna', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editForm.direccion || ''}
                            onChange={e => handleEditChange('direccion', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editForm.programa_indap || ''}
                            onChange={e => handleEditChange('programa_indap', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={saveEdit} className="p-1 rounded text-green-600 hover:bg-green-50">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="p-1 rounded text-red-400 hover:bg-red-50">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // Modo lectura
                      <>
                        <td className="px-2 py-2 font-medium text-gray-800">{a.nombres}</td>
                        <td className="px-2 py-2 font-medium text-gray-800">{a.apellidos}</td>
                        <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{a.rut}</td>
                        <td className="px-2 py-2">
                          {a.telefono && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <button
                                onClick={() => navigator.clipboard.writeText(a.telefono).then(() => alert('Teléfono copiado: ' + a.telefono))}
                                className="p-1 rounded text-honey-500 hover:bg-honey-50"
                                title="Copiar teléfono"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <span>{a.telefono}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-gray-600 text-sm">{a.email}</td>
                        <td className="px-3 py-2 text-gray-600">{a.comuna}</td>
                        <td className="px-3 py-2 text-gray-600">{a.direccion}</td>
                        <td className="px-3 py-2">
                          <span className="inline-block bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs">
                            {a.programa_indap}
                          </span>
                        </td>
                        {puedeVerAcciones && (
                          <td className="px-3 py-2 text-center">
                            <div className="flex justify-center gap-1">
                              <button 
                                onClick={() => startEdit(a)}
                                className="p-1 rounded text-honey-600 hover:bg-honey-50"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteApicultor(a.id)}
                                className="p-1 rounded text-red-400 hover:bg-red-50"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-2">
        <span>Total: {filtered.length} apicultores</span>
        {search && <span>(filtrados de {apicultores.length})</span>}
        {sortField && !groupBy && (
          <span className="text-amber-600">
            Ordenado por: {sortField === 'nombres' ? 'Nombres' : sortField === 'apellidos' ? 'Apellidos' : sortField} 
            ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
          </span>
        )}
        {groupBy && (
          <span className="text-amber-600">
            Agrupado por: {groupBy === 'comuna' ? 'Comuna' : 'Programa INDAP'}
          </span>
        )}
        {!puedeEditar && <span>· Solo lectura</span>}
      </div>

      {/* Modal para agregar nuevo apicultor */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-500" />
                Nuevo Apicultor
              </h3>
              <button onClick={closeAddModal} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombres *</label>
                  <input
                    type="text"
                    value={newApicultor.nombres}
                    onChange={e => setNewApicultor({...newApicultor, nombres: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Ej: Juan Carlos"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Apellidos *</label>
                  <input
                    type="text"
                    value={newApicultor.apellidos}
                    onChange={e => setNewApicultor({...newApicultor, apellidos: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Ej: Pérez González"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">RUT</label>
                  <input
                    type="text"
                    value={newApicultor.rut}
                    onChange={e => setNewApicultor({...newApicultor, rut: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="12.345.678-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={newApicultor.telefono}
                    onChange={e => setNewApicultor({...newApicultor, telefono: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="9 1234 5678"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Correo</label>
                <input
                  type="email"
                  value={newApicultor.email}
                  onChange={e => setNewApicultor({...newApicultor, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Comuna</label>
                <input
                  type="text"
                  value={newApicultor.comuna}
                  onChange={e => setNewApicultor({...newApicultor, comuna: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Ej: Santa Bárbara"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Dirección</label>
                <input
                  type="text"
                  value={newApicultor.direccion}
                  onChange={e => setNewApicultor({...newApicultor, direccion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Ej: Calle Principal 123"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Programa INDAP</label>
                <input
                  type="text"
                  value={newApicultor.programa_indap}
                  onChange={e => setNewApicultor({...newApicultor, programa_indap: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Ej: ASB, ABB, PAP"
                />
              </div>
            </div>
            
            <div className="flex gap-2 p-4 border-t border-gray-200">
              <button
                onClick={closeAddModal}
                className="flex-1 py-2 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveNewApicultor}
                className="flex-1 py-2 px-4 rounded-lg bg-honey-500 text-white font-medium text-sm hover:bg-honey-600 flex items-center justify-center gap-1"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
