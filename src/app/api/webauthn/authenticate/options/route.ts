import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildAuthenticationOptions,
  getWebAuthnCookieOptions,
  WEBAUTHN_AUTH_COOKIE,
} from '@/lib/webauthn-server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: credentials, error } = await supabase
    .from('webauthn_credentials')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!credentials?.length) {
    return NextResponse.json({ error: 'No hay passkeys registradas' }, { status: 400 })
  }

  const options = await buildAuthenticationOptions({
    request,
    credentials,
  })

  const cookieStore = await cookies()
  cookieStore.set(
    WEBAUTHN_AUTH_COOKIE,
    options.challenge,
    getWebAuthnCookieOptions(request)
  )

  return NextResponse.json(options)
}
