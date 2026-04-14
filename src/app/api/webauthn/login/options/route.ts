import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  buildAuthenticationOptions,
  getWebAuthnCookieOptions,
  WEBAUTHN_LOGIN_COOKIE,
} from '@/lib/webauthn-server'

export async function POST(request: Request) {
  const options = await buildAuthenticationOptions({ request })

  const cookieStore = await cookies()
  cookieStore.set(
    WEBAUTHN_LOGIN_COOKIE,
    options.challenge,
    getWebAuthnCookieOptions(request)
  )

  return NextResponse.json(options)
}
