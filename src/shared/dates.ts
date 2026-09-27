export function monthStartUtc(date: Date, offsetMonths = 0): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offsetMonths, 1),
  )
}
