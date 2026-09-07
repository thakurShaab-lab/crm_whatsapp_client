// Builds the same query-param shape the legacy `whatsapp_chat.php?...` route used
// when a chat is opened from the sidebar (def/view/viewfrom/is_chat are fixed for
// this entry point — a chat opened from a CRM record page instead would carry
// different values, but that flow doesn't exist in this build).
export function buildChatUrl({ mobile, name, countryCode, accountId, for: forType, userAdminId, wabano }) {
  const params = new URLSearchParams({ def: 'Y', view: 'inbox', viewfrom: 'Y', is_chat: 'Y', is_on_right: 'Y', wanum: mobile })
  if (countryCode != null) params.set('ctrId', String(countryCode))
  if (forType) params.set('for', forType)
  if (accountId != null) params.set('refid', String(accountId))
  if (name) params.set('cname', name)
  if (userAdminId != null) params.set('useradminid', String(userAdminId))
  if (wabano) params.set('wabano', wabano)
  return `/chat?${params.toString()}`
}
