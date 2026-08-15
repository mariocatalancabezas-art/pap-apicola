import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BriefcaseBusiness, Check, FileText, Plus, Printer, Save, Trash2, Users, X } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { buscarApicultoresPorNombre } from '../lib/importApicultores'
import {
  MATERIAL_APICOLA, MATERIAL_VIVO, RUBROS, deleteProveedor, formatPesos,
  listCreditos, listProveedores, saveCredito, saveProducto, saveProveedor, updateCreditoEstado,
} from '../lib/creditoApicola'

const EMPTY_PROVIDER = {
  nombre: '', rut: '', giro: '', direccion: '', rubros: [], material_vivo: [],
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
          {['nombre', 'rut', 'giro', 'direccion'].map(key => (
            <div key={key}>
              <label className="label text-xs">
                {key === 'nombre' ? 'Nombre o razón social' : key[0].toUpperCase() + key.slice(1)}
              </label>
              <input
                className="input-field w-full"
                value={form[key]}
                onChange={event => set(key, event.target.value)}
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

function ProductCatalog({ providers, reload }) {
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
                  <p>{product.nombre}</p>
                  {product.detalle && <p className="text-xs text-gray-500">{product.detalle}</p>}
                  <p className="text-xs text-gray-500">{product.categoria}</p>
                </div>
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
                    aria-label={`Valor neto de ${product.nombre}`}
                  />
                </label>
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
      beneficiario_rut: person.rut || '',
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
          producto_nombre: product?.nombre || '',
          valor_neto: product?.valor_neto || 0,
        }
      }),
    }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.beneficiario_nombre.trim()) return alert('Ingresa el apicultor o beneficiario')
    if (!form.items.some(item => item.producto_id)) return alert('Agrega al menos un producto')
    try {
      await saveCredito(form, user?.nombre, form.id)
      onSaved()
    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <div className="card space-y-3 border-2 border-honey-200">
      <div className="flex justify-between">
        <h3 className="font-bold">Nuevo crédito apícola</h3>
        <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
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
              onChange={event => set(key, event.target.value)}
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
                          {product.nombre}{product.detalle ? ` — ${product.detalle}` : ''}
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
            onChange={event => set('representante_rut', event.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" />Guardar crédito</button>
      </div>
    </div>
  )
}

function CommitmentLetter({ credit, onClose }) {
  const items = credit.credito_items || []
  const providers = [...new Set(items.map(item => item.proveedor_nombre).filter(Boolean))]
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="print-letter mx-auto max-w-3xl bg-white p-8">
        <div className="no-print flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn-primary flex items-center gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
        <article className="prose max-w-none text-gray-900">
          <h1 className="text-center text-xl font-bold">CARTA DE COMPROMISO DE PAGO Y AUTORIZACIÓN DE DESCUENTO</h1>
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
                {item.cantidad} × {item.producto_nombre} — Proveedor: {item.proveedor_nombre || '—'}
                {' '}({formatPesos(item.total_neto)})
              </li>
            ))}
          </ul>
          <p><b>Valor total neto: {formatPesos(credit.total_neto)}</b></p>
          <h2>SEGUNDO: COMPROMISO DE PAGO</h2>
          <p>
            El Apicultor se compromete a pagar a Apícola Santa Bárbara SpA la suma total neta de
            <b> {formatPesos(credit.total_neto)}</b>, a más tardar el día
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
          <div className="mt-20 grid grid-cols-2 gap-8 text-center">
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
    </div>
  )
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

  async function reload() {
    try {
      setError('')
      const [providerList, creditList] = await Promise.all([listProveedores(), listCreditos()])
      setProviders(providerList)
      setCredits(creditList)
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

  function openCreditForm() {
    setForm({ ...EMPTY_CREDIT, items: [{ id: Date.now(), cantidad: 1 }] })
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
      {tab === 'productos' && <ProductCatalog providers={providers} reload={reload} />}
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
                  Vencimiento: {credit.fecha_limite_pago} · {formatPesos(credit.total_neto)}
                </p>
              </div>
              <button
                className="btn-secondary text-xs"
                onClick={() => updateCreditoEstado(credit.id, 'miel_entregada').then(reload)}
              >
                Marcar cumplido
              </button>
            </div>
          ))}
        </div>
      )}
      {credits.length > 0 && tab !== 'plazo' && (
        <div className="card">
          <h3 className="mb-2 font-bold">Créditos recientes</h3>
          {credits.slice(0, 10).map(credit => (
            <div className="flex items-center gap-2 border-b py-2 text-sm last:border-0" key={credit.id}>
              <span className="flex-1">{credit.beneficiario_nombre} · {formatPesos(credit.total_neto)}</span>
              <button className="btn-secondary text-xs" onClick={() => setLetter(credit)}>
                <FileText className="inline w-3 h-3" /> Compromiso
              </button>
              <button
                className="text-xs text-green-700"
                onClick={() => updateCreditoEstado(credit.id, 'pagado').then(reload)}
              >
                <Check className="w-4 h-4" />
              </button>
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
    </div>
  )
}
