export function initialsFor(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const AVATAR_COLORS = ['#00a884', '#6b5ce6', '#e67e22', '#3498db', '#e74c3c', '#16a085', '#8e44ad', '#d35400']

/** The real schema has no per-contact avatar color, so one is derived deterministically from the mobile number. */
export function avatarColorFor(seed) {
  if (!seed) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}