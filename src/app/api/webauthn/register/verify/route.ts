import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { createClient } from '@/lib/supabase/server'
import {
  getWebAuthnCookieOptions,
  verifyRegistration,
  WEBAUTHN_REG_COOKIE,
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
  const expectedChallenge = cookieStore.get(WEBAUTHN_REG_COOKIE)?.value
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Sesión de registro expirada' }, { status: 400 })
  }

  const body = (await request.json()) as {
    response?: RegistrationResponseJSON
    deviceName?: string
  }

  if (!body.response) {
    return NextResponse.json({ error: 'Respuesta de registro inválida' }, { status: 400 })
  }

  const registration = await verifyRegistration({
    request,
    response: body.response,
    expectedChallenge,
  })

  cookieStore.set(WEBAUTHN_REG_COOKIE, '', {
    ...getWebAuthnCookieOptions(request),
    maxAge: 0,
  })

  if (!registration) {
    return NextResponse.json({ error: 'No se pudo verificar la passkey' }, { status: 400 })
  }

  const { error } = await supabase.from('webauthn_credentials').insert({
    user_id: user.id,
    credential_id: registration.credentialId,
    public_key: registration.publicKey,
    counter: registration.counter,
    device_name: body.deviceName?.trim() || null,
    transports: registration.transports,
    device_type: registration.deviceType,
    backed_up: registration.backedUp,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
