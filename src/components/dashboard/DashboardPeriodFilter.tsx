'use client'

import { useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DASHBOARD_PERIOD_OPTIONS,
  type DashboardPeriodKey,
} from '@/lib/dashboard-period'

interface Props {
  period: DashboardPeriodKey
}

export default function DashboardPeriodFilter({ period }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handleSelect = (nextPeriod: DashboardPeriodKey) => {
    if (nextPeriod === period) return

    startTransition(() => {
      router.replace(`${pathname}?period=${nextPeriod}`, { scroll: false })
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Periodo
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DASHBOARD_PERIOD_OPTIONS.map((option) => {
          const active = option.key === period

          return (
            <Button
              key={option.key}
              type="button"
              variant={active ? 'secondary' : 'outline'}
              size="sm"
              className={cn('shrink-0 rounded-full px-3', active && 'shadow-sm')}
              onClick={() => handleSelect(option.key)}
              disabled={isPending}
              aria-pressed={active}
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
