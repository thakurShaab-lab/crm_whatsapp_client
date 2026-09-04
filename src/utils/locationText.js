// The real schema has no dedicated "location" column/table, so a shared location is
// sent as a specially-formatted text message (a real WhatsApp-style maps link) and
// recognized back on render — no schema change needed to support it end to end.
const LOCATION_PATTERN = /^📍 Location: https:\/\/www\.google\.com\/maps\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/

export function formatLocationText(latitude, longitude) {
  return `📍 Location: https://www.google.com/maps?q=${latitude},${longitude}`
}

export function parseLocationText(text) {
  if (!text) return null
  const match = text.trim().match(LOCATION_PATTERN)
  if (!match) return null
  return { latitude: Number(match[1]), longitude: Number(match[2]) }
}