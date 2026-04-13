'use client'

import { startRegistration } from '@simplewebauthn/browser'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Fingerprint, KeyRound, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  formatPasskeyName,
  isWebAuthnAvailable,
  type WebAuthnCredentialRecord,
} from '@/lib/webauthn'

type Notice = { tipo: 'ok' | 'error'; texto: string } | null

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Ocurrió un error')
  }
  return data
}

export default function PasskeysSection() {
  const [isSupported] = useState(() => isWebAuthnAvailable())
  const [credentials, setCredentials] = useState<WebAuthnCredentialRecord[]>([])
  const [notice, setNotice] = useState<Notice>(null)
  const [isPending, startTransition] = useTransition()

  const loadCredentials = useCallback(async () => {
    const response = await fetch('/api/webauthn/credentials', {
      credentials: 'include',
      cache: 'no-store',
    })
    const data = await parseJson<{ credentials: WebAuthnCredentialRecord[] }>(response)
    setCredentials(data.credentials)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCredentials().catch((error: unknown) => {
        setNotice({
          tipo: 'error',
          texto: error instanceof Error ? error.message : 'No se pudieron cargar las passkeys.',
        })
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadCredentials])

  const handleRegister = () => {
    startTransition(async () => {
      setNotice(null)

      try {
        const deviceName =
          window.prompt('Nombre para esta passkey', 'Este dispositivo')?.trim() ||
          'Este dispositivo'

        const optionsResponse = await fetch('/api/webauthn/register/options', {
          method: 'POST',
          credentials: 'include',
        })
        const options = await parseJson<Parameters<typeof startRegistration>[0]['optionsJSON']>(
          optionsResponse
        )

        const registrationResponse = await startRegistration({ optionsJSON: options })

        const verifyResponse = await fetch('/api/webauthn/register/verify', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            response: registrationResponse,
            deviceName,
          }),
        })

        await parseJson<{ ok: true }>(verifyResponse)
        await loadCredentials()
        setNotice({
          tipo: 'ok',
          texto: 'Passkey registrada. Ya puedes usarla para desbloquear Finus tras un periodo de inactividad.',
        })
      } catch (error) {
        setNotice({
          tipo: 'error',
          texto: error instanceof Error ? error.message : 'No se pudo registrar la passkey.',
        })
      }
    })
  }

  const handleDelete = (credentialId: string) => {
    startTransition(async () => {
      setNotice(null)

      try {
        const response = await fetch('/api/webauthn/credentials', {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credentialId }),
        })

        await parseJson<{ ok: true }>(response)
        await loadCredentials()
        setNotice({ tipo: 'ok', texto: 'Passkey eliminada.' })
      } catch (error) {
        setNotice({
          tipo: 'error',
          texto: error instanceof Error ? error.message : 'No se pudo eliminar la passkey.',
        })
      }
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Passkeys</h2>
        <p className="text-sm text-muted-foreground">
          Usa Face ID, Touch ID o PIN del dispositivo para reautenticarte sin salir de Finus.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                <Fingerprint className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Passkeys propias de Finus</p>
                <p className="text-sm text-muted-foreground">
                  {isSupported
                    ? 'Tu navegador soporta WebAuthn. Las passkeys se guardan como credenciales seguras asociadas a tu cuenta.'
                    : 'Este navegador o contexto no soporta WebAuthn. Necesitas HTTPS o localhost y un dispositivo compatible.'}
                </p>
              </div>
            </div>

            <Button onClick={handleRegister} disabled={!isSupported || isPending}>
              <KeyRound className="mr-2 size-4" />
              {isPending ? 'Registrando…' : 'Registrar passkey'}
            </Button>
          </div>

          <div className="rounded-xl border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            Passkeys registradas:{' '}
            <span className="font-medium text-foreground">{credentials.length}</span>
          </div>

          <div className="rounded-xl border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            Por ahora estas passkeys se usan para desbloqueo y reautenticación dentro de tu sesión.
          </div>

          {notice && (
            <p
              className={`rounded-md px-3 py-2 text-sm ${
                notice.tipo === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {notice.texto}
            </p>
          )}

          {credentials.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
              Todavía no registras ninguna passkey en esta cuenta.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {credentials.map((credential, index) => (
                <div
                  key={credential.id}
                  className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <p className="text-sm font-medium">
                        {formatPasskeyName(credential, index)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Registrada el {formatDate(credential.created_at)}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(credential.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
