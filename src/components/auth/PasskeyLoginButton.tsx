'use client'

import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Fingerprint } from 'lucide-react'
import { Button } from '@/components/ui/button'

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) {
    throw new Error('La respuesta del servidor llegó vacía.')
  }

  let data: (T & { error?: string }) | null = null
  try {
    data = JSON.parse(text) as T & { error?: string }
  } catch {
    throw new Error('La respuesta del servidor no fue JSON válido.')
  }

  if (!response.ok) {
    throw new Error(data.error || 'Ocurrió un error')
  }
  return data
}

export default function PasskeyLoginButton() {
  const router = useRouter()
  const [isSupported] = useState(
    () =>
      typeof window !== 'undefined' &&
      browserSupportsWebAuthn() &&
      window.isSecureContext
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isSupported) return null

  const handleLogin = () => {
    startTransition(async () => {
      setError(null)

      try {
        const optionsResponse = await fetch('/api/webauthn/login/options', {
          method: 'POST',
          credentials: 'include',
        })
        const options = await parseJson<Parameters<typeof startAuthentication>[0]['optionsJSON']>(
          optionsResponse
        )

        const authenticationResponse = await startAuthentication({
          optionsJSON: options,
        })

        const verifyResponse = await fetch('/api/webauthn/login/verify', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            response: authenticationResponse,
          }),
        })

        await parseJson<{ ok: true }>(verifyResponse)
        router.replace('/')
        router.refresh()
      } catch (loginError) {
        if (
          loginError instanceof Error &&
          (loginError.name === 'AbortError' || loginError.name === 'NotAllowedError')
        ) {
          setError('Autenticación con passkey cancelada.')
          return
        }

        setError(
          loginError instanceof Error
            ? loginError.message
            : 'No se pudo iniciar sesión con passkey.'
        )
      }
    })
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isPending}
        onClick={handleLogin}
      >
        <Fingerprint className="mr-2 size-4" />
        {isPending ? 'Verificando passkey…' : 'Entrar con passkey'}
      </Button>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}
