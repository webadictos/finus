import type { Json } from '@/types/database'

export interface TagItem {
  slug: string
  label: string
}

export function slugifyTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function formatTagLabelFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function normalizeTag(raw: string): TagItem | null {
  const label = raw.trim().replace(/\s+/g, ' ')
  const slug = slugifyTag(label)

  if (!label || !slug) return null

  return {
    slug,
    label,
  }
}

export function parseTags(value: Json | string[] | null | undefined): TagItem[] {
  if (!value || !Array.isArray(value)) return []

  const parsed = value
    .map((item) => {
      if (typeof item === 'string') {
        const slug = item
        return {
          slug,
          label: formatTagLabelFromSlug(slug),
        }
      }

      if (
        item &&
        typeof item === 'object' &&
        'slug' in item &&
        typeof item.slug === 'string'
      ) {
        return {
          slug: item.slug,
          label:
            'label' in item && typeof item.label === 'string' && item.label.trim()
              ? item.label.trim()
              : formatTagLabelFromSlug(item.slug),
        }
      }

      return null
    })
    .filter((item): item is TagItem => item !== null)

  const seen = new Set<string>()
  return parsed.filter((item) => {
    if (seen.has(item.slug)) return false
    seen.add(item.slug)
    return true
  })
}
