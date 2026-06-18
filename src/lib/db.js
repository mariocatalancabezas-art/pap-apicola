import Dexie from 'dexie'

export const db = new Dexie('PAPApicola')

db.version(5).stores({
  visitas: `++id, uuid, 
    f1_nombre, f2_apellido, f3_rut, f4_telefono, f5_email,
    f6_region, f7_comuna, f8_area_indap, f9_dir_propiedad, f10_dir_predio,
    f11_fecha_nacimiento, f12_genero, f13_pueblo_originario, f14_nivel_educacional,
    f15_poder_comprador, f16_rubro_negocio, f17_unidad_operativa, f18_programa_indap,
    f19_fecha_encuesta, f20_numero_encuesta,
    f21_iniciacion_actividades, f22_tipo_tributacion, f23_habilitado_poder_comprador,
    f24_especie_principal, f25_variedad_raza_e1, f26_epoca_cosecha_e1, f27_tipo_manejo_e1, f28_certificacion_e1,
    f29_colmenas_2023_e1, f30_colmenas_2024_e1,
    f31_cant_producida_2023_e1, f32_cant_producida_2024_e1,
    f33_cant_vendida_2023_e1, f34_cant_vendida_2024_e1,
    f35_unidad_2023_e1, f36_unidad_2024_e1,
    f37_monto_vendido_2023_e1, f38_monto_vendido_2024_e1,
    f39_especie_secundaria, f40_variedad_raza_e2, f41_epoca_cosecha_e2, f42_tipo_manejo_e2, f43_certificacion_e2,
    f44_colmenas_2023_e2, f45_colmenas_2024_e2,
    f46_cant_producida_2023_e2, f47_cant_producida_2024_e2,
    f48_cant_vendida_2023_e2, f49_cant_vendida_2024_e2,
    f50_unidad_e2,
    f52_monto_vendido_2023_e2, f53_monto_vendido_2024_e2,
    f64_ingresos_totales, f65_costo_produccion, f66_margen_bruto,
    f67_estandar1, f68_estandar2, f69_estandar3,
    f70_tipo_estandar1, f71_tipo_estandar2, f72_tipo_estandar3,
    f73_cumple_estandar1, f74_cumple_estandar2, f75_cumple_estandar3,
    f76_nivel_comercial, f77_nivel_productivo, f78_nivel_calidad,
    f79_pc1, f80_pc2, f81_pc3, f82_pc4, f83_pc5,
    f84_tipo_pc1, f85_tipo_pc2, f86_tipo_pc3, f87_tipo_pc4, f88_tipo_pc5,
    f89_solucion_pc1, f90_solucion_pc2, f91_solucion_pc3, f92_solucion_pc4, f93_solucion_pc5,
    f94_inversion_pc1, f95_inversion_pc2, f96_inversion_pc3, f97_inversion_pc4, f98_inversion_pc5,
    f99_no_encuesto, f100_notas,
    nombre_encuestador,
    brechas_pc1, brechas_tipo_pc1, brechas_solucion_pc1, brechas_inversion_pc1,
    brechas_pc2, brechas_tipo_pc2, brechas_solucion_pc2, brechas_inversion_pc2,
    brechas_pc3, brechas_tipo_pc3, brechas_solucion_pc3, brechas_inversion_pc3,
    brechas_pc4, brechas_tipo_pc4, brechas_solucion_pc4, brechas_inversion_pc4,
    brechas_pc5, brechas_tipo_pc5, brechas_solucion_pc5, brechas_inversion_pc5,
    brechas_nota,
    sync_status, created_at, updated_at, deleted_at`,
  sync_queue: '++id, table_name, record_uuid, operation, created_at',
  apicultores: '++id, nombre_completo, nombres, apellidos, rut, telefono, comuna, direccion, programa_indap',
})

export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  ERROR: 'error',
}

export function generateUUID() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
}
