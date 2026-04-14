import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  getWebAuthnCookieOptions,
  verifyAuthentication,
  WEBAUTHN_LOGIN_COOKIE,
} from '@/lib/webauthn-server'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get(WEBAUTHN_LOGIN_COOKIE)?.value

  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Sesión de autenticación expirada' }, { status: 400 })
  }

  const body = (await request.json()) as {
    response?: AuthenticationResponseJSON
  }

  if (!body.response) {
    return NextResponse.json({ error: 'Respuesta de autenticación inválida' }, { status: 400 })
  }

  const admin = createAdminClient()
  const sessionClient = await createClient()

  const { data: credential, error: credentialError } = await admin
    .from('webauthn_credentials')
    .select('*')
    .eq('credential_id', body.response.id)
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

  cookieStore.set(WEBAUTHN_LOGIN_COOKIE, '', {
    ...getWebAuthnCookieOptions(request),
    maxAge: 0,
  })

  if (!authentication) {
    return NextResponse.json({ error: 'No se pudo verificar la passkey' }, { status: 400 })
  }

  const [{ error: updateError }, { data: userData, error: userError }] = await Promise.all([
    admin
      .from('webauthn_credentials')
      .update({
        counter: authentication.newCounter,
        device_type: authentication.deviceType,
        backed_up: authentication.backedUp,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', credential.id),
    admin.auth.admin.getUserById(credential.user_id),
  ])

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: 'No se pudo resolver el usuario de la passkey' }, { status: 400 })
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
  })

  if (linkError || !linkData.properties.hashed_token) {
    return NextResponse.json(
      { error: linkError?.message ?? 'No se pudo generar la sesión con passkey' },
      { status: 400 }
    )
  }

  const { error: verifyError } = await sessionClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
