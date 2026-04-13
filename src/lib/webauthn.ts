export type WebAuthnCredentialRecord = {
  id: string
  user_id: string
  credential_id: string
  public_key: string
  counter: number
  device_name: string | null
  transports: string[] | null
  device_type: string | null
  backed_up: boolean
  last_used_at: string | null
  created_at: string
}

export function isWebAuthnAvailable() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'PublicKeyCredential' in window
  )
}

export function formatPasskeyName(
  credential: Pick<WebAuthnCredentialRecord, 'device_name' | 'created_at'>,
  index: number
) {
  return credential.device_name?.trim() || `Passkey ${index + 1}`
}
