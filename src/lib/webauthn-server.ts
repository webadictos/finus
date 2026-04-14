import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/server'
import type { WebAuthnCredentialRecord } from '@/lib/webauthn'

export const WEBAUTHN_REG_COOKIE = 'finus_webauthn_reg_challenge'
export const WEBAUTHN_AUTH_COOKIE = 'finus_webauthn_auth_challenge'
export const WEBAUTHN_LOGIN_COOKIE = 'finus_webauthn_login_challenge'

function toBase64Url(input: Uint8Array | ArrayBuffer) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  return Buffer.from(bytes).toString('base64url')
}

function fromBase64Url(input: string) {
  return new Uint8Array(Buffer.from(input, 'base64url'))
}

export function getWebAuthnOrigin(request: Request) {
  const url = new URL(request.url)
  const protocol = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host
  return `${protocol}://${host}`
}

export function getWebAuthnRpID(request: Request) {
  return new URL(getWebAuthnOrigin(request)).hostname
}

export function getWebAuthnCookieOptions(request: Request) {
  const secure = getWebAuthnOrigin(request).startsWith('https://')

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: 60 * 5,
  }
}

export async function buildRegistrationOptions(args: {
  request: Request
  userId: string
  userEmail: string
  userDisplayName: string
  existingCredentials: WebAuthnCredentialRecord[]
}) {
  const { request, userId, userEmail, userDisplayName, existingCredentials } = args

  return generateRegistrationOptions({
    rpName: 'Finus',
    rpID: getWebAuthnRpID(request),
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((credential) => ({
      id: credential.credential_id,
      transports: (credential.transports ?? undefined) as
        | AuthenticatorTransportFuture[]
        | undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  })
}

export async function verifyRegistration(args: {
  request: Request
  response: RegistrationResponseJSON
  expectedChallenge: string
}) {
  const { request, response, expectedChallenge } = args

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getWebAuthnOrigin(request),
    expectedRPID: getWebAuthnRpID(request),
    requireUserVerification: true,
  })

  if (!verification.verified || !verification.registrationInfo) {
    return null
  }

  const { credential, credentialBackedUp, credentialDeviceType } =
    verification.registrationInfo

  return {
    credentialId: credential.id,
    publicKey: toBase64Url(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? [],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  }
}

export async function buildAuthenticationOptions(args: {
  request: Request
  credentials?: WebAuthnCredentialRecord[]
}) {
  const { request, credentials } = args

  return generateAuthenticationOptions({
    rpID: getWebAuthnRpID(request),
    userVerification: 'required',
    allowCredentials: credentials?.map((credential) => ({
      id: credential.credential_id,
      transports: (credential.transports ?? undefined) as
        | AuthenticatorTransportFuture[]
        | undefined,
    })),
  })
}

export async function verifyAuthentication(args: {
  request: Request
  response: AuthenticationResponseJSON
  expectedChallenge: string
  credential: WebAuthnCredentialRecord
}) {
  const { request, response, expectedChallenge, credential } = args

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getWebAuthnOrigin(request),
    expectedRPID: getWebAuthnRpID(request),
    credential: {
      id: credential.credential_id,
      publicKey: fromBase64Url(credential.public_key),
      counter: credential.counter,
      transports: (credential.transports ?? undefined) as
        | AuthenticatorTransportFuture[]
        | undefined,
    },
    requireUserVerification: true,
  })

  if (!verification.verified) {
    return null
  }

  return {
    newCounter: verification.authenticationInfo.newCounter,
    deviceType: verification.authenticationInfo.credentialDeviceType,
    backedUp: verification.authenticationInfo.credentialBackedUp,
  }
}
