export const GASTO_CATEGORIA_OPTIONS = [
  { value: 'comida', label: 'Comida' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'despensa', label: 'Despensa' },
  { value: 'casa', label: 'Casa' },
  { value: 'salud', label: 'Salud' },
  { value: 'escuela', label: 'Escuela' },
  { value: 'entretenimiento', label: 'Entretenimiento' },
  { value: 'mascota', label: 'Mascota' },
  { value: 'ropa', label: 'Ropa' },
  { value: 'imprevisto', label: 'Imprevisto' },
  { value: 'varios_efectivo', label: 'Varios efectivo' },
  { value: 'otro', label: 'Otro' },
] as const

export type GastoCategoriaValue = (typeof GASTO_CATEGORIA_OPTIONS)[number]['value']

export const GASTO_CATEGORIA_LABEL: Record<GastoCategoriaValue, string> =
  Object.fromEntries(GASTO_CATEGORIA_OPTIONS.map((option) => [option.value, option.label])) as Record<
    GastoCategoriaValue,
    string
  >

export function getGastoCategoriaLabel(value?: string | null): string | null {
  if (!value) return null
  return GASTO_CATEGORIA_LABEL[value as GastoCategoriaValue] ?? value
}
