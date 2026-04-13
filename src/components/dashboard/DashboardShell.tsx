'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import MobileNav from '@/components/dashboard/MobileNav'
import IdleLockOverlay from '@/components/security/IdleLockOverlay'
import type { Database } from '@/types/database'

type Cuenta = Database['public']['Tables']['cuentas']['Row']
type Tarjeta = Database['public']['Tables']['tarjetas']['Row']

interface Props {
  children: React.ReactNode
  cuentas: Cuenta[]
  tarjetas: Tarjeta[]
  email: string
}

const PULL_THRESHOLD = 72
const MAX_PULL = 104

export default function DashboardShell({
  children,
  cuentas,
  tarjetas,
  email,
}: Props) {
  const router = useRouter()
  const mainRef = useRef<HTMLElement | null>(null)
  const startYRef = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [armed, setArmed] = useState(false)
  const [showRefresh, setShowRefresh] = useState(false)
  const [isRefreshing, startRefreshTransition] = useTransition()

  useEffect(() => {
    const main = mainRef.current
    if (!main) return

    const isMobileTouch =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches &&
      window.matchMedia('(max-width: 767px)').matches

    if (!isMobileTouch) return

    const resetPull = () => {
      draggingRef.current = false
      startYRef.current = null
      setPullDistance(0)
      setArmed(false)
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || main.scrollTop > 0 || showRefresh) return
      startYRef.current = event.touches[0].clientY
      draggingRef.current = true
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!draggingRef.current || startYRef.current == null || main.scrollTop > 0) return

      const delta = event.touches[0].clientY - startYRef.current
      if (delta <= 0) {
        resetPull()
        return
      }

      const nextPull = Math.min(delta * 0.45, MAX_PULL)
      event.preventDefault()
      setPullDistance(nextPull)
      setArmed(nextPull >= PULL_THRESHOLD)
    }

    const handleTouchEnd = () => {
      if (!draggingRef.current) return

      const shouldRefresh = armed
      resetPull()

      if (shouldRefresh) {
        setShowRefresh(true)
        startRefreshTransition(() => {
          router.refresh()
        })
      }
    }

    main.addEventListener('touchstart', handleTouchStart, { passive: true })
    main.addEventListener('touchmove', handleTouchMove, { passive: false })
    main.addEventListener('touchend', handleTouchEnd, { passive: true })
    main.addEventListener('touchcancel', resetPull, { passive: true })

    return () => {
      main.removeEventListener('touchstart', handleTouchStart)
      main.removeEventListener('touchmove', handleTouchMove)
      main.removeEventListener('touchend', handleTouchEnd)
      main.removeEventListener('touchcancel', resetPull)
    }
  }, [armed, router, showRefresh])

  useEffect(() => {
    if (!showRefresh || isRefreshing) return

    const timeoutId = window.setTimeout(() => {
      setShowRefresh(false)
    }, 650)

    return () => window.clearTimeout(timeoutId)
  }, [isRefreshing, showRefresh])

  return (
    <div className="flex-1 min-w-0">
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b bg-card/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur md:hidden">
          <div className="flex items-center justify-between">
            <Link href="/">
              <img src="/finus-logo.svg" height={36} alt="Finus" style={{ height: 36 }} />
            </Link>
            <Link
              href="/configuracion"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Settings className="size-5" />
            </Link>
          </div>
        </header>

        <main
          ref={mainRef}
          className="relative flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6"
        >
          <div className="pointer-events-none sticky top-3 z-20 flex justify-center md:hidden">
            <div
              className="rounded-full border bg-card/95 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-all"
              style={{
                opacity: pullDistance > 0 || showRefresh ? 1 : 0,
                transform: `translateY(${Math.max(0, Math.min(pullDistance, 24))}px)`,
              }}
            >
              {showRefresh ? 'Actualizando…' : armed ? 'Suelta para actualizar' : 'Desliza para actualizar'}
            </div>
          </div>

          <div
            className="transition-transform duration-200 ease-out"
            style={{
              transform: `translateY(${showRefresh ? 28 : pullDistance}px)`,
            }}
          >
            {children}
          </div>
        </main>

        <MobileNav cuentas={cuentas} tarjetas={tarjetas} />
      </div>

      <IdleLockOverlay email={email} />
    </div>
  )
}
