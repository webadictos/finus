'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Fingerprint, KeyRound, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  formatPasskeyName,
  getVerifiedWebAuthnFactors,
  isWebAuthnAvailable,
  type WebAuthnFactor,
} from '@/lib/webauthn'

type Notice = { tipo: 'ok' | 'error'; texto: string } | null

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function PasskeysSection() {
  const [supabase] = useState(() => createClient())
  const [isSupported] = useState(() => isWebAuthnAvailable())
  const [factors, setFactors] = useState<WebAuthnFactor[]>([])
  const [currentLevel, setCurrentLevel] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [isPending, startTransition] = useTransition()

  const loadFactors = useCallback(async () => {
    const [{ data: factorsData, error: factorsError }, { data: aalData, error: aalError }] =
      await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ])

    if (factorsError) {
      setNotice({ tipo: 'error', texto: factorsError.message })
      return
    }

    if (aalError) {
      setNotice({ tipo: 'error', texto: aalError.message })
      return
    }

    setFactors(getVerifiedWebAuthnFactors(factorsData?.all))
    setCurrentLevel(aalData?.currentLevel ?? null)
  }, [supabase])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadFactors()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadFactors])

  const handleRegister = () => {
    startTransition(async () => {
      setNotice(null)

      const friendlyName =
        window.prompt('Nombre para esta passkey', 'Este dispositivo')?.trim() ||
        'Este dispositivo'

      const { error } = await supabase.auth.mfa.webauthn.register({
        friendlyName,
      })

      if (error) {
        setNotice({ tipo: 'error', texto: error.message })
        return
      }

      await loadFactors()
      setNotice({
        tipo: 'ok',
        texto: 'Passkey registrada. Ya puedes usar Face ID, Touch ID o PIN para desbloquear Finus en este dispositivo.',
      })
    })
  }

  const handleDelete = (factorId: string) => {
    startTransition(async () => {
      setNotice(null)
      const { error } = await supabase.auth.mfa.unenroll({ factorId })

      if (error) {
        setNotice({ tipo: 'error', texto: error.message })
        return
      }

      await loadFactors()
      setNotice({ tipo: 'ok', texto: 'Passkey eliminada.' })
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
                <p className="text-sm font-medium">Desbloqueo biométrico</p>
                <p className="text-sm text-muted-foreground">
                  {isSupported
                    ? 'Tu navegador soporta WebAuthn. Puedes registrar una passkey para desbloqueo por inactividad.'
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
            Nivel de autenticación actual:{' '}
            <span className="font-medium text-foreground">
              {currentLevel?.toUpperCase() ?? 'AAL1'}
            </span>
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

          {factors.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
              Todavía no registras ninguna passkey en esta cuenta.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {factors.map((factor, index) => (
                <div
                  key={factor.id}
                  className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <p className="text-sm font-medium">
                        {formatPasskeyName(factor, index)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Registrada el {formatDate(factor.created_at)}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(factor.id)}
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
