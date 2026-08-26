import { supabase } from './supabase'

export const RUBROS = ['Maquinaria', 'Material vivo', 'Servicios', 'Material apícola', 'Otro']
export const MATERIAL_VIVO = ['Reinas fecundas', 'Celdas reales', 'Núcleos']
export const MATERIAL_APICOLA = [
  'Cámara de cría completa', 'Cajón nuclero', 'Fecundador', 'Triplero',
  'Techo', 'Entretecho', 'Alza con marcos', 'Piso', 'Otro',
]

function ensure() {
  if (!supabase) throw new Error('Supabase no está configurado')
}

export function nombreProducto(product) {
  const nombre = String(product?.nombre || product?.item_key || '').trim()
  const detalle = String(product?.detalle || '').trim()
  if (nombre.toLowerCase() === 'otro' || product?.categoria === 'Otro') return detalle || nombre
  return detalle ? `${nombre} — ${detalle}` : nombre
}

export async function listProveedores() {
  ensure()
  const { data, error } = await supabase.from('credito_proveedores').select('*').order('nombre')
  if (error) throw new Error(`Error al cargar proveedores: ${error.message}`)
  const ids = (data || []).map(p => p.id)
  if (!ids.length) return []
  const products = await supabase.from('credito_productos').select('*').in('proveedor_id', ids).order('nombre')
  if (products.error) throw new Error(`Error al cargar productos: ${products.error.message}`)
  return (data || []).map(p => ({ ...p, productos: (products.data || []).filter(x => x.proveedor_id === p.id) }))
}

export async function saveProveedor(form, id) {
  ensure()
  const row = {
    nombre: form.nombre.trim(), rut: form.rut || null, giro: form.giro || null,
    direccion: form.direccion || null, comuna: form.comuna || null, rubros: form.rubros || [],
    material_vivo: form.material_vivo || [], material_apicola: form.material_apicola || [],
    material_apicola_otro: form.material_apicola_otro || null,
    servicios_detalle: form.servicios_detalle || null, rubro_otro: form.rubro_otro || null,
  }
  const result = id
    ? await supabase.from('credito_proveedores').update(row).eq('id', id).select().single()
    : await supabase.from('credito_proveedores').insert(row).select().single()
  if (result.error) throw new Error(`Error al guardar proveedor: ${result.error.message}`)
  const provider = result.data
  const existingResult = await supabase
    .from('credito_productos')
    .select('id, categoria, item_key, valor_neto')
    .eq('proveedor_id', provider.id)
  if (existingResult.error) {
    throw new Error(`Error al cargar productos: ${existingResult.error.message}`)
  }
  const existingProducts = existingResult.data || []
  const existingByKey = new Map(
    existingProducts.map(product => [`${product.categoria}:${product.item_key}`, product]),
  )
  const products = []
  for (const category of row.rubros) {
    const values = category === 'Material vivo' ? row.material_vivo
      : category === 'Material apícola' ? row.material_apicola : [category]
    for (const value of values) {
      const detail = category === 'Otro' ? row.rubro_otro
        : category === 'Servicios' ? row.servicios_detalle
          : category === 'Material apícola' && value === 'Otro' ? row.material_apicola_otro
            : null
      const previous = existingByKey.get(`${category}:${value}`)
      products.push({
        proveedor_id: provider.id,
        categoria: category,
        item_key: value,
        nombre: value,
        detalle: detail,
        valor_neto: previous?.valor_neto || 0,
      })
    }
  }
  if (products.length) {
    const upserted = await supabase
      .from('credito_productos')
      .upsert(products, { onConflict: 'proveedor_id,categoria,item_key' })
    if (upserted.error) throw new Error(`Error al guardar productos: ${upserted.error.message}`)
  }
  const productKeys = new Set(products.map(product => `${product.categoria}:${product.item_key}`))
  const obsoleteIds = existingProducts
    .filter(product => !productKeys.has(`${product.categoria}:${product.item_key}`))
    .map(product => product.id)
  if (obsoleteIds.length) {
    const removed = await supabase.from('credito_productos').delete().in('id', obsoleteIds)
    if (removed.error) throw new Error(`Error al eliminar productos: ${removed.error.message}`)
  }
  return provider
}

export async function deleteProveedor(id) {
  ensure()
  const { error } = await supabase.from('credito_proveedores').delete().eq('id', id)
  if (error) throw new Error(`Error al eliminar proveedor: ${error.message}`)
}

export async function deleteCredito(id) {
  ensure()
  const { error } = await supabase.from('credito_creditos').delete().eq('id', id)
  if (error) throw new Error(`Error al eliminar crédito: ${error.message}`)
}

export async function saveProducto(id, valor) {
  ensure()
  const { error } = await supabase.from('credito_productos').update({ valor_neto: Number(valor) || 0 }).eq('id', id)
  if (error) throw new Error(`Error al actualizar producto: ${error.message}`)
}

export async function listCreditos() {
  ensure()
  const { data, error } = await supabase
    .from('credito_creditos')
    .select('*, credito_items(*), credito_abonos(*)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Error al cargar créditos: ${error.message}`)
  return (data || []).map(credit => ({
    ...credit,
    credito_items: [...(credit.credito_items || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    credito_abonos: [...(credit.credito_abonos || [])].sort((a, b) => (
      String(a.fecha || '').localeCompare(String(b.fecha || ''))
      || String(a.created_at || '').localeCompare(String(b.created_at || ''))
    )),
  }))
}

export async function addAbono(creditoId, monto, fecha, userName, observacion) {
  ensure()
  const amount = Number(monto) || 0
  if (amount <= 0) throw new Error('El monto del abono debe ser mayor que cero')
  const { error: insertError } = await supabase.from('credito_abonos').insert({
    credito_id: creditoId,
    monto: amount,
    fecha: fecha || new Date().toISOString().slice(0, 10),
    observacion: observacion || null,
    created_by: userName || null,
  })
  if (insertError) throw new Error(`Error al guardar abono: ${insertError.message}`)

  const [{ data: credit, error: creditError }, { data: abonos, error: abonosError }] = await Promise.all([
    supabase.from('credito_creditos').select('total_neto, estado').eq('id', creditoId).single(),
    supabase.from('credito_abonos').select('monto').eq('credito_id', creditoId),
  ])
  if (creditError) throw new Error(`Error al revisar crédito: ${creditError.message}`)
  if (abonosError) throw new Error(`Error al revisar abonos: ${abonosError.message}`)
  const total = (abonos || []).reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0)
  if (total >= Number(credit.total_neto || 0) && credit.estado === 'pendiente') {
    const { error: updateError } = await supabase
      .from('credito_creditos')
      .update({ estado: 'pagado', fecha_cumplimiento: new Date().toISOString().slice(0, 10) })
      .eq('id', creditoId)
    if (updateError) throw new Error(`Error al saldar crédito: ${updateError.message}`)
  }
}

export function totalAbonado(credit) {
  return (credit?.credito_abonos || []).reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0)
}

export function saldoPendiente(credit) {
  return Math.max(0, Number(credit?.total_neto || 0) - totalAbonado(credit))
}

export async function saveCredito(form, userName, id) {
  ensure()
  const items = (form.items || []).filter(x => x.producto_id)
  const total = items.reduce((sum, x) => sum + (Number(x.cantidad) || 0) * (Number(x.valor_neto) || 0), 0)
  const row = {
    beneficiario_nombre: form.beneficiario_nombre.trim(), beneficiario_rut: form.beneficiario_rut || null,
    beneficiario_telefono: form.beneficiario_telefono || null, beneficiario_direccion: form.beneficiario_direccion || null,
    beneficiario_comuna: form.beneficiario_comuna || null, es_apicultor_programa: !!form.es_apicultor_programa,
    fecha_entrega_productos: form.fecha_entrega_productos || null, fecha_limite_pago: form.fecha_limite_pago || null,
    representante_nombre: form.representante_nombre || null, representante_rut: form.representante_rut || null,
    total_neto: total, created_by: userName || null, updated_at: new Date().toISOString(),
  }
  const result = id
    ? await supabase.from('credito_creditos').update(row).eq('id', id).select().single()
    : await supabase.from('credito_creditos').insert(row).select().single()
  if (result.error) throw new Error(`Error al guardar crédito: ${result.error.message}`)
  const credit = result.data
  await supabase.from('credito_items').delete().eq('credito_id', credit.id)
  if (items.length) {
    const inserted = await supabase.from('credito_items').insert(items.map((x, i) => ({
      credito_id: credit.id, orden: i, proveedor_id: x.proveedor_id, proveedor_nombre: x.proveedor_nombre,
      producto_id: x.producto_id, producto_nombre: x.producto_nombre, cantidad: Number(x.cantidad) || 0,
      valor_neto: Number(x.valor_neto) || 0, total_neto: (Number(x.cantidad) || 0) * (Number(x.valor_neto) || 0),
    })))
    if (inserted.error) throw new Error(`Error al guardar detalle: ${inserted.error.message}`)
  }
  return credit
}

export async function updateCreditoEstado(id, estado) {
  ensure()
  const { error } = await supabase.from('credito_creditos').update({ estado, fecha_cumplimiento: new Date().toISOString().slice(0, 10) }).eq('id', id)
  if (error) throw new Error(`Error al actualizar crédito: ${error.message}`)
}

export function formatPesos(value) {
  return `$ ${Number(value || 0).toLocaleString('es-CL')}`
}
