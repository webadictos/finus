import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Cliente de Supabase para uso en el servidor (Server Components, Route Handlers).
 * Crea una nueva instancia por request — nunca reutilizar entre requests.
 *
 * En Server Components y Route Handlers solo se puede leer cookies,
 * no escribirlas. El middleware es quien actualiza la sesión.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // En Server Components no se pueden escribir cookies.
            // El middleware maneja la actualización de sesión.
          }
        },
      },
    }
  )
}
