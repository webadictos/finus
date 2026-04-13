import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildRegistrationOptions,
  getWebAuthnCookieOptions,
  WEBAUTHN_REG_COOKIE,
} from '@/lib/webauthn-server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: existingCredentials, error } = await supabase
    .from('webauthn_credentials')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const options = await buildRegistrationOptions({
    request,
    userId: user.id,
    userEmail: user.email,
    userDisplayName:
      (user.user_metadata?.nombre as string | undefined) ?? user.email.split('@')[0],
    existingCredentials: existingCredentials ?? [],
  })

  const cookieStore = await cookies()
  cookieStore.set(
    WEBAUTHN_REG_COOKIE,
    options.challenge,
    getWebAuthnCookieOptions(request)
  )

  return NextResponse.json(options)
}
