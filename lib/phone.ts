export function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function digitsOnly(v: string): string {
  return v.replace(/\D/g, '')
}

/** Compara os últimos 10 dígitos dos dois telefones. */
export function phoneMatch(a: string, b: string): boolean {
  const da = digitsOnly(a)
  const db = digitsOnly(b)
  const len = Math.min(da.length, db.length, 10)
  if (len < 8) return false
  return da.slice(-len) === db.slice(-len)
}
