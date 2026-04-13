import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { createClient } from '@/lib/supabase/server'
import {
  getWebAuthnCookieOptions,
  verifyAuthentication,
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

  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get(WEBAUTHN_AUTH_COOKIE)?.value
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Sesión de autenticación expirada' }, { status: 400 })
  }

  const body = (await request.json()) as {
    response?: AuthenticationResponseJSON
  }

  if (!body.response) {
    return NextResponse.json({ error: 'Respuesta de autenticación inválida' }, { status: 400 })
  }

  const credentialId = body.response.id
  const { data: credential, error: credentialError } = await supabase
    .from('webauthn_credentials')
    .select('*')
    .eq('user_id', user.id)
    .eq('credential_id', credentialId)
    .maybeSingle()

  if (credentialError) {
    return NextResponse.json({ error: credentialError.message }, { status: 400 })
  }

  if (!credential) {
    return NextResponse.json({ error: 'Passkey no reconocida' }, { status: 404 })
  }

  const authentication = await verifyAuthentication({
    request,
    response: body.response,
    expectedChallenge,
    credential,
  })

  cookieStore.set(WEBAUTHN_AUTH_COOKIE, '', {
    ...getWebAuthnCookieOptions(request),
    maxAge: 0,
  })

  if (!authentication) {
    return NextResponse.json({ error: 'No se pudo verificar la passkey' }, { status: 400 })
  }

  const { error } = await supabase
    .from('webauthn_credentials')
    .update({
      counter: authentication.newCounter,
      device_type: authentication.deviceType,
      backed_up: authentication.backedUp,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', credential.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
