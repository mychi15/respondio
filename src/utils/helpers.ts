export function camelCaseToWords(value: string): string {
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function generateNodeId(existingIds: Iterable<string | number> = []): string {
  const taken = new Set(Array.from(existingIds, String))

  let id: string
  do {
    id = Array.from({ length: 6 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  } while (taken.has(id))

  return id
}

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
