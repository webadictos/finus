'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
  required?: boolean
  placeholder?: string
}

/**
 * Input de monto estilo bancario: los dígitos entran de derecha a izquierda
 * acumulando centavos. Teclear "1","2","3" → $0.01 → $0.12 → $1.23
 *
 * `value` / `onChange` manejan el monto como string de pesos ("1234.56")
 * compatible con el FormState existente en RegistrarGastoForm.
 */
export default function MontoInput({ id, value, onChange, className, required, placeholder = '0.00' }: Props) {
  const toCentavos = (s: string) => {
    const parsed = parseFloat(s || '0')
    return isNaN(parsed) ? 0 : Math.round(parsed * 100)
  }

  const [centavos, setCentavos] = useState<number>(() => toCentavos(value))
  const lastPropValue = useRef(value)
  const isFocused = useRef(false)

  // Sincronizar desde prop cuando cambia externamente (no mientras el usuario escribe)
  useEffect(() => {
    if (lastPropValue.current !== value && !isFocused.current) {
      lastPropValue.current = value
      setCentavos(toCentavos(value))
    } else {
      lastPropValue.current = value
    }
  }, [value])

  const formatDisplay = (cts: number): string => {
    if (cts === 0) return ''
    const pesos = Math.floor(cts / 100)
    const cents = cts % 100
    return `${pesos.toLocaleString('es-MX')}.${String(cents).padStart(2, '0')}`
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' || e.key === 'Enter') return
    e.preventDefault()

    if (e.key === 'Backspace') {
      const next = Math.floor(centavos / 10)
      setCentavos(next)
      lastPropValue.current = next === 0 ? '' : (next / 100).toFixed(2)
      onChange(lastPropValue.current)
      return
    }

    if (!/^\d$/.test(e.key)) return
    if (centavos >= 9999999) return // máx $99,999.99

    const next = centavos * 10 + parseInt(e.key, 10)
    setCentavos(next)
    lastPropValue.current = (next / 100).toFixed(2)
    onChange(lastPropValue.current)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      required={required}
      placeholder={placeholder}
      value={formatDisplay(centavos)}
      onKeyDown={handleKeyDown}
      onChange={() => {/* controlado por keyDown */}}
      onFocus={() => { isFocused.current = true }}
      onBlur={() => { isFocused.current = false }}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    />
  )
}
