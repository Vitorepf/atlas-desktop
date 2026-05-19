export function shortId(id: string, max = 8): string {
  return id.length > max ? id.slice(0, max) : id
}
