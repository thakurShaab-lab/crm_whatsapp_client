import { API_BASE_URL } from './apiConfig'

const BASE = `${API_BASE_URL}/api`

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options)
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json()
      message = body?.error?.message || message
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message)
  }
  if (response.status === 204) return null
  return response.json()
}

export function getConversations({ search, filter, cursor, limit } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (filter) params.set('filter', filter)
  if (cursor) params.set('cursor', cursor)
  if (limit) params.set('limit', String(limit))
  const query = params.toString()
  return request(`/conversations${query ? `?${query}` : ''}`)
}

// Mirrors the legacy `whatsapp_chat.php?...` query params (see messagesController.js on
// the server) so opening a chat from the sidebar carries the same identifying context
// the legacy CRM route did — ctrId/refid/for/useradminid/wabano/wanum are cross-checked
// server-side; def/view/cname/viewfrom/is_chat/is_on_right are passed through as-is.
const CHAT_CONTEXT_KEYS = [
  'ctrId', 'for', 'refid', 'def', 'view', 'cname', 'viewfrom', 'is_chat', 'is_on_right', 'useradminid', 'wabano', 'wanum',
]

export function getThreadMessages(mobile, { cursor, limit, ...context } = {}) {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  if (limit) params.set('limit', String(limit))
  for (const key of CHAT_CONTEXT_KEYS) {
    if (context[key] != null && context[key] !== '') params.set(key, context[key])
  }
  const query = params.toString()
  return request(`/conversations/${mobile}/messages${query ? `?${query}` : ''}`)
}

export function markConversationRead(mobile) {
  return request(`/conversations/${mobile}/read`, { method: 'POST' })
}

export function deleteConversation(mobile) {
  return request(`/conversations/${mobile}`, { method: 'DELETE' })
}

export function sendMessage(mobile, { text, files }) {
  const form = new FormData()
  if (text) form.append('text', text)
  for (const file of files || []) form.append('files', file)
  return request(`/conversations/${mobile}/messages`, { method: 'POST', body: form })
}

export function getContact(mobile) {
  return request(`/contacts/${mobile}`)
}

export function searchContacts(search) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  return request(`/contacts?${params.toString()}`)
}