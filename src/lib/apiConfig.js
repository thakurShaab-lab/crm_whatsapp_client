// The backend now has a real HTTPS domain (node.weblink4you.com), so every BUILT
// output (Netlify, Vercel, or anywhere else) calls it directly as an absolute URL.
// This used to be conditional on dev vs. production (production used relative paths
// proxied by netlify.toml, working around the old HTTP-only backend triggering the
// browser's mixed-content block) — that workaround was Netlify-specific and silently
// breaks on any other static host (e.g. Vercel), since there's no equivalent proxy
// config there. Not needed now that HTTPS is real.
//
// `import.meta.env.DEV` is only true under Vite's local dev server (`npm run dev`),
// never in a production build regardless of host, so this override can't reintroduce
// that Vercel-breaking behavior — it just lets `npm run dev` talk to a local backend
// (`npm run dev` in crm_whatsapp_server, which has no `/crm-whatsapp` path prefix;
// that prefix is added by the real server's reverse proxy, not the Node app itself).
export const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:3009' : 'https://node.weblink4you.com'
export const API_BASE_PATH = import.meta.env.DEV ? '' : '/crm-whatsapp'
export const API_BASE_URL = `${API_ORIGIN}${API_BASE_PATH}`

/**
 * Resolves a server-relative path (e.g. `/media/...`) against the API base URL.
 * Anything that's already a full URL passes through untouched — not just
 * `http(s)://`, but also a local `blob:`/`data:` URL, exactly what an optimistic
 * message's own local preview (staged file, just-recorded voice message) uses
 * before the real upload finishes. Without this, a blob URL would get the API
 * base wrongly prepended to it (`https://.../apiblob:...`), breaking every
 * optimistic image/video/audio preview.
 */
export function resolveMediaUrl(url) {
  if (!url) return url
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url
  return `${API_BASE_URL}${url}`
}