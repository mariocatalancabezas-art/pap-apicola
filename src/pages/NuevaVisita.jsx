import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, ChevronLeft, GitFork, FileSpreadsheet, Printer, Search, User } from 'lucide-react'
import { db, SYNC_STATUS, generateUUID } from '../lib/db'
import { syncAll } from '../lib/sync'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import HelpTooltip from '../components/HelpTooltip'
import BreachasModal from '../components/BreachasModal'
import { exportVisitaExcel, exportVisitaPDF, printVisitaPDF } from '../lib/exports'
import { REGIONES_CHILE, TIPOS_PC, NIVELES, TIPOS_ESTANDAR, PROGRAMAS_INDAP } from '../lib/fieldDescriptions'
import { buscarApicultoresPorNombre } from '../lib/importApicultores'

function SectionTitle({ letter, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-honey-500 text-white text-xs font-bold flex items-center justify-center">{letter}</span>
      <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">{title}</h3>
    </div>
  )
}

function FieldLabel({ num, text, required, align }) {
  return (
    <label className="label flex items-center gap-0.5" onClick={e => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'svg' || e.target.tagName === 'circle' || e.target.tagName === 'path') return; if (e.target.tagName === 'LABEL' || e.target.tagName === 'SPAN') e.preventDefault() }}>
      <span className="text-xs text-honey-600 font-bold mr-1">#{num}</span>
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
      <HelpTooltip fieldNum={num} align={align} />
    </label>
  )
}

const PC_FIELDS = [
  { desc: 'f79_pc1', tipo: 'f84_tipo_pc1' },
  { desc: 'f80_pc2', tipo: 'f85_tipo_pc2' },
  { desc: 'f81_pc3', tipo: 'f86_tipo_pc3' },
  { desc: 'f82_pc4', tipo: 'f87_tipo_pc4' },
  { desc: 'f83_pc5', tipo: 'f88_tipo_pc5' },
]

const PC_OPCIONES = [
  { desc: 'Bajo rendimiento por colmena',            tipo: 'Productividad' },
  { desc: 'Mala Calidad en el envasado de la Miel',  tipo: 'Inocuidad' },
  { desc: 'Alta mortalidad en Colmenas',             tipo: 'Productividad' },
  { desc: 'Falta infraestructura',                   tipo: 'Acceso al Mercado' },
  { desc: 'No cumple con requisitos SAG',            tipo: 'Acceso al Mercado' },
  { desc: 'Falta conocimiento y apoyo contable',     tipo: 'Acceso al Mercado' },
  { desc: 'Falta formalizacion SII',                 tipo: 'Acceso al Mercado' },
]

const EMPTY_FORM = {
  f1_nombre: '', f2_apellido: '', f3_rut: '', f4_telefono: '', f5_email: '',
  f6_region: 'Biobío', f7_comuna: '', f8_area_indap: 'Santa Barbara', f9_dir_propiedad: '', f10_dir_predio: '',
  f11_fecha_nacimiento: '', f12_genero: '', f13_pueblo_originario: '', f14_nivel_educacional: '',
  f15_poder_comprador: 'Apicola Santa Barbara Spa', f16_rubro_negocio: 'Apicultura, Miel', f17_unidad_operativa: 'UO Apicola Santa Barbara', f18_programa_indap: '',
  f19_fecha_encuesta: new Date().toISOString().slice(0, 10), f20_numero_encuesta: '',
  f21_iniciacion_actividades: '', f22_tipo_tributacion: '', f23_habilitado_poder_comprador: '',
  f24_especie_principal: 'Miel', f25_variedad_raza_e1: '', f26_epoca_cosecha_e1: 'Diciembre-Mayo',
  f27_tipo_manejo_e1: 'Convencional', f28_certificacion_e1: '',
  f29_colmenas_2023_e1: '', f30_colmenas_2024_e1: '',
  f31_cant_producida_2023_e1: '', f32_cant_producida_2024_e1: '',
  f33_cant_vendida_2023_e1: '', f34_cant_vendida_2024_e1: '',
  f35_unidad_2023_e1: 'KG', f36_unidad_2024_e1: 'KG',
  f37_monto_vendido_2023_e1: '', f38_monto_vendido_2024_e1: '',
  f39_especie_secundaria: '', f40_variedad_raza_e2: '', f41_epoca_cosecha_e2: '',
  f42_tipo_manejo_e2: '', f43_certificacion_e2: '',
  f44_colmenas_2023_e2: '', f45_colmenas_2024_e2: '',
  f46_cant_producida_2023_e2: '', f47_cant_producida_2024_e2: '',
  f48_cant_vendida_2023_e2: '', f49_cant_vendida_2024_e2: '',
  f50_unidad_e2: 'KG',
  f52_monto_vendido_2023_e2: '', f53_monto_vendido_2024_e2: '',
  f64_ingresos_totales: '', f65_costo_produccion: '', f66_margen_bruto: '',
  f67_estandar1: 'Registro Sag', f68_estandar2: 'Ramex, Sala Autorizada', f69_estandar3: 'Inicio Actividades',
  f70_tipo_estandar1: 'Productividad', f71_tipo_estandar2: 'Productividad', f72_tipo_estandar3: 'Comercial',
  f73_cumple_estandar1: '', f74_cumple_estandar2: '', f75_cumple_estandar3: '',
  f76_nivel_comercial: '', f77_nivel_productivo: '', f78_nivel_calidad: '',
  f79_pc1: '', f80_pc2: '', f81_pc3: '', f82_pc4: '', f83_pc5: '',
  f84_tipo_pc1: '', f85_tipo_pc2: '', f86_tipo_pc3: '', f87_tipo_pc4: '', f88_tipo_pc5: '',
  f89_solucion_pc1: '', f90_solucion_pc2: '', f91_solucion_pc3: '', f92_solucion_pc4: '', f93_solucion_pc5: '',
  f94_inversion_pc1: '', f95_inversion_pc2: '', f96_inversion_pc3: '', f97_inversion_pc4: '', f98_inversion_pc5: '',
  f99_no_encuesto: '0', f100_notas: '',
  nombre_encuestador: '',
  brechas_pc1: '', brechas_tipo_pc1: '', brechas_solucion_pc1: '', brechas_inversion_pc1: '',
  brechas_pc2: '', brechas_tipo_pc2: '', brechas_solucion_pc2: '', brechas_inversion_pc2: '',
  brechas_pc3: '', brechas_tipo_pc3: '', brechas_solucion_pc3: '', brechas_inversion_pc3: '',
  brechas_pc4: '', brechas_tipo_pc4: '', brechas_solucion_pc4: '', brechas_inversion_pc4: '',
  brechas_pc5: '', brechas_tipo_pc5: '', brechas_solucion_pc5: '', brechas_inversion_pc5: '',
  brechas_nota: '',
}

export default function NuevaVisita() {
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showBrechas, setShowBrechas] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  
  // Estados para búsqueda de apicultores
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    async function initNumero() {
      const all = await db.visitas.toArray()
      const nums = all
        .map(v => parseInt(v.f20_numero_encuesta, 10))
        .filter(n => !isNaN(n))
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
      setForm(f => ({ ...f, f20_numero_encuesta: String(next) }))
    }
    initNumero()
  }, [])

  const TEXT_CAPITALIZE = new Set([
    'f1_nombre','f2_apellido','f7_comuna','f8_area_indap',
    'f9_dir_propiedad','f10_dir_predio','f15_poder_comprador',
    'f16_rubro_negocio','f17_unidad_operativa','f24_especie_principal',
    'f25_variedad_raza_e1','f39_especie_secundaria','f40_variedad_raza_e2',
    'f67_estandar1','f68_estandar2','f69_estandar3',
    'f79_pc1','f80_pc2','f81_pc3','f82_pc4','f83_pc5',
    'f89_solucion_pc1','f90_solucion_pc2','f91_solucion_pc3','f92_solucion_pc4','f93_solucion_pc4',
    'f100_notas','nombre_encuestador',
  ])

  function capFirst(str) {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  function formatRut(raw) {
    const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
    if (clean.length === 0) return ''
    const dv = clean.slice(-1)
    const num = clean.slice(0, -1)
    if (num.length === 0) return dv
    const formatted = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return formatted + '-' + dv
  }

  function set(name, value) {
    setForm(f => ({ ...f, [name]: value }))
  }
  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'f3_rut') { set(name, formatRut(value)); return }
    set(name, TEXT_CAPITALIZE.has(name) ? capFirst(value) : value)
  }

  function handlePcDescChange(val, i) {
    const found = PC_OPCIONES.find(o => o.desc === val)
    const fields = PC_FIELDS[i - 1]
    setForm(f => ({
      ...f,
      [fields.desc]: val,
      ...(found ? { [fields.tipo]: found.tipo } : {}),
    }))
  }

  function calcMargen() {
    const ingRaw = form.f64_ingresos_totales
    const cosRaw = form.f65_costo_produccion
    const ing = parseFloat(ingRaw) || 0
    const cos = parseFloat(cosRaw) || 0
    if (!ingRaw && !cosRaw) { set('f66_margen_bruto', ''); return }
    if (ing === 0 && cos === 0) { set('f66_margen_bruto', ''); return }
    set('f66_margen_bruto', String(ing - cos))
  }

  // Función de búsqueda con debounce
  useEffect(() => {
    if (searchQuery.length < 4) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const results = await buscarApicultoresPorNombre(searchQuery)
        setSearchResults(results)
        setShowSearchResults(results.length > 0)
      } catch (err) {
        console.error('Error buscando apicultores:', err)
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Función para seleccionar apicultor y rellenar campos
  function seleccionarApicultor(apicultor) {
    setForm(prev => ({
      ...prev,
      f1_nombre: apicultor.nombres || '',
      f2_apellido: apicultor.apellidos || '',
      f3_rut: apicultor.rut || '',
      f4_telefono: apicultor.telefono || '',
      f7_comuna: apicultor.comuna || '',
      f9_dir_propiedad: apicultor.direccion || '',
      f18_programa_indap: apicultor.programa_indap || '',
    }))
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  async function saveData(andClose = false) {
    if (!form.f1_nombre.trim()) return alert('El nombre del productor es obligatorio')
    setSaving(true)
    const now = new Date().toISOString()
    try {
      await db.visitas.add({
        uuid: generateUUID(),
        ...form,
        sync_status: SYNC_STATUS.PENDING,
        created_at: now,
        updated_at: now,
      })
      setSaved(true)
      if (isOnline) syncAll()
      if (andClose) setTimeout(() => navigate('/historial'), 1500)
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await saveData(true)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">Nuevo diagnóstico</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowBrechas(true)}
          className="flex items-center gap-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          <GitFork className="w-4 h-4" />
          Brechas del negocio
        </button>
      </div>

      {saved && (
        <div className="card bg-green-50 border-green-200 text-green-700 text-sm font-medium text-center">
          ✓ Diagnóstico guardado correctamente
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* === SECCIÓN A: ANTECEDENTES GENERALES === */}
        <div className="card space-y-3">
          <SectionTitle letter="A" title="Antecedentes Generales" />
          
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <FieldLabel num={1} text="Nombres" required />
              <div className="relative">
                <input 
                  name="f1_nombre" 
                  value={form.f1_nombre} 
                  onChange={e => {
                    handleChange(e)
                    setSearchQuery(e.target.value)
                  }}
                  className="input-field pr-10" 
                  required 
                  autoCapitalize="words"
                  placeholder="Escribe para buscar apicultor..."
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              {/* Resultados de búsqueda */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                  {searchResults.map((apicultor, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => seleccionarApicultor(apicultor)}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-gray-100 last:border-0 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {apicultor.nombre_completo}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          RUT: {apicultor.rut} · {apicultor.comuna}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {form.f1_nombre.length >= 4 && !searchLoading && searchResults.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No se encontraron apicultores</p>
              )}
            </div>
            <div>
              <FieldLabel num={2} text="Apellidos" />
              <input name="f2_apellido" value={form.f2_apellido} onChange={handleChange} className="input-field" autoCapitalize="words" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel num={3} text="RUT" />
              <input name="f3_rut" value={form.f3_rut} onChange={handleChange} className="input-field" placeholder="12.345.678-9" inputMode="numeric" />
            </div>
            <div>
              <FieldLabel num={4} text="Teléfono" />
              <input name="f4_telefono" value={form.f4_telefono} onChange={handleChange} className="input-field" placeholder="998832810" />
            </div>
          </div>
          <div>
            <FieldLabel num={5} text="Email" />
            <input
              type="email"
              name="f5_email"
              value={form.f5_email}
              onChange={handleChange}
              className="input-field"
              list="email-suggestions"
              placeholder="nombre@gmail.com"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <datalist id="email-suggestions">
              {form.f5_email && !form.f5_email.includes('@') && ['@gmail.com','@hotmail.com','@yahoo.com','@outlook.com'].map(d => (
                <option key={d} value={form.f5_email + d} />
              ))}
              {form.f5_email && form.f5_email.includes('@') && !form.f5_email.split('@')[1] && ['gmail.com','hotmail.com','yahoo.com','outlook.com'].map(d => (
                <option key={d} value={form.f5_email.split('@')[0] + '@' + d} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel num={6} text="Región" />
              <select name="f6_region" value={form.f6_region} onChange={handleChange} className="input-field">
                <option value="">— Seleccionar —</option>
                {REGIONES_CHILE.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel num={7} text="Comuna" />
              <input
                name="f7_comuna"
                value={form.f7_comuna}
                onChange={handleChange}
                className="input-field"
                list="comunas-list"
                placeholder="Seleccionar o escribir…"
                autoCapitalize="words"
              />
              <datalist id="comunas-list">
                <option value="Santa Barbara" />
                <option value="Quilaco" />
                <option value="Alto Bio Bio" />
              </datalist>
            </div>
          </div>
          <div>
            <FieldLabel num={8} text="Área INDAP donde se atiende" />
            <input name="f8_area_indap" value={form.f8_area_indap} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <FieldLabel num={9} text="Dirección Propiedad" />
            <input name="f9_dir_propiedad" value={form.f9_dir_propiedad} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <FieldLabel num={10} text="Dirección Predio Principal" />
            <input name="f10_dir_predio" value={form.f10_dir_predio} onChange={handleChange} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel num={11} text="Fecha de Nacimiento" />
              <input type="date" name="f11_fecha_nacimiento" value={form.f11_fecha_nacimiento} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <FieldLabel num={12} text="Género" />
              <select name="f12_genero" value={form.f12_genero} onChange={handleChange} className="input-field">
                <option value="">— Seleccionar —</option>
                <option>Hombre</option><option>Mujer</option>
                <option>No responde</option><option>No aplica</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel num={13} text="Pueblo Originario" />
              <input name="f13_pueblo_originario" value={form.f13_pueblo_originario} onChange={handleChange} className="input-field" placeholder="Mapuche, Aymará…" />
            </div>
            <div>
              <FieldLabel num={14} text="Nivel Educacional" />
              <select name="f14_nivel_educacional" value={form.f14_nivel_educacional} onChange={handleChange} className="input-field">
                <option value="">— Seleccionar —</option>
                <option>Ed. Básica</option><option>Ed. Media</option>
                <option>Técnico</option><option>Universitaria</option>
              </select>
            </div>
          </div>
          <div>
            <FieldLabel num={15} text="Poder Comprador (Empresa)" />
            <input name="f15_poder_comprador" value={form.f15_poder_comprador} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <FieldLabel num={16} text="Rubro o Negocio con Poder Comprador" />
            <input name="f16_rubro_negocio" value={form.f16_rubro_negocio} onChange={handleChange} className="input-field" placeholder="Miel, Frambuesa, Leche…" />
          </div>
          <div>
            <FieldLabel num={17} text="Unidad Operativa" />
            <input name="f17_unidad_operativa" value={form.f17_unidad_operativa} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <FieldLabel num={18} text="Programa que participa en INDAP" />
            <select name="f18_programa_indap" value={form.f18_programa_indap} onChange={handleChange} className="input-field">
              <option value="">— Seleccionar —</option>
              {PROGRAMAS_INDAP.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel num={19} text="Fecha Encuesta" required />
              <input type="date" name="f19_fecha_encuesta" value={form.f19_fecha_encuesta} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <FieldLabel num={20} text="Número Encuesta" />
              <input name="f20_numero_encuesta" value={form.f20_numero_encuesta} onChange={handleChange} className="input-field" />
            </div>
          </div>
        </div>

        {/* === SECCIÓN B: FORMALIZACIÓN DEL NEGOCIO === */}
        <div className="card space-y-3">
          <SectionTitle letter="B" title="Formalización del Negocio" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel num={21} text="¿Posee Iniciación de Actividades?" />
              <select name="f21_iniciacion_actividades" value={form.f21_iniciacion_actividades} onChange={handleChange} className="input-field">
                <option value="">—</option><option value="S">S (Sí)</option><option value="N">N (No)</option>
              </select>
            </div>
            <div>
              <FieldLabel num={22} text="Tipo de Tributación" />
              <select name="f22_tipo_tributacion" value={form.f22_tipo_tributacion} onChange={handleChange} className="input-field">
                <option value="">—</option><option>Presunta</option><option>Efectiva</option>
              </select>
            </div>
          </div>
          <div>
            <FieldLabel num={23} text="¿Habilitado para comercializar al Poder Comprador?" />
            <select name="f23_habilitado_poder_comprador" value={form.f23_habilitado_poder_comprador} onChange={handleChange} className="input-field">
              <option value="">—</option><option value="S">S (Sí)</option><option value="N">N (No)</option>
            </select>
          </div>
        </div>

        {/* === SECCIÓN C: SISTEMA PRODUCTIVO — ESPECIE PRINCIPAL === */}
        <div className="card space-y-3">
          <SectionTitle letter="C" title="Caracterización Sistema Productivo" />

          <p className="text-xs font-semibold text-honey-700 uppercase tracking-wide bg-honey-50 rounded px-2 py-1">Especie Principal (E1)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel num={24} text="Especie / Producto Principal" />
              <input name="f24_especie_principal" value={form.f24_especie_principal} onChange={handleChange} className="input-field" placeholder="Miel, Frambuesa…" />
            </div>
            <div>
              <FieldLabel num={25} text="Variedad / Raza" />
              <input name="f25_variedad_raza_e1" value={form.f25_variedad_raza_e1} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel num={26} text="Época de cosecha / venta" />
              <input name="f26_epoca_cosecha_e1" value={form.f26_epoca_cosecha_e1} onChange={handleChange} className="input-field" placeholder="Feb-Abr / Todo el año" />
            </div>
            <div>
              <FieldLabel num={27} text="Tipo de manejo" />
              <select name="f27_tipo_manejo_e1" value={form.f27_tipo_manejo_e1} onChange={handleChange} className="input-field">
                <option value="">—</option>
                <option>Convencional</option><option>Orgánico</option>
                <option>Producción Integral</option><option>Biodinámico</option><option>Natural</option>
              </select>
            </div>
          </div>
          <div>
            <FieldLabel num={28} text="Certificación" />
            <input name="f28_certificacion_e1" value={form.f28_certificacion_e1} onChange={handleChange} className="input-field" placeholder="Global GAP, Orgánico…" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-honey-100">
                  <th className="text-left p-2 font-semibold text-gray-600 border border-honey-200">Temporada</th>
                  <th className="p-2 font-semibold text-gray-600 border border-honey-200">
                    <span className="flex items-center justify-center gap-1">Sup./Colmenas <HelpTooltip fieldNum={29} /></span>
                  </th>
                  <th className="p-2 font-semibold text-gray-600 border border-honey-200">
                    <span className="flex items-center justify-center gap-1">Cant. Producida <HelpTooltip fieldNum={31} /></span>
                  </th>
                  <th className="p-2 font-semibold text-gray-600 border border-honey-200">
                    <span className="flex items-center justify-center gap-1">Cant. Vendida PC <HelpTooltip fieldNum={33} /></span>
                  </th>
                  <th className="p-2 font-semibold text-gray-600 border border-honey-200">
                    <span className="flex items-center justify-center gap-1">Unidad <HelpTooltip fieldNum={35} /></span>
                  </th>
                  <th className="p-2 font-semibold text-gray-600 border border-honey-200">
                    <span className="flex items-center justify-center gap-1">Monto Vendido PC ($) <HelpTooltip fieldNum={37} align="left" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1.5 border border-honey-100 text-gray-500 text-xs whitespace-nowrap">2023 / 2023-24</td>
                  <td className="p-1 border border-honey-100"><input name="f29_colmenas_2023_e1" value={form.f29_colmenas_2023_e1} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f31_cant_producida_2023_e1" value={form.f31_cant_producida_2023_e1} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f33_cant_vendida_2023_e1" value={form.f33_cant_vendida_2023_e1} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f35_unidad_2023_e1" value={form.f35_unidad_2023_e1} onChange={handleChange} className="input-field text-xs py-1" placeholder="KG" /></td>
                  <td className="p-1 border border-honey-100"><input name="f37_monto_vendido_2023_e1" value={form.f37_monto_vendido_2023_e1} onChange={handleChange} className="input-field text-xs py-1" /></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-1.5 border border-honey-100 text-gray-500 text-xs whitespace-nowrap">2024 / 2024-25</td>
                  <td className="p-1 border border-honey-100"><input name="f30_colmenas_2024_e1" value={form.f30_colmenas_2024_e1} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f32_cant_producida_2024_e1" value={form.f32_cant_producida_2024_e1} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f34_cant_vendida_2024_e1" value={form.f34_cant_vendida_2024_e1} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f36_unidad_2024_e1" value={form.f36_unidad_2024_e1} onChange={handleChange} className="input-field text-xs py-1" placeholder="KG" /></td>
                  <td className="p-1 border border-honey-100"><input name="f38_monto_vendido_2024_e1" value={form.f38_monto_vendido_2024_e1} onChange={handleChange} className="input-field text-xs py-1" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs font-semibold text-honey-700 uppercase tracking-wide bg-honey-50 rounded px-2 py-1 mt-2">Especie Secundaria (E2)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel num={39} text="Especie / Producto Secundario" />
              <input name="f39_especie_secundaria" value={form.f39_especie_secundaria} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <FieldLabel num={40} text="Variedad / Raza" />
              <input name="f40_variedad_raza_e2" value={form.f40_variedad_raza_e2} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel num={41} text="Época de cosecha / venta" />
              <input name="f41_epoca_cosecha_e2" value={form.f41_epoca_cosecha_e2} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <FieldLabel num={42} text="Tipo de manejo" />
              <select name="f42_tipo_manejo_e2" value={form.f42_tipo_manejo_e2} onChange={handleChange} className="input-field">
                <option value="">—</option>
                <option>Convencional</option><option>Orgánico</option>
                <option>Producción Integral</option><option>Biodinámico</option><option>Natural</option>
              </select>
            </div>
          </div>
          <div>
            <FieldLabel num={43} text="Certificación E2" />
            <input name="f43_certificacion_e2" value={form.f43_certificacion_e2} onChange={handleChange} className="input-field" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-honey-100">
                  <th className="text-left p-2 font-semibold text-gray-600 border border-honey-200">Temporada</th>
                  <th className="p-2 font-semibold text-gray-600 border border-honey-200">Sup./Colmenas</th>
                  <th className="p-2 font-semibold text-gray-600 border border-honey-200">Cant. Producida</th>
                  <th className="p-2 font-semibold text-gray-600 border border-honey-200">Cant. Vendida PC</th>
                  <th className="p-2 font-semibold text-gray-600 border border-honey-200">Unidad</th>
                  <th className="p-2 font-semibold text-gray-600 border border-honey-200">Monto Vendido PC ($)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1.5 border border-honey-100 text-gray-500 text-xs whitespace-nowrap">2023 / 2023-24</td>
                  <td className="p-1 border border-honey-100"><input name="f44_colmenas_2023_e2" value={form.f44_colmenas_2023_e2} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f46_cant_producida_2023_e2" value={form.f46_cant_producida_2023_e2} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f48_cant_vendida_2023_e2" value={form.f48_cant_vendida_2023_e2} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f50_unidad_e2" value={form.f50_unidad_e2} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f52_monto_vendido_2023_e2" value={form.f52_monto_vendido_2023_e2} onChange={handleChange} className="input-field text-xs py-1" /></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-1.5 border border-honey-100 text-gray-500 text-xs whitespace-nowrap">2024 / 2024-25</td>
                  <td className="p-1 border border-honey-100"><input name="f45_colmenas_2024_e2" value={form.f45_colmenas_2024_e2} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f47_cant_producida_2024_e2" value={form.f47_cant_producida_2024_e2} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f49_cant_vendida_2024_e2" value={form.f49_cant_vendida_2024_e2} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f50_unidad_e2" value={form.f50_unidad_e2} onChange={handleChange} className="input-field text-xs py-1" /></td>
                  <td className="p-1 border border-honey-100"><input name="f53_monto_vendido_2024_e2" value={form.f53_monto_vendido_2024_e2} onChange={handleChange} className="input-field text-xs py-1" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide bg-gray-50 rounded px-2 py-1 mt-2">Resumen Negocio</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel num={64} text="Ingresos Totales ($)" />
              <input type="number" name="f64_ingresos_totales" value={form.f64_ingresos_totales} onChange={handleChange} onBlur={calcMargen} className="input-field" />
            </div>
            <div>
              <FieldLabel num={65} text="Costo de Producción ($)" />
              <input type="number" name="f65_costo_produccion" value={form.f65_costo_produccion} onChange={handleChange} onBlur={calcMargen} className="input-field" />
            </div>
            <div>
              <FieldLabel num={66} text="Margen Bruto ($)" />
              <input type="number" name="f66_margen_bruto" value={form.f66_margen_bruto} onChange={e => set('f66_margen_bruto', e.target.value)} className="input-field bg-gray-50" />
            </div>
          </div>
        </div>

        {/* === SECCIÓN D: ESTÁNDARES === */}
        <div className="card space-y-3">
          <SectionTitle letter="D" title="Cumplimiento de Estándares del Poder Comprador" />
          {[1,2,3].map(i => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-xs font-bold text-gray-600">Estándar {i}</p>
              <div>
                <FieldLabel num={66+i} text={`Descripción estándar ${i}`} />
                <input name={`f${66+i}_estandar${i}`} value={form[`f${66+i}_estandar${i}`]} onChange={handleChange} className="input-field" placeholder={`Estándar ${i}…`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel num={69+i} text="Tipo" />
                  <select name={`f${69+i}_tipo_estandar${i}`} value={form[`f${69+i}_tipo_estandar${i}`]} onChange={handleChange} className="input-field">
                    <option value="">—</option>
                    {TIPOS_ESTANDAR.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel num={72+i} text="¿Cumple?" />
                  <select name={`f${72+i}_cumple_estandar${i}`} value={form[`f${72+i}_cumple_estandar${i}`]} onChange={handleChange} className="input-field">
                    <option value="">—</option><option value="S">S (Sí)</option><option value="N">N (No)</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[{num:76, name:'f76_nivel_comercial', label:'Nivel Comercial'},{num:77, name:'f77_nivel_productivo', label:'Nivel Productivo'},{num:78, name:'f78_nivel_calidad', label:'Nivel Calidad'}].map(({num,name,label}) => (
              <div key={num}>
                <FieldLabel num={num} text={label} />
                <select name={name} value={form[name]} onChange={handleChange} className="input-field">
                  <option value="">—</option>
                  {NIVELES.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* === SECCIÓN E: PUNTOS CRÍTICOS === */}
        <div className="card space-y-3">
          <SectionTitle letter="E" title="Principales Puntos Críticos Detectados" />
          {[1,2,3,4,5].map(i => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
              <p className="text-xs font-bold text-gray-600">Punto Crítico {i}</p>
              <div>
                <FieldLabel num={78+i} text={`Descripción PC ${i}`} />
                <select
                  className="input-field"
                  value={PC_OPCIONES.find(o => o.desc === form[PC_FIELDS[i-1].desc]) ? form[PC_FIELDS[i-1].desc] : (form[PC_FIELDS[i-1].desc] ? '__otra__' : '')}
                  onChange={e => {
                    const val = e.target.value
                    if (val === '__otra__') {
                      setForm(f => ({ ...f, [PC_FIELDS[i-1].desc]: '__otra__', [PC_FIELDS[i-1].tipo]: '' }))
                    } else {
                      handlePcDescChange(val, i)
                    }
                  }}
                >
                  <option value="">-- Seleccionar --</option>
                  {PC_OPCIONES.map(o => (
                    <option key={o.desc} value={o.desc}>{o.desc}</option>
                  ))}
                  <option value="__otra__">Otra</option>
                </select>
                {form[PC_FIELDS[i-1].desc] === '__otra__' && (
                  <div className="mt-1">
                    <label className="label text-xs">Mencionar cuál</label>
                    <input
                      autoFocus
                      className="input-field"
                      placeholder="Describir punto crítico…"
                      autoCapitalize="sentences"
                      onChange={e => handlePcDescChange(e.target.value || '__otra__', i)}
                    />
                  </div>
                )}
                {form[PC_FIELDS[i-1].desc] && form[PC_FIELDS[i-1].desc] !== '__otra__' && !PC_OPCIONES.find(o => o.desc === form[PC_FIELDS[i-1].desc]) && (
                  <div className="mt-1">
                    <label className="label text-xs">Mencionar cuál</label>
                    <input
                      name={PC_FIELDS[i-1].desc}
                      value={form[PC_FIELDS[i-1].desc]}
                      onChange={e => handlePcDescChange(e.target.value, i)}
                      className="input-field"
                      autoCapitalize="sentences"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel num={83+i} text="Tipo PC" />
                  <select
                    name={PC_FIELDS[i-1].tipo}
                    value={TIPOS_PC.includes(form[PC_FIELDS[i-1].tipo]) || form[PC_FIELDS[i-1].tipo] === '' ? form[PC_FIELDS[i-1].tipo] : '__otro_tipo__'}
                    onChange={e => {
                      const val = e.target.value
                      if (val === '__otro_tipo__') {
                        setForm(f => ({ ...f, [PC_FIELDS[i-1].tipo]: '__otro_tipo__' }))
                      } else {
                        setForm(f => ({ ...f, [PC_FIELDS[i-1].tipo]: val }))
                      }
                    }}
                    className="input-field"
                  >
                    <option value="">—</option>
                    {TIPOS_PC.map(t => <option key={t}>{t}</option>)}
                    <option value="__otro_tipo__">Otro</option>
                  </select>
                  {(form[PC_FIELDS[i-1].tipo] === '__otro_tipo__' || (form[PC_FIELDS[i-1].tipo] && !TIPOS_PC.includes(form[PC_FIELDS[i-1].tipo]) && form[PC_FIELDS[i-1].tipo] !== '__otro_tipo__')) && (
                    <div className="mt-1">
                      <label className="label text-xs">Mencionar cuál</label>
                      <input
                        autoFocus
                        className="input-field"
                        placeholder="Describir tipo…"
                        value={form[PC_FIELDS[i-1].tipo] === '__otro_tipo__' ? '' : form[PC_FIELDS[i-1].tipo]}
                        onChange={e => setForm(f => ({ ...f, [PC_FIELDS[i-1].tipo]: e.target.value || '__otro_tipo__' }))}
                        autoCapitalize="sentences"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <FieldLabel num={93+i} text="¿Requiere inversión?" />
                  <input
                    name={`f${93+i}_inversion_pc${i}`}
                    value={form[`f${93+i}_inversion_pc${i}`]}
                    onChange={handleChange}
                    className="input-field"
                    list={`inversion-opciones-${i}`}
                    placeholder="Seleccionar o escribir…"
                  />
                  <datalist id={`inversion-opciones-${i}`}>
                    <option value="SI" />
                    <option value="NO" />
                    <option value="Si Infraestructura" />
                    <option value="Si Maquinaria" />
                  </datalist>
                </div>
              </div>
              <div>
                <FieldLabel num={88+i} text="Propuesta de solución" />
                <input
                  name={`f${88+i}_solucion_pc${i}`}
                  value={form[`f${88+i}_solucion_pc${i}`]}
                  onChange={handleChange}
                  className="input-field"
                  list={`solucion-opciones-${i}`}
                  placeholder="Seleccionar o escribir…"
                />
                <datalist id={`solucion-opciones-${i}`}>
                  <option value="Asesoria Tecnica" />
                  <option value="Credito" />
                  <option value="Capacitacion" />
                  <option value="Inversion" />
                </datalist>
              </div>
              {form[`f${88+i}_solucion_pc${i}`] === 'Inversion' && (
                <div>
                  <label className="label flex items-center gap-0.5">
                    <span className="text-xs text-honey-600 font-bold mr-1">↳</span>
                    Describir Inversión
                  </label>
                  <input
                    name={`f${93+i}_inversion_pc${i}`}
                    value={form[`f${93+i}_inversion_pc${i}`]}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Describe el tipo de inversión…"
                    autoCapitalize="sentences"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* === SECCIÓN F: OBSERVACIONES === */}
        <div className="card space-y-3">
          <SectionTitle letter="F" title="Observaciones" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label flex items-center gap-0.5 mb-1">
                <span className="text-xs text-honey-600 font-bold mr-1">#99</span>
                Encuesta
                <HelpTooltip fieldNum={99} />
              </div>
              <select name="f99_no_encuesto" value={form.f99_no_encuesto} onChange={handleChange} className="input-field">
                <option value="0">Fue encuestado</option>
                <option value="1">No entrega información</option>
                <option value="2">No estuvo ubicable</option>
                <option value="3">No posee información</option>
                <option value="4">Renunció al programa</option>
                <option value="5">Otro</option>
              </select>
            </div>
            <div>
              <label className="label">Nombre Encuestador</label>
              <input name="nombre_encuestador" value={form.nombre_encuestador} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div>
            <FieldLabel num={100} text="Notas" />
            <textarea name="f100_notas" value={form.f100_notas} onChange={handleChange} rows={4} className="input-field resize-none" placeholder="Observaciones del encuestador…" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowBrechas(true)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold py-3 rounded-lg transition-colors"
          >
            <GitFork className="w-4 h-4" />
            Brechas
          </button>
          <button
            type="button"
            onClick={() => exportVisitaExcel(form)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 font-semibold py-3 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => printVisitaPDF(form)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold py-3 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button type="button" disabled={saving} onClick={() => saveData(false)} className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold py-3 rounded-lg transition-colors">
            <Save className="w-5 h-5" />
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="submit" disabled={saving} className="flex-1 min-w-[140px] btn-primary flex items-center justify-center gap-2 py-3">
            <Save className="w-5 h-5" />
            {saving ? 'Guardando…' : 'Guardar y cerrar'}
          </button>
        </div>
      </form>

      {showBrechas && (
        <BreachasModal
          form={form}
          onChange={handleChange}
          onSave={() => saveData(false)}
          onClose={() => { saveData(false); setShowBrechas(false) }}
        />
      )}
    </div>
  )
}
