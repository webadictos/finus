import type { Factor } from '@supabase/auth-js'

export type WebAuthnFactor = Factor<'webauthn'>

export function isWebAuthnAvailable() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'PublicKeyCredential' in window
  )
}

export function getVerifiedWebAuthnFactors(factors: Factor[] | undefined) {
  return (factors ?? []).filter(
    (factor): factor is WebAuthnFactor =>
      factor.factor_type === 'webauthn' && factor.status === 'verified'
  )
}

export function formatPasskeyName(factor: WebAuthnFactor, index: number) {
  return factor.friendly_name?.trim() || `Passkey ${index + 1}`
}
