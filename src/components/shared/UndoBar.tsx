'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  mensaje: string
  onUndo: () => Promise<{ error?: string }>
  onDismiss: () => void
  duracion?: number
}

export default function UndoBar({ mensaje, onUndo, onDismiss, duracion = 30 }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(duracion)
  const [undoError, setUndoError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          onDismissRef.current()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleUndo = () => {
    startTransition(async () => {
      const result = await onUndo()
      if (result.error) {
        setUndoError(result.error)
      } else {
        onDismissRef.current()
      }
    })
  }

  const pct = Math.round((secondsLeft / duracion) * 100)

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground truncate">{mensaje}</span>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={isPending}>
            <Undo2 className="size-3.5 mr-1" />
            {isPending ? 'Deshaciendo…' : `Deshacer (${secondsLeft}s)`}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDismiss}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      {undoError && <p className="text-xs text-destructive">{undoError}</p>}
      <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
