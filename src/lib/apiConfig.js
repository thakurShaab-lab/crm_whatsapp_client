// The backend now has a real HTTPS domain (node.weblink4you.com), so the frontend
// can call it directly as an absolute URL in every environment — dev, Netlify,
// Vercel, or anywhere else. This used to be conditional on dev vs. production
// (production used relative paths proxied by netlify.toml, working around the old
// HTTP-only backend triggering the browser's mixed-content block) — that workaround
// was Netlify-specific and silently breaks on any other static host (e.g. Vercel),
// since there's no equivalent proxy config there. Not needed now that HTTPS is real.
export const API_ORIGIN = 'https://node.weblink4you.com'
export const API_BASE_PATH = '/crm-whatsapp'
export const API_BASE_URL = `${API_ORIGIN}${API_BASE_PATH}`

/** Resolves a server-relative path (e.g. `/media/...`) against the API base URL; absolute URLs pass through untouched. */
export function resolveMediaUrl(url) {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE_URL}${url}`
}