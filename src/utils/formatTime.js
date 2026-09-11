import { format, isToday, isYesterday, isThisYear } from 'date-fns'

export function formatMessageTime(value) {
  if (!value) return ''
  return format(new Date(value), 'h:mm a')
}

export function formatDateSeparator(value) {
  const date = new Date(value)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (isThisYear(date)) return format(date, 'd MMMM')
  return format(date, 'd MMMM yyyy')
}

export function formatSidebarTimestamp(value) {
  if (!value) return ''
  const date = new Date(value)
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return 'Yesterday'
  if (isThisYear(date)) return format(date, 'd MMM')
  return format(date, 'dd/MM/yyyy')
}

export function dayKey(value) {
  return new Date(value).toDateString()
}

/** Elapsed-duration formatting (m:ss) — distinct from the absolute-timestamp formatters above, used by the voice-recorder timer and preview player. */
export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}