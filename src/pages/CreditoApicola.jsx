import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BriefcaseBusiness, FileText, Pencil, Plus, Printer, Save, Trash2, Users, X } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { buscarApicultoresPorNombre } from '../lib/importApicultores'
import {
  MATERIAL_APICOLA, MATERIAL_VIVO, RUBROS, deleteCredito, deleteProveedor, formatPesos,
  addAbono, listCreditos, listProveedores, nombreProducto, saldoPendiente, saveCredito,
  saveProducto, saveProveedor, totalAbonado, updateCreditoEstado,
} from '../lib/creditoApicola'
import { formatRut } from '../lib/rut'

const EMPTY_PROVIDER = {
  nombre: '', rut: '', giro: '', direccion: '', comuna: '', rubros: [], material_vivo: [],
  material_apicola: [], material_apicola_otro: '', servicios_detalle: '', rubro_otro: '',
}
const EMPTY_CREDIT = {
  beneficiario_nombre: '', beneficiario_rut: '', beneficiario_telefono: '',
  beneficiario_direccion: '', beneficiario_comuna: '', es_apicultor_programa: true,
  fecha_entrega_productos: '', fecha_limite_pago: '', representante_nombre: '',
  representante_rut: '', items: [],
}

function formatInputValue(value) {
  if (value === '' || value === null || value === undefined) return ''
  return Number(value || 0).toLocaleString('es-CL')
}

function parseInputValue(value) {
  return value.replace(/\D/g, '')
}

function formatDate(value) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function resumenCredito(credit, providers = []) {
  const items = credit.credito_items || []
  const productsById = new Map(
    providers.flatMap(provider => (provider.productos || []).map(product => [product.id, product])),
  )
  const rubros = [...new Set(items
    .map(item => productsById.get(item.producto_id)?.categoria)
    .filter(Boolean))]
  const productos = items
    .map(item => `${item.cantidad || 0} × ${item.producto_nombre || nombreProducto(productsById.get(item.producto_id)) || 'Producto'}`)
    .join(', ')
  return [...rubros, productos].filter(Boolean).join(' · ') || 'Sin detalle de productos'
}

function ToggleList({ values, options, onChange }) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
      {options.map(option => (
        <label key={option} className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={values.includes(option)}
            onChange={() => onChange(
              values.includes(option)
                ? values.filter(value => value !== option)
                : [...values, option],
            )}
          />
          {option}
        </label>
      ))}
    </div>
  )
}

function ProviderForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || EMPTY_PROVIDER)
  const [saving, setSaving] = useState(false)

  function set(key, value) {
    setForm(previous => ({ ...previous, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.nombre.trim()) return alert('Ingresa el nombre o razón social')
    setSaving(true)
    try {
      await saveProveedor(form, form.id)
      onSaved()
    } catch (error) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card border-2 border-honey-200">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">{form.id ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
        <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {['nombre', 'rut', 'giro', 'direccion', 'comuna'].map(key => (
            <div key={key}>
              <label className="label text-xs">
                {key === 'nombre' ? 'Nombre o razón social' : key[0].toUpperCase() + key.slice(1)}
              </label>
              <input
                className="input-field w-full"
                value={form[key]}
                onChange={event => set(key, key === 'rut' ? formatRut(event.target.value) : event.target.value)}
                required={key === 'nombre'}
              />
            </div>
          ))}
        </div>
        <div>
          <label className="label text-xs">Rubros que ofrece</label>
          <ToggleList values={form.rubros} options={RUBROS} onChange={value => set('rubros', value)} />
        </div>
        {form.rubros.includes('Material vivo') && (
          <div className="border-l-2 border-honey-200 pl-3">
            <p className="text-xs font-semibold">Material vivo</p>
            <ToggleList
              values={form.material_vivo}
              options={MATERIAL_VIVO}
              onChange={value => set('material_vivo', value)}
            />
          </div>
        )}
        {form.rubros.includes('Servicios') && (
          <div>
            <label className="label text-xs">Detalle del servicio (máximo 1.000 caracteres)</label>
            <textarea
              className="input-field w-full"
              maxLength={1000}
              rows={3}
              value={form.servicios_detalle}
              onChange={event => set('servicios_detalle', event.target.value)}
            />
          </div>
        )}
        {form.rubros.includes('Material apícola') && (
          <div className="border-l-2 border-honey-200 pl-3">
            <p className="text-xs font-semibold">Material apícola</p>
            <ToggleList
              values={form.material_apicola}
              options={MATERIAL_APICOLA}
              onChange={value => set('material_apicola', value)}
            />
            {form.material_apicola.includes('Otro') && (
              <input
                className="input-field mt-2 w-full"
                placeholder="Indique cuál"
                value={form.material_apicola_otro}
                onChange={event => set('material_apicola_otro', event.target.value)}
              />
            )}
          </div>
        )}
        {form.rubros.includes('Otro') && (
          <input
            className="input-field w-full"
            placeholder="Indique cuál"
            value={form.rubro_otro}
            onChange={event => set('rubro_otro', event.target.value)}
          />
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex items-center gap-2" disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar proveedor'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ProviderList({ providers, reload }) {
  const [form, setForm] = useState(null)
  const [open, setOpen] = useState(null)

  async function remove(provider) {
    if (!confirm(`¿Eliminar ${provider.nombre}?`)) return
    try {
      await deleteProveedor(provider.id)
      reload()
    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <div className="space-y-3">
      {!form && (
        <button className="btn-primary flex items-center gap-2" onClick={() => setForm({ ...EMPTY_PROVIDER })}>
          <Plus className="w-4 h-4" /> Nuevo proveedor
        </button>
      )}
      {form && (
        <ProviderForm
          initial={form}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); reload() }}
        />
      )}
      {providers.length === 0 ? (
        <div className="card text-sm text-gray-500">No hay proveedores registrados.</div>
      ) : providers.map(provider => (
        <div key={provider.id} className="card">
          <div className="flex items-start justify-between gap-2">
            <button
              className="flex-1 text-left"
              onClick={() => setOpen(open === provider.id ? null : provider.id)}
            >
              <p className="font-semibold">{provider.nombre}</p>
              <p className="text-xs text-gray-500">
                {provider.rut || 'Sin RUT'} · {provider.giro || 'Sin giro'}
              </p>
            </button>
            <div className="flex gap-1">
              <button className="p-1.5 text-gray-500" onClick={() => setForm(provider)}>
                <FileText className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-red-500" onClick={() => remove(provider)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {open === provider.id && (
            <div className="mt-3 space-y-2 border-t pt-3 text-xs">
              <p><b>Dirección:</b> {provider.direccion || '—'}</p>
              <p><b>Comuna:</b> {provider.comuna || '—'}</p>
              <p><b>Rubros:</b> {(provider.rubros || []).join(', ') || '—'}</p>
              <p className="text-gray-500">
                Los valores netos se editan en la pestaña Productos y servicios.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ProductCatalog({ providers, reload, isAdmin }) {
  const [values, setValues] = useState({})
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    const nextValues = {}
    providers.forEach(provider => {
      ;(provider.productos || []).forEach(product => {
        nextValues[product.id] = product.valor_neto || 0
      })
    })
    setValues(nextValues)
  }, [providers])

  function updateValue(id, value) {
    setValues(previous => ({ ...previous, [id]: parseInputValue(value) }))
  }

  async function saveValue(product) {
    const value = values[product.id] ?? 0
    if (Number(value) === Number(product.valor_neto || 0)) return
    setSavingId(product.id)
    try {
      await saveProducto(product.id, value)
      await reload()
    } catch (error) {
      alert(error.message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold">Productos y servicios</h3>
      {providers.length === 0 && (
        <div className="card text-sm text-gray-500">No hay proveedores registrados.</div>
      )}
      {providers.map(provider => (
        <div className="card" key={provider.id}>
          <p className="font-semibold">{provider.nombre}</p>
          <div className="mt-2 space-y-2">
            {(provider.productos || []).map(product => (
              <div
                className="grid items-center gap-2 rounded bg-gray-50 p-2 sm:grid-cols-[1fr_auto]"
                key={product.id}
              >
                <div>
                  <p>{nombreProducto(product)}</p>
                  <p className="text-xs text-gray-500">{product.categoria}</p>
                </div>
                {isAdmin ? (
                  <label className="flex items-center gap-1 text-sm">
                    <span>$</span>
                    <input
                      className="input-field w-36 py-1 text-right"
                      inputMode="numeric"
                      value={formatInputValue(values[product.id])}
                      onChange={event => updateValue(product.id, event.target.value)}
                      onBlur={() => saveValue(product)}
                      disabled={savingId === product.id}
                      placeholder="Valor neto"
                      aria-label={`Valor neto de ${nombreProducto(product)}`}
                    />
                  </label>
                ) : (
                  <span className="text-right text-sm text-gray-600">{formatPesos(product.valor_neto)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CreditForm({ providers, initial, onClose, onSaved, user }) {
  const [form, setForm] = useState(initial || {
    ...EMPTY_CREDIT,
    items: [{ id: Date.now(), cantidad: 1 }],
  })
  const [results, setResults] = useState([])
  const [saving, setSaving] = useState(false)
  const itemsTotal = form.items.reduce(
    (sum, item) => sum + (Number(item.cantidad) || 0) * (Number(item.valor_neto) || 0),
    0,
  )

  function set(key, value) {
    setForm(previous => ({ ...previous, [key]: value }))
  }

  function choosePerson(person) {
    setForm(previous => ({
      ...previous,
      beneficiario_nombre: person.nombre_completo
        || `${person.nombres || ''} ${person.apellidos || ''}`.trim(),
      beneficiario_rut: formatRut(person.rut || ''),
      beneficiario_telefono: person.telefono || '',
      beneficiario_direccion: person.direccion || '',
      beneficiario_comuna: person.comuna || '',
    }))
    setResults([])
  }

  function updateItem(id, key, value) {
    setForm(previous => ({
      ...previous,
      items: previous.items.map(item => item.id === id ? { ...item, [key]: value } : item),
    }))
  }

  function chooseProvider(id, providerId) {
    const provider = providers.find(item => item.id === providerId)
    setForm(previous => ({
      ...previous,
      items: previous.items.map(item => item.id === id ? {
        ...item,
        proveedor_id: providerId,
        proveedor_nombre: provider?.nombre || '',
        producto_id: '',
        producto_nombre: '',
        valor_neto: 0,
      } : item),
    }))
  }

  function chooseProduct(id, productId) {
    setForm(previous => ({
      ...previous,
      items: previous.items.map(item => {
        if (item.id !== id) return item
        const provider = providers.find(candidate => candidate.id === item.proveedor_id)
        const product = provider?.productos?.find(candidate => candidate.id === productId)
        return {
          ...item,
          producto_id: productId,
          producto_nombre: nombreProducto(product),
          valor_neto: product?.valor_neto || 0,
        }
      }),
    }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.beneficiario_nombre.trim()) return alert('Ingresa el apicultor o beneficiario')
    if (!form.items.some(item => item.producto_id)) return alert('Agrega al menos un producto')
    setSaving(true)
    try {
      await saveCredito(form, user?.nombre, form.id)
      onSaved()
    } catch (error) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card border-2 border-honey-200">
      <div className="flex justify-between">
        <h3 className="font-bold">{form.id ? 'Editar crédito apícola' : 'Nuevo crédito apícola'}</h3>
        <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
      <form onSubmit={submit} className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative sm:col-span-2">
          <label className="label text-xs">Apicultor o beneficiario</label>
          <input
            className="input-field w-full"
            value={form.beneficiario_nombre}
            onChange={event => {
              set('beneficiario_nombre', event.target.value)
              buscarApicultoresPorNombre(event.target.value).then(setResults)
            }}
            placeholder="Buscar en la lista o ingresar persona externa"
          />
          {results.length > 0 && (
            <div className="absolute z-10 w-full rounded border bg-white shadow">
              {results.map(person => (
                <button
                  type="button"
                  className="block w-full p-2 text-left text-sm hover:bg-honey-50"
                  key={person.id}
                  onClick={() => choosePerson(person)}
                >
                  {person.nombre_completo} · {person.rut}
                </button>
              ))}
            </div>
          )}
        </div>
        {[
          ['beneficiario_rut', 'RUT'],
          ['beneficiario_telefono', 'Teléfono'],
          ['beneficiario_direccion', 'Domicilio'],
          ['beneficiario_comuna', 'Comuna'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="label text-xs">{label}</label>
            <input
              className="input-field w-full"
              value={form[key]}
              onChange={event => set(key, key.endsWith('_rut') ? formatRut(event.target.value) : event.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-honey-50">
            <tr>
              <th className="p-2 text-left">Ítem</th>
              <th className="p-2 text-left">Detalle</th>
              <th className="p-2 text-left">Producto, maquinaria o servicio</th>
              <th className="p-2">Cantidad</th>
              <th className="p-2 text-right">Total neto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {form.items.map((item, index) => {
              const provider = providers.find(candidate => candidate.id === item.proveedor_id)
              return (
                <tr key={item.id}>
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">
                    <select
                      className="input-field min-w-48"
                      value={item.proveedor_id || ''}
                      onChange={event => chooseProvider(item.id, event.target.value)}
                    >
                      <option value="">Seleccionar proveedor</option>
                      {providers.map(candidate => (
                        <option key={candidate.id} value={candidate.id}>{candidate.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className="input-field min-w-56"
                      value={item.producto_id || ''}
                      onChange={event => chooseProduct(item.id, event.target.value)}
                      disabled={!provider}
                    >
                      <option value="">Seleccionar producto o servicio</option>
                      {(provider?.productos || []).map(product => (
                        <option key={product.id} value={product.id}>
                          {nombreProducto(product)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      className="input-field w-20 text-right"
                      type="number"
                      min="1"
                      value={item.cantidad || 1}
                      onChange={event => updateItem(item.id, 'cantidad', event.target.value)}
                    />
                  </td>
                  <td className="whitespace-nowrap p-2 text-right">
                    {formatPesos((Number(item.cantidad) || 0) * (Number(item.valor_neto) || 0))}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => set('items', form.items.filter(candidate => candidate.id !== item.id))}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button
          type="button"
          className="btn-secondary m-2 text-xs"
          onClick={() => set('items', [...form.items, { id: Date.now() + Math.random(), cantidad: 1 }])}
        >
          <Plus className="inline w-3 h-3" /> Agregar fila
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label text-xs">Fecha entrega productos</label>
          <input
            type="date"
            className="input-field w-full"
            value={form.fecha_entrega_productos}
            onChange={event => set('fecha_entrega_productos', event.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs">Fecha entrega miel / pago</label>
          <input
            type="date"
            className="input-field w-full"
            value={form.fecha_limite_pago}
            onChange={event => set('fecha_limite_pago', event.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs">Total neto</label>
          <input readOnly className="input-field w-full bg-gray-50 font-semibold" value={formatPesos(itemsTotal)} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label text-xs">Representante Apícola Santa Bárbara</label>
          <input
            className="input-field w-full"
            value={form.representante_nombre}
            onChange={event => set('representante_nombre', event.target.value)}
            placeholder="Nombre representante"
          />
        </div>
        <div>
          <label className="label text-xs">RUT representante</label>
          <input
            className="input-field w-full"
            value={form.representante_rut}
            onChange={event => set('representante_rut', formatRut(event.target.value))}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary flex items-center gap-2" disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar crédito'}
        </button>
      </div>
      </form>
    </div>
  )
}

function AbonoDialog({ credit, user, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [observacion, setObservacion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const saldo = saldoPendiente(credit)
  const abonos = [...(credit.credito_abonos || [])].sort((a, b) => (
    String(b.fecha || '').localeCompare(String(a.fecha || ''))
  ))

  async function submit(event) {
    event.preventDefault()
    const monto = Number(parseInputValue(amount))
    if (monto <= 0) return setError('Ingresa un monto mayor que cero')
    if (monto > saldo) return setError('El abono no puede superar el saldo pendiente')
    setSaving(true)
    setError('')
    try {
      await addAbono(credit.id, monto, date, user?.nombre, observacion)
      onSaved()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-4">
      <div className="mx-auto mt-8 max-w-lg card">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Registrar abono</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <p className="mt-1 text-sm text-gray-700">{credit.beneficiario_nombre}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded bg-gray-50 p-2"><b>Total</b><br />{formatPesos(credit.total_neto)}</div>
          <div className="rounded bg-gray-50 p-2"><b>Abonado</b><br />{formatPesos(totalAbonado(credit))}</div>
          <div className="rounded bg-orange-50 p-2"><b>Saldo</b><br />{formatPesos(saldo)}</div>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="label text-xs">Monto del abono</label>
            <input
              className="input-field w-full text-right"
              inputMode="numeric"
              value={formatInputValue(amount)}
              onChange={event => setAmount(parseInputValue(event.target.value))}
              placeholder="0"
              autoFocus
            />
          </div>
          <div>
            <label className="label text-xs">Fecha</label>
            <input type="date" className="input-field w-full" value={date} onChange={event => setDate(event.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Observación (opcional)</label>
            <textarea className="input-field w-full" rows={2} value={observacion} onChange={event => setObservacion(event.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" disabled={saving || saldo <= 0}>
              {saving ? 'Guardando…' : 'Guardar abono'}
            </button>
          </div>
        </form>
        <div className="mt-5 border-t pt-3">
          <h4 className="text-sm font-semibold">Abonos registrados</h4>
          {abonos.length === 0 ? (
            <p className="mt-2 text-xs text-gray-500">Aún no hay abonos.</p>
          ) : (
            <div className="mt-2 space-y-1 text-xs">
              {abonos.map(abono => (
                <div key={abono.id} className="flex justify-between gap-2 rounded bg-gray-50 p-2">
                  <span>{formatDate(abono.fecha)}{abono.observacion ? ` · ${abono.observacion}` : ''}</span>
                  <b>{formatPesos(abono.monto)}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CommitmentLetter({ credit, onClose }) {
  const items = credit.credito_items || []
  const providers = [...new Set(items.map(item => item.proveedor_nombre).filter(Boolean))]
  const totalNeto = items.length
    ? items.reduce((sum, item) => sum + (Number(item.total_neto) || 0), 0)
    : Number(credit.total_neto || 0)
  useEffect(() => {
    document.body.classList.add('commitment-print-active')
    return () => document.body.classList.remove('commitment-print-active')
  }, [])

  return createPortal(
    <div className="commitment-letter-overlay fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="print-letter mx-auto max-w-3xl bg-white p-8">
        <div className="no-print flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn-primary flex items-center gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
        <article className="prose max-w-none text-gray-900">
          <h1 className="mb-8 text-center text-xl font-bold">CARTA DE COMPROMISO DE PAGO Y AUTORIZACIÓN DE DESCUENTO</h1>
          <p>
            En <b>Santa Bárbara</b>, a <b>{new Date().toLocaleDateString('es-CL')}</b>, comparecen por
            una parte <b>APÍCOLA SANTA BÁRBARA SpA</b>, RUT <b>77.121.660-9</b>, domiciliada en calle
            Salamanca N.º 471, comuna de Santa Bárbara, en adelante “la Empresa”; y por la otra,
            don/doña <b>{credit.beneficiario_nombre}</b>, RUT <b>{credit.beneficiario_rut || '—'}</b>,
            domiciliado(a) en <b>{credit.beneficiario_direccion || '—'}</b>, en adelante “el Apicultor”.
          </p>
          <h2>PRIMERO: RECEPCIÓN DE PRODUCTOS</h2>
          <p>
            El Apicultor declara haber recibido de la empresa proveedora{providers.length === 1 ? '' : 's'}
            <b> {providers.join(', ') || '—'}</b>, a su entera conformidad, los siguientes productos:
          </p>
          <ul>
            {items.map(item => (
              <li key={item.id}>
                {item.cantidad} {item.producto_nombre || nombreProducto(item) || 'Producto'}
                {' por un valor total neto de '}{formatPesos(item.total_neto)}
              </li>
            ))}
          </ul>
          <p><b>Valor total neto de los productos: {formatPesos(totalNeto)}</b></p>
          <h2>SEGUNDO: COMPROMISO DE PAGO</h2>
          <p>
            El Apicultor se compromete a pagar a Apícola Santa Bárbara SpA la suma total neta de
            <b> {formatPesos(totalNeto)}</b>, a más tardar el día
            <b> {formatDate(credit.fecha_limite_pago)}</b>.
          </p>
          <h2>TERCERO: AUTORIZACIÓN DE DESCUENTO DE MIEL</h2>
          <p>
            En caso de no pago íntegro, el Apicultor autoriza expresamente a Apícola Santa Bárbara
            SpA para descontar el saldo pendiente de las sumas que la Empresa deba pagarle por
            concepto de miel entregada, a más tardar el día <b>{formatDate(credit.fecha_limite_pago)}</b>,
            fecha límite de entrega de miel.
          </p>
          <h2>CUARTO: ACEPTACIÓN</h2>
          <p>Las partes declaran conocer y aceptar íntegramente estas condiciones.</p>
          <div className="commitment-signatures mt-20 grid grid-cols-2 gap-8 text-center">
            <div>
              __________________________________<br />
              <b>{credit.beneficiario_nombre}</b><br />
              RUT: {credit.beneficiario_rut || '—'}<br />
              APICULTOR BENEFICIARIO
            </div>
            <div>
              __________________________________<br />
              <b>{credit.representante_nombre || 'Representante'}</b><br />
              RUT: {credit.representante_rut || '—'}<br />
              APÍCOLA SANTA BÁRBARA SpA
            </div>
          </div>
        </article>
      </div>
    </div>,
    document.body,
  )
}

export default function CreditoApicola() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const puedeEditar = isAdmin || !!user?.puede_editar_credito_apicola
  const [tab, setTab] = useState('proveedores')
  const [providers, setProviders] = useState([])
  const [credits, setCredits] = useState([])
  const [form, setForm] = useState(null)
  const [abonoCredit, setAbonoCredit] = useState(null)
  const [letter, setLetter] = useState(null)
  const [error, setError] = useState('')

  async function reload() {
    try {
      setError('')
      const [providerList, creditList] = await Promise.all([listProveedores(), listCreditos()])
      setProviders(providerList)
      const productsById = new Map(
        providerList.flatMap(provider => (provider.productos || []).map(product => [product.id, product])),
      )
      setCredits(creditList.map(credit => ({
        ...credit,
        credito_items: (credit.credito_items || []).map(item => ({
          ...item,
          producto_nombre: nombreProducto(productsById.get(item.producto_id)) || item.producto_nombre || '',
        })),
      })))
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const overdue = useMemo(
    () => credits.filter(credit => (
      credit.estado === 'pendiente'
      && credit.fecha_limite_pago
      && credit.fecha_limite_pago < new Date().toISOString().slice(0, 10)
    )),
    [credits],
  )
  const pending = useMemo(
    () => credits.filter(credit => credit.estado === 'pendiente'),
    [credits],
  )
  const history = useMemo(
    () => credits.filter(credit => credit.estado === 'pagado' || credit.estado === 'miel_entregada'),
    [credits],
  )

  function openCreditForm() {
    setForm({ ...EMPTY_CREDIT, items: [{ id: Date.now(), cantidad: 1 }] })
  }

  function openEditCredit(credit) {
    setForm({
      ...credit,
      items: (credit.credito_items || []).map(item => ({
        id: item.id,
        proveedor_id: item.proveedor_id || '',
        proveedor_nombre: item.proveedor_nombre || '',
        producto_id: item.producto_id || '',
        producto_nombre: item.producto_nombre || '',
        cantidad: item.cantidad || 1,
        valor_neto: item.valor_neto || 0,
      })),
    })
  }

  async function markEstado(credit, estado) {
    if (estado === 'pagado' && !confirm(`¿Marcar como pagado el crédito de ${credit.beneficiario_nombre}?`)) return
    try {
      await updateCreditoEstado(credit.id, estado)
      await reload()
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  async function removeCredit(credit) {
    if (!confirm(`¿Eliminar el crédito de ${credit.beneficiario_nombre}?`)) return
    try {
      await deleteCredito(credit.id)
      await reload()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <button className="rounded p-1 hover:bg-gray-100" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <BriefcaseBusiness className="w-5 h-5 text-amber-500" /> Crédito Apícola
        </h2>
      </div>
      {error && <div className="card border-red-200 bg-red-50 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          ['proveedores', 'Listado de proveedores', Users],
          ['productos', 'Productos y servicios', BriefcaseBusiness],
          ['plazo', 'Apicultor fuera de plazo', FileText],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            className={`card flex items-center gap-2 text-left ${tab === key ? 'bg-honey-50 ring-2 ring-honey-400' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon className="w-4 h-4 text-honey-600" />{label}
          </button>
        ))}
      </div>
      <button className="btn-primary flex items-center gap-2" onClick={openCreditForm}>
        <Plus className="w-4 h-4" /> Nuevo crédito
      </button>
      {tab === 'proveedores' && <ProviderList providers={providers} reload={reload} />}
      {tab === 'productos' && <ProductCatalog providers={providers} reload={reload} isAdmin={isAdmin} />}
      {tab === 'plazo' && (
        <div className="space-y-2">
          <h3 className="font-bold">Apicultores fuera de plazo</h3>
          {overdue.length === 0 ? (
            <div className="card text-sm text-gray-500">No hay créditos vencidos pendientes.</div>
          ) : overdue.map(credit => (
            <div className="card flex justify-between gap-2" key={credit.id}>
              <div>
                <b>{credit.beneficiario_nombre}</b>
                <p className="text-xs text-red-600">
                  {resumenCredito(credit, providers)}
                </p>
                <p className="text-xs text-red-600">
                  Vencimiento: {credit.fecha_limite_pago} · Total {formatPesos(credit.total_neto)}
                  {' · Abonado '}{formatPesos(totalAbonado(credit))}
                  {' · Adeudado '}{formatPesos(saldoPendiente(credit))}
                </p>
              </div>
              {puedeEditar && (
                <button className="btn-secondary text-xs" onClick={() => markEstado(credit, 'miel_entregada')}>
                  Marcar cumplido
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {tab !== 'plazo' && (
        <div className="card">
          <h3 className="mb-2 font-bold">Créditos pendientes</h3>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-500">No hay créditos pendientes.</p>
          ) : pending.map(credit => (
            <div className="border-b py-3 text-sm last:border-0" key={credit.id}>
              <div className="flex flex-wrap items-center gap-2">
                <b className="mr-auto">{credit.beneficiario_nombre}</b>
                {puedeEditar && (
                  <>
                    <button className="rounded bg-orange-500 px-2 py-1 text-xs text-white" onClick={() => setAbonoCredit(credit)}>
                      Abono
                    </button>
                    <button className="rounded bg-green-600 px-2 py-1 text-xs text-white" onClick={() => markEstado(credit, 'pagado')}>
                      Pagado
                    </button>
                    <button className="rounded p-1 text-gray-500 hover:bg-gray-100" title="Editar crédito" onClick={() => openEditCredit(credit)}>
                      <Pencil className="w-4 h-4" />
                    </button>
                  </>
                )}
                {isAdmin && (
                  <button
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                    title="Eliminar crédito"
                    onClick={() => removeCredit(credit)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button className="btn-secondary text-xs" onClick={() => setLetter(credit)}>
                  <FileText className="inline w-3 h-3" /> Compromiso
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600">{resumenCredito(credit, providers)}</p>
              <p className="text-xs text-gray-500">
                Total {formatPesos(credit.total_neto)}
                {' · Abonado '}{formatPesos(totalAbonado(credit))}
                {' · Adeudado '}{formatPesos(saldoPendiente(credit))}
              </p>
            </div>
          ))}
        </div>
      )}
      {tab !== 'plazo' && (
        <div className="card">
          <h3 className="mb-2 font-bold">Historial de créditos</h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No hay créditos saldados.</p>
          ) : history.map(credit => (
            <div className="flex flex-wrap items-center gap-2 border-b py-2 text-sm last:border-0" key={credit.id}>
              <span className="mr-auto">
                <b>{credit.beneficiario_nombre}</b>
                <span className="ml-2 text-xs text-gray-500">
                  Total {formatPesos(credit.total_neto)} · Abonado {formatPesos(totalAbonado(credit))}
                  {' · Cumplido '}{formatDate(credit.fecha_cumplimiento)}
                </span>
              </span>
              <button className="btn-secondary text-xs" onClick={() => setLetter(credit)}>
                <FileText className="inline w-3 h-3" /> Compromiso
              </button>
              {isAdmin && (
                <button
                  className="rounded p-1 text-red-500 hover:bg-red-50"
                  title="Eliminar crédito"
                  onClick={() => removeCredit(credit)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {form && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/30 p-4">
          <div className="mx-auto mt-4 max-w-4xl">
            <CreditForm
              providers={providers}
              initial={form}
              onClose={() => setForm(null)}
              onSaved={() => { setForm(null); reload() }}
              user={user}
            />
          </div>
        </div>
      )}
      {letter && <CommitmentLetter credit={letter} onClose={() => setLetter(null)} />}
      {abonoCredit && (
        <AbonoDialog
          credit={abonoCredit}
          user={user}
          onClose={() => setAbonoCredit(null)}
          onSaved={() => { setAbonoCredit(null); reload() }}
        />
      )}
    </div>
  )
}
