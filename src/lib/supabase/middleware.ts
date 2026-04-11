import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Refresca la sesión de Supabase en cada request y propaga las cookies
 * actualizadas tanto en la request como en la response.
 *
 * Debe llamarse desde src/middleware.ts en cada ruta protegida.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Escribe en la request para que Server Components puedan leer
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Recrea la response con las cookies actualizadas
          supabaseResponse = NextResponse.next({ request })
          // Escribe en la response para que el navegador persista la sesión
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: No escribir código entre createServerClient y getUser.
  // Un error aquí puede causar que la sesión no se actualice correctamente.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
