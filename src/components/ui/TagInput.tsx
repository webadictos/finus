'use client'

import { useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeTag, slugifyTag, type TagItem } from '@/lib/tags'

interface Props {
  value: TagItem[]
  onChange: (tags: TagItem[]) => void
  sugerencias?: TagItem[]
  placeholder?: string
  className?: string
}

/**
 * Input de etiquetas con autocomplete.
 * - Enter o coma para agregar una etiqueta
 * - Backspace sobre input vacío elimina la última etiqueta
 * - Clic en × elimina la etiqueta
 * - Muestra sugerencias filtradas mientras se escribe
 */
export default function TagInput({ value, onChange, sugerencias = [], placeholder = 'Agregar etiqueta...', className }: Props) {
  const [input, setInput] = useState('')
  const [showSugs, setShowSugs] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const agregarTag = useCallback(
    (raw: string) => {
      const tag = normalizeTag(raw)
      if (!tag || value.some((item) => item.slug === tag.slug)) return
      onChange([...value, tag])
      setInput('')
      setShowSugs(false)
    },
    [value, onChange]
  )

  const eliminarTag = (slug: string) => onChange(value.filter((t) => t.slug !== slug))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      agregarTag(input)
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'Escape') {
      setShowSugs(false)
    }
  }

  const inputSlug = slugifyTag(input)
  const sugerenciasFiltradas = sugerencias
    .filter((s) => {
      const query = input.trim().toLowerCase()
      if (!query) return !value.some((item) => item.slug === s.slug)

      return (
        (s.label.toLowerCase().includes(query) || s.slug.includes(inputSlug)) &&
        !value.some((item) => item.slug === s.slug)
      )
    })
    .slice(0, 6)

  return (
    <div className={cn('relative', className)}>
      {/* Área de pills + input */}
      <div
        className="min-h-9 w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm flex flex-wrap gap-1.5 cursor-text focus-within:ring-1 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag.slug}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            title={tag.slug}
          >
            {tag.label}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); eliminarTag(tag.slug) }}
              className="hover:text-destructive"
              aria-label={`Eliminar etiqueta ${tag.label}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSugs(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSugs(true)}
          onBlur={() => setTimeout(() => setShowSugs(false), 150)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-24 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
        />
      </div>

      {/* Dropdown de sugerencias */}
      {showSugs && (input.length > 0 || sugerenciasFiltradas.length > 0) && sugerenciasFiltradas.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md">
          {sugerenciasFiltradas.map((s) => (
            <button
              key={s.slug}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); agregarTag(s.label) }}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span>{s.label}</span>
              {s.slug !== slugifyTag(s.label) && (
                <span className="ml-2 text-xs text-muted-foreground">{s.slug}</span>
              )}
            </button>
          ))}
          {input.trim() && !sugerencias.some((item) => item.slug === inputSlug) && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); agregarTag(input) }}
              className="w-full px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent border-t"
            >
              Crear &ldquo;<span className="font-medium text-foreground">{input.trim()}</span>&rdquo;
              {inputSlug && (
                <span className="ml-2 text-xs">slug: {inputSlug}</span>
              )}
            </button>
          )}
        </div>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        Escribe y presiona Enter o coma para agregar. Se guarda `label` y `slug`.
      </p>
    </div>
  )
}
