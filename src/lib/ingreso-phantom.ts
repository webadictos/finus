export function parseIngresoPhantomId(ingresoId: string): {
  isPhantom: boolean
  originalId: string
} {
  const phantomMatch = ingresoId.match(/^(.*)_next(?:_\d+)?$/)

  return {
    isPhantom: phantomMatch !== null,
    originalId: phantomMatch?.[1] ?? ingresoId,
  }
}
