'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Dialog } from 'radix-ui'
import { LogOut, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PasskeysSection from '@/components/configuracion/PasskeysSection'
import {
  actualizarPerfil,
  actualizarPreferenciasSeguridad,
  cambiarPassword,
  resetearDatos,
} from '@/app/(dashboard)/configuracion/actions'
import { logoutAction } from '@/app/(auth)/actions'
import {
  getIdleLockTimeoutLabel,
  IDLE_LOCK_TIMEOUT_OPTIONS,
  normalizeIdleLockEnabled,
  normalizeIdleLockTimeoutMinutes,
} from '@/lib/idle-lock'
import { cn } from '@/lib/utils'

interface Props {
  nombre: string | null
  email: string
  idleLockEnabled: boolean
  idleLockTimeoutMinutes: number
}

export default function ConfiguracionClient({
  nombre,
  email,
  idleLockEnabled,
  idleLockTimeoutMinutes,
}: Props) {
  const router = useRouter()
  // ── Perfil ──────────────────────────────────────────────────────────────────
  const [nombreValue, setNombreValue] = useState(nombre ?? '')
  const [perfilMsg, setPerfilMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [perfilPending, startPerfilTransition] = useTransition()

  const handleGuardarPerfil = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPerfilMsg(null)
    const formData = new FormData(e.currentTarget)
    startPerfilTransition(async () => {
      const result = await actualizarPerfil(formData)
      if (result.error) {
        setPerfilMsg({ tipo: 'error', texto: result.error })
      } else {
        setPerfilMsg({ tipo: 'ok', texto: 'Perfil actualizado correctamente.' })
        router.refresh()
      }
    })
  }

  // ── Preferencias de seguridad ──────────────────────────────────────────────
  const [idleEnabledValue, setIdleEnabledValue] = useState(() =>
    normalizeIdleLockEnabled(idleLockEnabled)
  )
  const [idleTimeoutValue, setIdleTimeoutValue] = useState(() =>
    normalizeIdleLockTimeoutMinutes(idleLockTimeoutMinutes)
  )
  const [prefsMsg, setPrefsMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [prefsPending, startPrefsTransition] = useTransition()

  const handleGuardarPreferencias = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPrefsMsg(null)

    startPrefsTransition(async () => {
      const result = await actualizarPreferenciasSeguridad({
        idleLockEnabled: idleEnabledValue,
        idleLockTimeoutMinutes: idleTimeoutValue,
      })

      if (result.error) {
        setPrefsMsg({ tipo: 'error', texto: result.error })
      } else {
        setPrefsMsg({ tipo: 'ok', texto: 'Preferencias de inactividad actualizadas.' })
        router.refresh()
      }
    })
  }

  // ── Seguridad ────────────────────────────────────────────────────────────────
  const [passNueva, setPassNueva] = useState('')
  const [passConfirm, setPassConfirm] = useState('')
  const [passMsg, setPassMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [passPending, startPassTransition] = useTransition()

  const handleCambiarPassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPassMsg(null)

    if (passNueva.length < 8) {
      setPassMsg({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres.' })
      return
    }
    if (passNueva !== passConfirm) {
      setPassMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
      return
    }

    startPassTransition(async () => {
      const result = await cambiarPassword(passNueva)
      if (result.error) {
        setPassMsg({ tipo: 'error', texto: result.error })
      } else {
        setPassMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.' })
        setPassNueva('')
        setPassConfirm('')
      }
    })
  }

  // ── Reset ───────────────────────────────────────────────────────────────────
  const [resetOpen, setResetOpen] = useState(false)
  const [resetInput, setResetInput] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetPending, startResetTransition] = useTransition()

  const handleReset = () => {
    if (resetInput !== 'RESET') {
      setResetError('Escribe RESET exactamente para confirmar')
      return
    }
    setResetError(null)
    startResetTransition(async () => {
      const result = await resetearDatos()
      if (result.error) {
        setResetError(result.error)
      } else {
        setResetOpen(false)
        setResetInput('')
      }
    })
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  const [logoutPending, startLogoutTransition] = useTransition()

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      {/* ── Perfil ── */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Perfil</h2>
          <p className="text-sm text-muted-foreground">Tu información personal en Finus</p>
        </div>

        <form onSubmit={handleGuardarPerfil} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              type="text"
              value={nombreValue}
              onChange={(e) => setNombreValue(e.target.value)}
              placeholder="Tu nombre"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input value={email} disabled className="opacity-60 cursor-not-allowed" />
            <p className="text-xs text-muted-foreground">El email no se puede cambiar desde aquí</p>
          </div>

          {perfilMsg && (
            <p
              className={`rounded-md px-3 py-2 text-sm ${
                perfilMsg.tipo === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {perfilMsg.texto}
            </p>
          )}

          <Button type="submit" disabled={perfilPending} className="self-start">
            {perfilPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </section>

      <div className="border-t" />

      {/* ── Preferencias ── */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Bloqueo por inactividad</h2>
          <p className="text-sm text-muted-foreground">Protege Finus cuando dejas el dispositivo sin uso</p>
        </div>

        <form onSubmit={handleGuardarPreferencias} className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Pantalla por inactividad</p>
                <p className="text-sm text-muted-foreground">
                  Bloquea la app y pide passkey o contraseña después de un periodo sin actividad.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={idleEnabledValue}
                onClick={() => setIdleEnabledValue((current) => !current)}
                className={cn(
                  'relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors',
                  idleEnabledValue ? 'border-primary bg-primary' : 'border-border bg-muted'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                    idleEnabledValue ? 'translate-x-6' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="idle-timeout">Tiempo de bloqueo</Label>
            <select
              id="idle-timeout"
              value={idleTimeoutValue}
              onChange={(event) =>
                setIdleTimeoutValue(
                  normalizeIdleLockTimeoutMinutes(Number(event.target.value))
                )
              }
              disabled={!idleEnabledValue}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                !idleEnabledValue && 'cursor-not-allowed opacity-60'
              )}
            >
              {IDLE_LOCK_TIMEOUT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {getIdleLockTimeoutLabel(option)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Si desactivas el bloqueo, la app no mostrará la pantalla de inactividad.
            </p>
          </div>

          {prefsMsg && (
            <p
              className={`rounded-md px-3 py-2 text-sm ${
                prefsMsg.tipo === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {prefsMsg.texto}
            </p>
          )}

          <Button type="submit" disabled={prefsPending} className="self-start">
            {prefsPending ? 'Guardando…' : 'Guardar preferencias'}
          </Button>
        </form>
      </section>

      <div className="border-t" />

      {/* ── Seguridad ── */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Seguridad</h2>
          <p className="text-sm text-muted-foreground">Cambia tu contraseña de acceso</p>
        </div>

        <form onSubmit={handleCambiarPassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pass-nueva">Nueva contraseña</Label>
            <Input
              id="pass-nueva"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              value={passNueva}
              onChange={(e) => setPassNueva(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pass-confirm">Confirmar contraseña</Label>
            <Input
              id="pass-confirm"
              type="password"
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
              value={passConfirm}
              onChange={(e) => setPassConfirm(e.target.value)}
              required
            />
          </div>

          {passMsg && (
            <p
              className={`rounded-md px-3 py-2 text-sm ${
                passMsg.tipo === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {passMsg.texto}
            </p>
          )}

          <Button type="submit" disabled={passPending} className="self-start">
            {passPending ? 'Actualizando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </section>

      <div className="border-t" />

      <PasskeysSection />

      <div className="border-t" />

      {/* ── Danger Zone ── */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-destructive">Zona de riesgo</h2>
          <p className="text-sm text-muted-foreground">Acciones irreversibles — procede con cuidado</p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          {/* Cerrar sesión */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Cerrar sesión</p>
              <p className="text-xs text-muted-foreground">Salir de tu cuenta en este dispositivo</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={logoutPending}
              onClick={() =>
                startLogoutTransition(() => logoutAction())
              }
            >
              <LogOut className="size-3.5 mr-1.5" />
              {logoutPending ? 'Saliendo…' : 'Salir'}
            </Button>
          </div>

          <div className="border-t border-destructive/20" />

          {/* Restablecer datos */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Restablecer datos</p>
              <p className="text-xs text-muted-foreground">
                Desactiva todos tus compromisos, cuentas y tarjetas. No elimina el historial.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { setResetInput(''); setResetError(null); setResetOpen(true) }}
            >
              Restablecer
            </Button>
          </div>
        </div>
      </section>

      {/* ── Modal RESET ── */}
      <Dialog.Root open={resetOpen} onOpenChange={setResetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200"
            aria-describedby="reset-desc"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <Dialog.Title className="text-base font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                Restablecer todos los datos
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" className="-mt-1 shrink-0">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>

            <Dialog.Description id="reset-desc" className="text-sm text-muted-foreground mb-4">
              Esto desactivará todos tus compromisos, ingresos, cuentas, tarjetas y gastos previstos.
              Las transacciones históricas se conservan. <span className="font-semibold text-foreground">Esta acción no se puede deshacer.</span>
            </Dialog.Description>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-confirm">Escribe <span className="font-mono font-bold">RESET</span> para confirmar</Label>
                <Input
                  id="reset-confirm"
                  value={resetInput}
                  onChange={(e) => setResetInput(e.target.value)}
                  placeholder="RESET"
                  autoComplete="off"
                />
              </div>

              {resetError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {resetError}
                </p>
              )}

              <Button
                variant="destructive"
                className="w-full"
                onClick={handleReset}
                disabled={resetPending || resetInput !== 'RESET'}
              >
                {resetPending ? 'Restableciendo…' : 'Confirmar restablecimiento'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
