import { supabase, getAppVersion } from './supabase'

let checkDone = false
let isAuthorized = true

// Verifica si la versión de la app está autorizada para acceder
export async function checkAppVersion() {
  if (checkDone) return isAuthorized
  checkDone = true

  if (!supabase) {
    console.warn('[VersionCheck] Supabase no configurado, permitiendo acceso local')
    return true
  }

  const version = getAppVersion()
  console.log(`[VersionCheck] Verificando versión ${version}...`)

  try {
    const { data, error } = await supabase
      .from('app_versions')
      .select('is_active')
      .eq('version', version)
      .single()

    if (error) {
      console.error('[VersionCheck] Error al verificar versión:', error)
      // Si la tabla no existe aún, permitimos acceso temporalmente
      if (error.code === '42P01') {
        console.warn('[VersionCheck] Tabla app_versions no existe aún, permitiendo acceso')
        return true
      }
      return false
    }

    isAuthorized = data?.is_active === true

    if (!isAuthorized) {
      console.error(`[VersionCheck] Versión ${version} NO está autorizada`)
      // Mostrar mensaje al usuario
      if (typeof window !== 'undefined') {
        alert(
          '❌ VERSIÓN OBSOLETA\n\n' +
          'Esta versión de la app ya no está autorizada.\n\n' +
          'Por favor, cierre esta versión y use la versión nueva:\n' +
          'https://pap-apicola.vercel.app\n\n' +
          'La versión antigua no puede modificar ni borrar datos.'
        )
        // Redirigir a la nueva versión
        window.location.href = 'https://pap-apicola.vercel.app'
      }
    } else {
      console.log(`[VersionCheck] Versión ${version} autorizada ✓`)
    }

    return isAuthorized
  } catch (err) {
    console.error('[VersionCheck] Error inesperado:', err)
    return false
  }
}

export function getAuthorizationStatus() {
  return isAuthorized
}
