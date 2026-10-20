import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANONKEY || ''

// Header de versión para bloquear apps antiguas
const APP_VERSION = '2.0'

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'X-App-Version': APP_VERSION
        }
      }
    })
  : null

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

export function getAppVersion() {
  return APP_VERSION
}
