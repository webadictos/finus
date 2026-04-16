export const IDLE_LOCK_STORAGE_KEY = 'finus_idle_lock_state'

export const DEFAULT_IDLE_LOCK_ENABLED = true
export const DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES = 5

export const IDLE_LOCK_TIMEOUT_OPTIONS = [1, 5, 10, 15, 30] as const

export type IdleLockTimeoutOption = (typeof IDLE_LOCK_TIMEOUT_OPTIONS)[number]

export type IdleLockPersistedState = {
  lockedAt: number | null
  lastActivityAt: number
  unlockVerifiedAt: number | null
  lockSessionId: string | null
  lockPresented: boolean
}

export function normalizeIdleLockEnabled(value?: boolean | null): boolean {
  return value ?? DEFAULT_IDLE_LOCK_ENABLED
}

export function normalizeIdleLockTimeoutMinutes(value?: number | null): IdleLockTimeoutOption {
  return IDLE_LOCK_TIMEOUT_OPTIONS.includes(value as IdleLockTimeoutOption)
    ? (value as IdleLockTimeoutOption)
    : DEFAULT_IDLE_LOCK_TIMEOUT_MINUTES
}

export function getIdleLockTimeoutLabel(minutes: number): string {
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`
}

export function createIdleLockState(now = Date.now()): IdleLockPersistedState {
  return {
    lockedAt: null,
    lastActivityAt: now,
    unlockVerifiedAt: null,
    lockSessionId: null,
    lockPresented: false,
  }
}

export function readIdleLockState(): IdleLockPersistedState | null {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(IDLE_LOCK_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<IdleLockPersistedState>
    const base = createIdleLockState()
    return {
      lockedAt: typeof parsed.lockedAt === 'number' ? parsed.lockedAt : null,
      lastActivityAt:
        typeof parsed.lastActivityAt === 'number' ? parsed.lastActivityAt : base.lastActivityAt,
      unlockVerifiedAt:
        typeof parsed.unlockVerifiedAt === 'number' ? parsed.unlockVerifiedAt : null,
      lockSessionId: typeof parsed.lockSessionId === 'string' ? parsed.lockSessionId : null,
      lockPresented: Boolean(parsed.lockPresented),
    }
  } catch {
    return null
  }
}

export function writeIdleLockState(state: IdleLockPersistedState) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(IDLE_LOCK_STORAGE_KEY, JSON.stringify(state))
}

export function clearIdleLockState() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(IDLE_LOCK_STORAGE_KEY)
}

export function createIdleLockSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `lock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
