import { supabase } from './supabase'

const SESSION_KEY = 'pap_session'
const SALT = 'PAPApicola2024'

async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(SALT + password + SALT)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function login(email, password, remember) {
  const hash = await hashPassword(password)
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('password_hash', hash)
    .single()

  if (error || !data) throw new Error('Usuario o contraseña incorrectos')
  if (!data.activo) throw new Error('Tu cuenta está pendiente de aprobación por el administrador')

  const session = {
    id: data.id, email: data.email, nombre: data.nombre, rol: data.rol,
    puede_crear: data.puede_crear, puede_editar: data.puede_editar,
    puede_eliminar: data.puede_eliminar, puede_exportar: data.puede_exportar,
  }
  if (remember) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
  return session
}

export async function register(email, password, nombre) {
  const hash = await hashPassword(password)
  const { error } = await supabase
    .from('app_users')
    .insert({ email: email.toLowerCase().trim(), password_hash: hash, nombre, rol: 'user', activo: false })

  if (error) {
    if (error.code === '23505') throw new Error('Ese correo ya está registrado')
    throw new Error('Error al registrar: ' + error.message)
  }
}

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

export async function getUsuarios() {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, email, nombre, rol, activo, puede_crear, puede_editar, puede_eliminar, puede_exportar, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateUsuario(id, changes) {
  const { error } = await supabase
    .from('app_users')
    .update(changes)
    .eq('id', id)
  if (error) throw error
}
