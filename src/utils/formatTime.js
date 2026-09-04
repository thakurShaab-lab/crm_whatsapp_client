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