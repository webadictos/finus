'use client'

import { startAuthentication } from '@simplewebauthn/browser'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Fingerprint, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import {
  clearIdleLockState,
  createIdleLockSessionId,
  createIdleLockState,
  getIdleLockTimeoutLabel,
  normalizeIdleLockTimeoutMinutes,
  readIdleLockState,
  writeIdleLockState,
  type IdleLockPersistedState,
} from '@/lib/idle-lock'
import { type WebAuthnCredentialRecord } from '@/lib/webauthn'

interface Props {
  email: string
  enabled: boolean
  timeoutMinutes: number
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(data.error || 'Ocurrió un error')
  }
  return data
}

export default function IdleLockOverlay({ email, enabled, timeoutMinutes }: Props) {
  const [supabase] = useState(() => createClient())
  const [isLocked, setIsLocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unlockMode, setUnlockMode] = useState<'passkey' | 'password'>('passkey')
  const [credentials, setCredentials] = useState<WebAuthnCredentialRecord[]>([])
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now())
  const [isForcingLogout, setIsForcingLogout] = useState(false)
  const [isAuthenticating, startTransition] = useTransition()
  const lastActivityRef = useRef(lastActivityAt)
  const persistedStateRef = useRef<IdleLockPersistedState>(createIdleLockState())
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const timeoutMs = normalizeIdleLockTimeoutMinutes(timeoutMinutes) * 60 * 1000

  const updatePersistedState = useCallback(
    (updater: (current: IdleLockPersistedState) => IdleLockPersistedState) => {
      const next = updater(persistedStateRef.current)
      persistedStateRef.current = next
      writeIdleLockState(next)
    },
    []
  )

  const loadCredentials = useCallback(async () => {
    const response = await fetch('/api/webauthn/credentials', {
      credentials: 'include',
      cache: 'no-store',
    })

    if (response.status === 401) {
      setCredentials([])
      return
    }

    const data = await parseJson<{ credentials: WebAuthnCredentialRecord[] }>(response)
    setCredentials(data.credentials)
  }, [])

  const forceLogout = useCallback(async () => {
    if (isForcingLogout) return

    setIsForcingLogout(true)
    clearIdleLockState()
    await supabase.auth.signOut()
    window.location.assign('/login')
  }, [isForcingLogout, supabase])

  const activateLock = useCallback(() => {
    const lockedAt = Date.now()
    const previousActivity = lastActivityRef.current

    setLastActivityAt(previousActivity)
    setIsLocked(true)
    setUnlockMode(credentials.length > 0 ? 'passkey' : 'password')
    setPassword('')
    setError(null)

    updatePersistedState((current) => ({
      ...current,
      lockedAt,
      lastActivityAt: previousActivity,
      lockSessionId: createIdleLockSessionId(),
      lockPresented: true,
    }))
  }, [credentials.length, updatePersistedState])

  const resetLockState = () => {
    const now = Date.now()
    lastActivityRef.current = now
    setLastActivityAt(now)
    setPassword('')
    setError(null)
    setIsLocked(false)

    updatePersistedState((current) => ({
      ...current,
      lockedAt: null,
      lastActivityAt: now,
      unlockVerifiedAt: now,
      lockSessionId: null,
      lockPresented: false,
    }))
  }

  useEffect(() => {
    if (!enabled) {
      clearIdleLockState()
      persistedStateRef.current = createIdleLockState()
      lastActivityRef.current = Date.now()
      setLastActivityAt(lastActivityRef.current)
      setIsLocked(false)
      setPassword('')
      setError(null)
      return
    }

    const persisted = readIdleLockState()
    const now = Date.now()

    if (persisted) {
      persistedStateRef.current = persisted
      lastActivityRef.current = persisted.lastActivityAt
      setLastActivityAt(persisted.lastActivityAt)

      if (
        persisted.lockPresented &&
        persisted.lockedAt &&
        (!persisted.unlockVerifiedAt || persisted.unlockVerifiedAt < persisted.lockedAt)
      ) {
        void forceLogout()
        return
      }

      if (now - persisted.lastActivityAt >= timeoutMs) {
        activateLock()
        return
      }
    } else {
      const initialState = createIdleLockState(now)
      persistedStateRef.current = initialState
      writeIdleLockState(initialState)
      lastActivityRef.current = now
      setLastActivityAt(now)
    }
  }, [activateLock, enabled, forceLogout, timeoutMs])

  useEffect(() => {
    if (!enabled || isForcingLogout) return

    const timeoutId = window.setTimeout(() => {
      void loadCredentials().catch(() => {
        setCredentials([])
      })
    }, 0)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadCredentials().catch(() => {
        setCredentials([])
      })
    })

    return () => {
      window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [enabled, isForcingLogout, loadCredentials, supabase])

  useEffect(() => {
    if (!enabled || isLocked || isForcingLogout) return

    const markActivity = () => {
      const now = Date.now()
      lastActivityRef.current = now
      setLastActivityAt(now)
      updatePersistedState((current) => ({
        ...current,
        lastActivityAt: now,
      }))
    }

    const checkForLock = () => {
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        activateLock()
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForLock()
      }
    }

    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
    ]

    for (const eventName of events) {
      window.addEventListener(eventName, markActivity, { passive: true })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', checkForLock)

    const intervalId = window.setInterval(() => {
      checkForLock()
    }, 15_000)

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, markActivity)
      }
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', checkForLock)
      window.clearInterval(intervalId)
    }
  }, [activateLock, enabled, isForcingLogout, isLocked, timeoutMs, updatePersistedState])

  useEffect(() => {
    if (!enabled || !isLocked || isForcingLogout) return

    const handlePointerGuard = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        void forceLogout()
        return
      }

      if (!overlayRef.current?.contains(target)) {
        void forceLogout()
      }
    }

    const handleFocusGuard = () => {
      const activeElement = document.activeElement
      if (activeElement instanceof Node && overlayRef.current?.contains(activeElement)) return
      void forceLogout()
    }

    const integrityId = window.setInterval(() => {
      if (!overlayRef.current?.isConnected) {
        void forceLogout()
      }
    }, 750)

    window.addEventListener('pointerdown', handlePointerGuard, true)
    document.addEventListener('focusin', handleFocusGuard)

    return () => {
      window.removeEventListener('pointerdown', handlePointerGuard, true)
      document.removeEventListener('focusin', handleFocusGuard)
      window.clearInterval(integrityId)
    }
  }, [enabled, forceLogout, isForcingLogout, isLocked])

  const handlePasskeyUnlock = () => {
    if (credentials.length === 0) {
      setError('No hay passkeys registradas para esta cuenta.')
      setUnlockMode('password')
      return
    }

    startTransition(async () => {
      setError(null)

      try {
        const optionsResponse = await fetch('/api/webauthn/authenticate/options', {
          method: 'POST',
          credentials: 'include',
        })
        const options = await parseJson<Parameters<typeof startAuthentication>[0]['optionsJSON']>(
          optionsResponse
        )

        const authenticationResponse = await startAuthentication({
          optionsJSON: options,
        })

        const verifyResponse = await fetch('/api/webauthn/authenticate/verify', {
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
        await loadCredentials()
        resetLockState()
      } catch (unlockError) {
        setError(
          unlockError instanceof Error
            ? unlockError.message
            : 'No se pudo verificar la passkey.'
        )
      }
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

      await loadCredentials().catch(() => undefined)
      resetLockState()
    })
  }

  if (!enabled || !isLocked) return null

  const lastActivityLabel = new Date(lastActivityAt).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      id="finus-idle-lock-overlay"
      ref={overlayRef}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/90 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
              <Lock className="size-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Finus bloqueado</h2>
              <p className="text-sm text-muted-foreground">
                Se bloqueó por {getIdleLockTimeoutLabel(timeoutMinutes)} de inactividad. Última actividad a las {lastActivityLabel}.
              </p>
            </div>
          </div>

          {credentials.length > 0 && (
            <div className="rounded-2xl border bg-muted/40 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <p className="text-sm font-medium">Desbloqueo biométrico disponible</p>
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
            {credentials.length > 0 && (
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
                  current === 'password' && credentials.length > 0 ? 'passkey' : 'password'
                )
              }
              disabled={isAuthenticating}
            >
              {unlockMode === 'password' && credentials.length > 0
                ? 'Usar passkey en su lugar'
                : 'Usar contraseña'}
            </Button>
          </div>

          {(unlockMode === 'password' || credentials.length === 0) && (
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
