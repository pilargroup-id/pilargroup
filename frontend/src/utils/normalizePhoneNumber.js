export function normalizePhoneNumber(value) {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value).replace(/\D+/g, '')
}
