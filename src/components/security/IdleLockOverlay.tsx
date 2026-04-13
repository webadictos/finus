'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Fingerprint, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { formatPasskeyName, getVerifiedWebAuthnFactors, type WebAuthnFactor } from '@/lib/webauthn'

const IDLE_TIMEOUT_MS = 5 * 60 * 1000

interface Props {
  email: string
}

export default function IdleLockOverlay({ email }: Props) {
  const [supabase] = useState(() => createClient())
  const [isLocked, setIsLocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unlockMode, setUnlockMode] = useState<'passkey' | 'password'>('passkey')
  const [factors, setFactors] = useState<WebAuthnFactor[]>([])
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now())
  const [isAuthenticating, startTransition] = useTransition()
  const lastActivityRef = useRef(lastActivityAt)

  const loadFactors = useCallback(async () => {
    const { data, error: factorsError } = await supabase.auth.mfa.listFactors()
    if (factorsError) {
      setError(factorsError.message)
      return
    }

    setFactors(getVerifiedWebAuthnFactors(data?.all))
  }, [supabase])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadFactors()
    }, 0)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadFactors()
    })

    return () => {
      window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [loadFactors, supabase])

  useEffect(() => {
    if (isLocked) return

    const markActivity = () => {
      const now = Date.now()
      lastActivityRef.current = now
      setLastActivityAt(now)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markActivity()
      }
    }

    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
      'focus',
      'mousemove',
    ]

    for (const eventName of events) {
      window.addEventListener(eventName, markActivity, { passive: true })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const intervalId = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        setIsLocked(true)
        setUnlockMode(factors.length > 0 ? 'passkey' : 'password')
        setError(null)
      }
    }, 15_000)

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, markActivity)
      }
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearInterval(intervalId)
    }
  }, [factors.length, isLocked])

  const resetLockState = () => {
    const now = Date.now()
    lastActivityRef.current = now
    setLastActivityAt(now)
    setPassword('')
    setError(null)
    setIsLocked(false)
  }

  const handlePasskeyUnlock = () => {
    if (factors.length === 0) {
      setError('No hay passkeys registradas para esta cuenta.')
      setUnlockMode('password')
      return
    }

    startTransition(async () => {
      setError(null)
      const { error: authError } = await supabase.auth.mfa.webauthn.authenticate({
        factorId: factors[0].id,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      resetLockState()
    })
  }

  const handlePasswordUnlock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password) {
      setError('Escribe tu contraseña para desbloquear.')
      return
    }

    startTransition(async () => {
      setError(null)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      resetLockState()
    })
  }

  if (!isLocked) return null

  const lastActivityLabel = new Date(lastActivityAt).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/90 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
              <Lock className="size-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Finus bloqueado</h2>
              <p className="text-sm text-muted-foreground">
                Se bloqueó por 5 minutos de inactividad. Última actividad a las {lastActivityLabel}.
              </p>
            </div>
          </div>

          {factors.length > 0 && (
            <div className="rounded-2xl border bg-muted/40 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <p className="text-sm font-medium">
                  Passkey disponible: {formatPasskeyName(factors[0], 0)}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Usa Face ID, Touch ID o el PIN de tu dispositivo para volver a entrar.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            {factors.length > 0 && (
              <Button onClick={handlePasskeyUnlock} disabled={isAuthenticating}>
                <Fingerprint className="mr-2 size-4" />
                {isAuthenticating && unlockMode === 'passkey'
                  ? 'Verificando…'
                  : 'Desbloquear con passkey'}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() =>
                setUnlockMode((current) =>
                  current === 'password' && factors.length > 0 ? 'passkey' : 'password'
                )
              }
              disabled={isAuthenticating}
            >
              {unlockMode === 'password' && factors.length > 0
                ? 'Usar passkey en su lugar'
                : 'Usar contraseña'}
            </Button>
          </div>

          {(unlockMode === 'password' || factors.length === 0) && (
            <form onSubmit={handlePasswordUnlock} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="unlock-password">Contraseña</Label>
                <Input
                  id="unlock-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contraseña"
                />
              </div>

              <Button type="submit" disabled={isAuthenticating}>
                {isAuthenticating && unlockMode === 'password'
                  ? 'Verificando…'
                  : 'Desbloquear'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
