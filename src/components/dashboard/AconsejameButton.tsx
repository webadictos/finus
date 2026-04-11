'use client'

import { useState } from 'react'
import { Sparkles, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Estado = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export default function AconsejameButton() {
  const [estado, setEstado] = useState<Estado>('idle')
  const [texto, setTexto] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)

  const limpiar = () => {
    setTexto('')
    setErrorMsg('')
    setEstado('idle')
  }

  const cerrar = () => {
    setPanelOpen(false)
    limpiar()
  }

  const consultar = async () => {
    setTexto('')
    setErrorMsg('')
    setEstado('loading')
    setPanelOpen(true)

    try {
      const res = await fetch('/api/aconsejame', { method: 'POST' })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Error ${res.status}`)
      }

      const body = res.body
      if (!body) throw new Error('Respuesta vacía')

      setEstado('streaming')
      const reader = body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try {
            const event = JSON.parse(raw)
            if (
              event.type === 'content_block_delta' &&
              event.delta?.type === 'text_delta'
            ) {
              setTexto((prev) => prev + event.delta.text)
            }
          } catch {
            // ignorar líneas no-JSON
          }
        }
      }

      setEstado('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
      setEstado('error')
    }
  }

  return (
    <>
      {/* Botón principal */}
      <button
        onClick={consultar}
        disabled={estado === 'loading' || estado === 'streaming'}
        className="flex items-center gap-2 rounded-xl border bg-gradient-to-r from-violet-500/10 to-blue-500/10 px-4 py-3 text-sm font-semibold text-foreground transition-all hover:from-violet-500/20 hover:to-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 w-full justify-center"
      >
        <Sparkles className="size-4 text-violet-500 shrink-0" />
        {estado === 'loading' || estado === 'streaming' ? 'Analizando...' : 'Aconséjame'}
      </button>

      {/* Panel de respuesta */}
      {panelOpen && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-violet-500" />
              <span className="text-sm font-semibold">Recomendaciones</span>
              {(estado === 'loading' || estado === 'streaming') && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <RefreshCw className="size-3 animate-spin" />
                  Generando...
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {estado === 'done' && (
                <Button variant="ghost" size="sm" onClick={consultar} className="text-xs h-7">
                  <RefreshCw className="size-3" />
                  Regenerar
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" onClick={cerrar}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="px-4 py-4 min-h-[80px]">
            {estado === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="size-4 animate-spin" />
                Analizando tu situación financiera...
              </div>
            )}

            {estado === 'error' && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMsg}
              </div>
            )}

            {(estado === 'streaming' || estado === 'done') && texto && (
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {texto}
                {estado === 'streaming' && (
                  <span className="inline-block w-1 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
