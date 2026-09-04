// In local dev there's no proxy in front of Vite, so the app talks to the remote API
// directly. In the production (Netlify) build, the same site is served over HTTPS,
// and the API is plain HTTP — a browser would block that outright as mixed content.
// netlify.toml proxies /api, /media, and /socket.io from Netlify's own HTTPS edge to
// that HTTP server instead, so the production build uses relative paths (same
// origin as the page) and lets Netlify make the insecure hop server-to-server.
const isDev = import.meta.env.DEV

export const API_ORIGIN = isDev ? 'http://52.76.199.149:3000' : ''
export const API_BASE_PATH = isDev ? '/crm-whatsapp' : ''
export const API_BASE_URL = `${API_ORIGIN}${API_BASE_PATH}`

/** Resolves a server-relative path (e.g. `/media/...`) against the API base URL; absolute URLs pass through untouched. */
export function resolveMediaUrl(url) {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE_URL}${url}`
}