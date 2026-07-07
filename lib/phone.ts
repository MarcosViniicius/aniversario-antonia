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

/**
 * Normalizes a Brazilian mobile number.
 * 10-digit numbers where the 3rd digit is not already 9 get a 9 inserted after the DDD.
 * Returns digits only.
 */
export function normalizeBrPhone(phone: string): string {
  const d = digitsOnly(phone)
  if (d.length === 10 && d[2] !== '9') return d.slice(0, 2) + '9' + d.slice(2)
  return d
}

/** True when the phone is 10 digits and looks like it's missing the leading 9 after DDD. */
export function mightMissNine(phone: string): boolean {
  const d = digitsOnly(phone)
  return d.length === 10 && d[2] !== '9'
}

/** Builds a wa.me URL, normalizing the phone and prepending the +55 country code. */
export function waLink(phone: string, text?: string): string {
  let d = normalizeBrPhone(phone)
  if (!d.startsWith('55')) d = '55' + d
  if (text) return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
  return `https://wa.me/${d}`
}

/** Compares phones tolerantly: normalizes both sides before comparing. */
export function phoneMatch(a: string, b: string): boolean {
  const da = normalizeBrPhone(a)
  const db = normalizeBrPhone(b)
  const len = Math.min(da.length, db.length, 11)
  if (len < 8) return false
  return da.slice(-len) === db.slice(-len)
}
