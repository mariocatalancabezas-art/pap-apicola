import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BriefcaseBusiness, Check, ChevronDown, FileText, Plus, Printer, Save, Trash2, Users, X } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { buscarApicultoresPorNombre } from '../lib/importApicultores'
import {
  MATERIAL_APICOLA, MATERIAL_VIVO, RUBROS, deleteProveedor, formatPesos,
  listCreditos, listProveedores, saveCredito, saveProducto, saveProveedor, updateCreditoEstado,
} from '../lib/creditoApicola'

const EMPTY_PROVIDER = { nombre: '', rut: '', giro: '', direccion: '', rubros: [], material_vivo: [], material_apicola: [], material_apicola_otro: '', servicios_detalle: '', rubro_otro: '' }
const EMPTY_CREDIT = { beneficiario_nombre: '', beneficiario_rut: '', beneficiario_telefono: '', beneficiario_direccion: '', beneficiario_comuna: '', es_apicultor_programa: true, fecha_entrega_productos: '', fecha_limite_pago: '', representante_nombre: '', representante_rut: '', items: [] }

function ToggleList({ values, options, onChange }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">{options.map(option => (
    <label key={option} className="flex items-center gap-2 text-xs text-gray-700">
      <input type="checkbox" checked={values.includes(option)} onChange={() => onChange(values.includes(option) ? values.filter(x => x !== option) : [...values, option])} />
      {option}
    </label>
  ))}</div>
}

function ProviderForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || EMPTY_PROVIDER)
  const [saving, setSaving] = useState(false)
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))
  async function submit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return alert('Ingresa el nombre o razón social')
    setSaving(true)
    try { await saveProveedor(form, form.id); onSaved() } catch (e) { alert(e.message) } finally { setSaving(false) }
  }
  return <div className="card border-2 border-honey-200">
    <div className="flex items-center justify-between mb-3"><h3 className="font-bold">Nuevo proveedor</h3><button onClick={onClose}><X className="w-4 h-4" /></button></div>
    <form onSubmit={submit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        {['nombre', 'rut', 'giro', 'direccion'].map(key => <div key={key}><label className="label text-xs">{key === 'nombre' ? 'Nombre o razón social' : key[0].toUpperCase() + key.slice(1)}</label><input className="input-field w-full" value={form[key]} onChange={e => set(key, e.target.value)} required={key === 'nombre'} /></div>)}
      </div>
      <div><label className="label text-xs">Rubros que ofrece</label><ToggleList values={form.rubros} options={RUBROS} onChange={v => set('rubros', v)} /></div>
      {form.rubros.includes('Material vivo') && <div className="pl-3 border-l-2 border-honey-200"><p className="text-xs font-semibold">Material vivo</p><ToggleList values={form.material_vivo} options={MATERIAL_VIVO} onChange={v => set('material_vivo', v)} /></div>}
      {form.rubros.includes('Servicios') && <div><label className="label text-xs">Detalle del servicio (máximo 1.000 caracteres)</label><textarea className="input-field w-full" maxLength={1000} rows={3} value={form.servicios_detalle} onChange={e => set('servicios_detalle', e.target.value)} /></div>}
      {form.rubros.includes('Material apícola') && <div className="pl-3 border-l-2 border-honey-200"><p className="text-xs font-semibold">Material apícola</p><ToggleList values={form.material_apicola} options={MATERIAL_APICOLA} onChange={v => set('material_apicola', v)} />{form.material_apicola.includes('Otro') && <input className="input-field w-full mt-2" placeholder="Indique cuál" value={form.material_apicola_otro} onChange={e => set('material_apicola_otro', e.target.value)} />}</div>}
      {form.rubros.includes('Otro') && <input className="input-field w-full" placeholder="Indique cuál" value={form.rubro_otro} onChange={e => set('rubro_otro', e.target.value)} />}
      <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary flex items-center gap-2" disabled={saving}><Save className="w-4 h-4" />{saving ? 'Guardando…' : 'Guardar proveedor'}</button></div>
    </form>
  </div>
}

function ProviderList({ providers, reload }) {
  const [form, setForm] = useState(null)
  const [open, setOpen] = useState(null)
  async function remove(p) { if (confirm(`¿Eliminar ${p.nombre}?`)) { try { await deleteProveedor(p.id); reload() } catch (e) { alert(e.message) } } }
  return <div className="space-y-3">
    {!form && <button className="btn-primary flex items-center gap-2" onClick={() => setForm({ ...EMPTY_PROVIDER })}><Plus className="w-4 h-4" /> Nuevo proveedor</button>}
    {form && <ProviderForm initial={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload() }} />}
    {providers.length === 0 ? <div className="card text-sm text-gray-500">No hay proveedores registrados.</div> : providers.map(p => <div key={p.id} className="card">
      <div className="flex items-start justify-between gap-2"><button className="text-left flex-1" onClick={() => setOpen(open === p.id ? null : p.id)}><p className="font-semibold">{p.nombre}</p><p className="text-xs text-gray-500">{p.rut || 'Sin RUT'} · {p.giro || 'Sin giro'}</p></button><div className="flex gap-1"><button className="p-1.5 text-gray-500" onClick={() => setForm(p)}><FileText className="w-4 h-4" /></button><button className="p-1.5 text-red-500" onClick={() => remove(p)}><Trash2 className="w-4 h-4" /></button></div></div>
      {open === p.id && <div className="mt-3 pt-3 border-t text-xs space-y-2"><p><b>Dirección:</b> {p.direccion || '—'}</p><p><b>Rubros:</b> {(p.rubros || []).join(', ') || '—'}</p><div className="grid sm:grid-cols-2 gap-2">{(p.productos || []).map(product => <label key={product.id} className="flex items-center gap-2 bg-gray-50 rounded p-2"><span className="flex-1">{product.nombre}{product.detalle ? ` — ${product.detalle}` : ''}</span><span>$</span><input className="input-field w-28 text-right py-1" value={product.valor_neto || ''} onChange={e => { const v = e.target.value.replace(/\D/g, ''); saveProducto(product.id, v).catch(err => alert(err.message)); product.valor_neto = v }} placeholder="Valor neto" /></label>)}</div></div>}
    </div>)}
  </div>
}

function CreditForm({ providers, initial, onClose, onSaved, user }) {
  const [form, setForm] = useState(initial || { ...EMPTY_CREDIT, items: [{ id: Date.now() }] })
  const [results, setResults] = useState([])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const itemsTotal = form.items.reduce((s, x) => s + (Number(x.cantidad) || 0) * (Number(x.valor_neto) || 0), 0)
  function choosePerson(a) { setForm(f => ({ ...f, beneficiario_nombre: a.nombre_completo || `${a.nombres || ''} ${a.apellidos || ''}`.trim(), beneficiario_rut: a.rut || '', beneficiario_telefono: a.telefono || '', beneficiario_direccion: a.direccion || '', beneficiario_comuna: a.comuna || '' })); setResults([]) }
  function updateItem(id, key, value) { setForm(f => ({ ...f, items: f.items.map(x => x.id === id ? { ...x, [key]: value } : x) })) }
  function chooseProduct(id, productId) { const p = providers.flatMap(x => x.productos || []).find(x => x.id === productId); const provider = providers.find(x => x.id === p?.proveedor_id); updateItem(id, 'producto_id', productId); setForm(f => ({ ...f, items: f.items.map(x => x.id === id ? { ...x, producto_id: productId, producto_nombre: p.nombre, proveedor_id: provider.id, proveedor_nombre: provider.nombre, valor_neto: p.valor_neto || 0 } : x) })) }
  async function submit(e) { e.preventDefault(); if (!form.beneficiario_nombre.trim()) return alert('Ingresa el apicultor o beneficiario'); if (!form.items.some(x => x.producto_id)) return alert('Agrega al menos un producto'); try { await saveCredito(form, user?.nombre, form.id); onSaved() } catch (e) { alert(e.message) } }
  return <div className="card border-2 border-honey-200 space-y-3">
    <div className="flex justify-between"><h3 className="font-bold">Nuevo crédito apícola</h3><button onClick={onClose}><X className="w-4 h-4" /></button></div>
    <div className="grid sm:grid-cols-2 gap-3"><div className="relative sm:col-span-2"><label className="label text-xs">Apicultor o beneficiario</label><input className="input-field w-full" value={form.beneficiario_nombre} onChange={e => { set('beneficiario_nombre', e.target.value); buscarApicultoresPorNombre(e.target.value).then(setResults) }} placeholder="Buscar en la lista o ingresar persona externa" />{results.length > 0 && <div className="absolute z-10 bg-white border rounded shadow w-full">{results.map(a => <button type="button" className="block w-full text-left p-2 text-sm hover:bg-honey-50" key={a.id} onClick={() => choosePerson(a)}>{a.nombre_completo} · {a.rut}</button>)}</div>}</div>{[['beneficiario_rut','RUT'],['beneficiario_telefono','Teléfono'],['beneficiario_direccion','Domicilio'],['beneficiario_comuna','Comuna']].map(([k,l]) => <div key={k}><label className="label text-xs">{l}</label><input className="input-field w-full" value={form[k]} onChange={e => set(k, e.target.value)} /></div>)}</div>
    <div className="border rounded-lg overflow-x-auto"><table className="w-full text-xs"><thead className="bg-honey-50"><tr><th className="p-2 text-left">Ítem</th><th className="p-2 text-left">Detalle</th><th className="p-2 text-left">Proveedor / producto</th><th className="p-2">Cantidad</th><th className="p-2 text-right">Total neto</th><th /></tr></thead><tbody>{form.items.map((item, index) => <tr key={item.id}><td className="p-2">{index + 1}</td><td className="p-2"><input className="input-field w-32" value={item.detalle || ''} onChange={e => updateItem(item.id, 'detalle', e.target.value)} /></td><td className="p-2"><select className="input-field min-w-56" value={item.producto_id || ''} onChange={e => chooseProduct(item.id, e.target.value)}><option value="">Seleccionar proveedor y producto</option>{providers.map(p => <optgroup key={p.id} label={p.nombre}>{(p.productos || []).map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}</optgroup>)}</select></td><td className="p-2"><input className="input-field w-20 text-right" type="number" min="1" value={item.cantidad || 1} onChange={e => updateItem(item.id, 'cantidad', e.target.value)} /></td><td className="p-2 text-right whitespace-nowrap">{formatPesos((Number(item.cantidad) || 0) * (Number(item.valor_neto) || 0))}</td><td><button type="button" onClick={() => set('items', form.items.filter(x => x.id !== item.id))}><X className="w-4 h-4 text-red-500" /></button></td></tr>)}</tbody></table><button type="button" className="m-2 text-xs btn-secondary" onClick={() => set('items', [...form.items, { id: Date.now() + Math.random(), cantidad: 1 }])}><Plus className="w-3 h-3 inline" /> Agregar fila</button></div>
    <div className="grid sm:grid-cols-3 gap-3"><div><label className="label text-xs">Fecha entrega productos</label><input type="date" className="input-field w-full" value={form.fecha_entrega_productos} onChange={e => set('fecha_entrega_productos', e.target.value)} /></div><div><label className="label text-xs">Fecha entrega miel / pago</label><input type="date" className="input-field w-full" value={form.fecha_limite_pago} onChange={e => set('fecha_limite_pago', e.target.value)} /></div><div><label className="label text-xs">Total neto</label><input readOnly className="input-field w-full bg-gray-50 font-semibold" value={formatPesos(itemsTotal)} /></div></div>
    <div className="grid sm:grid-cols-2 gap-3"><div><label className="label text-xs">Representante Apícola Santa Bárbara</label><input className="input-field w-full" value={form.representante_nombre} onChange={e => set('representante_nombre', e.target.value)} placeholder="Nombre representante" /></div><div><label className="label text-xs">RUT representante</label><input className="input-field w-full" value={form.representante_rut} onChange={e => set('representante_rut', e.target.value)} /></div></div>
    <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" />Guardar crédito</button></div>
  </div>
}

function CommitmentLetter({ credit, onClose }) {
  const items = credit.credito_items || []
  return <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto p-4"><div className="max-w-3xl mx-auto bg-white p-8 print-letter"><div className="no-print flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cerrar</button><button className="btn-primary flex gap-2 items-center" onClick={() => window.print()}><Printer className="w-4 h-4" /> Imprimir</button></div><article className="prose max-w-none text-gray-900"><h1 className="text-center text-xl font-bold">CARTA DE COMPROMISO DE PAGO Y AUTORIZACIÓN DE DESCUENTO</h1><p>En <b>Santa Bárbara</b>, a <b>{new Date().toLocaleDateString('es-CL')}</b>, comparecen por una parte <b>APÍCOLA SANTA BÁRBARA SpA</b>, RUT <b>77.121.660-9</b>, domiciliada en calle Salamanca N.º 471, comuna de Santa Bárbara, en adelante “la Empresa”; y por la otra, don/doña <b>{credit.beneficiario_nombre}</b>, RUT <b>{credit.beneficiario_rut || '—'}</b>, domiciliado(a) en <b>{credit.beneficiario_direccion || '—'}</b>, en adelante “el Apicultor”.</p><h2>PRIMERO: RECEPCIÓN DE PRODUCTOS</h2><p>El Apicultor declara haber recibido de los proveedores indicados, a su entera conformidad, los siguientes productos:</p><ul>{items.map(x => <li key={x.id}>{x.cantidad} × {x.producto_nombre} — {x.proveedor_nombre}: {formatPesos(x.total_neto)}</li>)}</ul><p><b>Valor total: {formatPesos(credit.total_neto)}</b></p><h2>SEGUNDO: COMPROMISO DE PAGO</h2><p>El Apicultor se compromete a pagar a Apícola Santa Bárbara SpA la suma total de <b>{formatPesos(credit.total_neto)}</b>, a más tardar el día <b>{credit.fecha_limite_pago || '—'}</b>.</p><h2>TERCERO: AUTORIZACIÓN DE DESCUENTO DE MIEL</h2><p>En caso de no pago íntegro, el Apicultor autoriza expresamente a Apícola Santa Bárbara SpA para descontar el saldo pendiente de las sumas que la Empresa deba pagarle por concepto de miel entregada, a más tardar el día indicado.</p><h2>CUARTO: ACEPTACIÓN</h2><p>Las partes declaran conocer y aceptar íntegramente estas condiciones.</p><div className="grid grid-cols-2 gap-16 mt-20 text-center"><div>__________________________________<br /><b>{credit.beneficiario_nombre}</b><br />RUT: {credit.beneficiario_rut || '—'}<br />APICULTOR BENEFICIARIO</div><div>__________________________________<br /><b>{credit.representante_nombre || 'Representante'}</b><br />RUT: {credit.representante_rut || '77.121.660-9'}<br />APÍCOLA SANTA BÁRBARA SpA</div></div></article></div></div>
}

export default function CreditoApicola() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState('proveedores')
  const [providers, setProviders] = useState([])
  const [credits, setCredits] = useState([])
  const [form, setForm] = useState(null)
  const [letter, setLetter] = useState(null)
  const [error, setError] = useState('')
  async function reload() { try { setError(''); const [p, c] = await Promise.all([listProveedores(), listCreditos()]); setProviders(p); setCredits(c) } catch (e) { setError(e.message) } }
  useEffect(() => { reload() }, [])
  const overdue = useMemo(() => credits.filter(x => x.estado === 'pendiente' && x.fecha_limite_pago && x.fecha_limite_pago < new Date().toISOString().slice(0, 10)), [credits])
  return <div className="p-4 space-y-4">
    <div className="flex items-center gap-2"><button className="p-1 rounded hover:bg-gray-100" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button><h2 className="text-lg font-bold flex items-center gap-2"><BriefcaseBusiness className="w-5 h-5 text-amber-500" /> Crédito Apícola</h2></div>
    {error && <div className="card bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{[['proveedores','Listado de proveedores',Users],['productos','Productos y servicios',BriefcaseBusiness],['plazo','Apicultor fuera de plazo',FileText]].map(([key,label,Icon]) => <button key={key} className={`card text-left flex items-center gap-2 ${tab === key ? 'ring-2 ring-honey-400 bg-honey-50' : ''}`} onClick={() => setTab(key)}><Icon className="w-4 h-4 text-honey-600" />{label}</button>)}</div>
    {tab === 'proveedores' && <><ProviderList providers={providers} reload={reload} /><button className="btn-primary flex items-center gap-2" onClick={() => setForm({ ...EMPTY_CREDIT, items: [{ id: Date.now(), cantidad: 1 }] })}><Plus className="w-4 h-4" /> Nuevo crédito</button></>}
    {tab === 'productos' && <div className="space-y-3"><h3 className="font-bold">Productos y servicios</h3>{providers.map(p => <div className="card" key={p.id}><p className="font-semibold">{p.nombre}</p><div className="grid sm:grid-cols-2 gap-2 mt-2 text-sm">{(p.productos || []).map(x => <div className="flex justify-between bg-gray-50 rounded p-2" key={x.id}><span>{x.nombre}</span><b>{formatPesos(x.valor_neto)}</b></div>)}</div></div>)}</div>}
    {tab === 'plazo' && <div className="space-y-2"><h3 className="font-bold">Apicultores fuera de plazo</h3>{overdue.length === 0 ? <div className="card text-sm text-gray-500">No hay créditos vencidos pendientes.</div> : overdue.map(c => <div className="card flex justify-between gap-2" key={c.id}><div><b>{c.beneficiario_nombre}</b><p className="text-xs text-red-600">Vencimiento: {c.fecha_limite_pago} · {formatPesos(c.total_neto)}</p></div><button className="text-xs btn-secondary" onClick={() => updateCreditoEstado(c.id, 'miel_entregada').then(reload)}>Marcar cumplido</button></div>)}</div>}
    {credits.length > 0 && tab !== 'plazo' && <div className="card"><h3 className="font-bold mb-2">Créditos recientes</h3>{credits.slice(0, 10).map(c => <div className="flex items-center gap-2 border-b last:border-0 py-2 text-sm" key={c.id}><span className="flex-1">{c.beneficiario_nombre} · {formatPesos(c.total_neto)}</span><button className="btn-secondary text-xs" onClick={() => setLetter(c)}><FileText className="w-3 h-3 inline" /> Compromiso</button><button className="text-xs text-green-700" onClick={() => updateCreditoEstado(c.id, 'pagado').then(reload)}><Check className="w-4 h-4" /></button></div>)}</div>}
    {form && <div className="fixed inset-0 z-40 bg-black/30 overflow-y-auto p-4"><div className="max-w-4xl mx-auto mt-4"><CreditForm providers={providers} initial={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload() }} user={user} /></div></div>}
    {letter && <CommitmentLetter credit={letter} onClose={() => setLetter(null)} />}
  </div>
}
