// Cliente unico de Supabase para el navegador.
// Aqui solo vive la llave publica (anon). La de OpenAI y la service role
// nunca salen de los secretos de Supabase.
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseListo = Boolean(url && anon)

if (!supabaseListo) {
  console.warn(
    'Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local.',
  )
}

export const supabase: SupabaseClient = createClient(url ?? '', anon ?? '', {
  auth: { persistSession: true, autoRefreshToken: true },
})

// Enfoca no pide correo ni contrasena para empezar: abre una sesion anonima.
// Requiere activar "Anonymous sign-ins" en Authentication > Sign In / Providers.
// El id de esa sesion es el persona_id en toda la base, y RLS lo usa para que
// nadie vea el perfil de nadie mas.
export async function sesionLista(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session
  const { data: nueva, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('No pude abrir la sesion anonima:', error.message)
    return null
  }
  return nueva.session ?? null
}

// Cuando la persona quiera conservar su avance en otro dispositivo,
// se vincula su correo a la misma cuenta anonima (no se pierde nada).
export async function vincularCorreo(email: string) {
  return await supabase.auth.updateUser({ email })
}
