export function formatRut(raw) {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length === 0) return ''
  const dv = clean.slice(-1)
  const num = clean.slice(0, -1)
  if (num.length === 0) return dv
  const formatted = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return formatted + '-' + dv
}
