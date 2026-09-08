/**
 * Replaces the normal composer once WhatsApp's 24h customer-service window has
 * closed since the contact's last real reply (see contact.windowExpired,
 * mappers.js's isWindowExpired on the server) — only a pre-approved template can
 * reach them until they message in again.
 */
export function WhatsAppWindowNotice({ onSendTemplate }) {
  return (
    <div className="flex flex-shrink-0 flex-col items-center gap-3 border-t border-wa-border bg-wa-panel px-6 py-5 text-center">
      <h3 className="text-sm font-semibold text-wa-text-primary">WhatsApp Communication Notice</h3>
      <p className="max-w-md text-xs text-wa-text-secondary">
        You cannot send a message to this customer right now. WhatsApp only permits open conversation by any business
        within 24 hours of the customer&rsquo;s last message. After this period, you can only send pre-approved
        templates or wait for the customer to initiate the conversation again.
      </p>
      <button
        type="button"
        onClick={onSendTemplate}
        className="rounded-md bg-wa-green px-4 py-2 text-sm font-medium text-white hover:bg-wa-green-dark"
      >
        Send Approved Template
      </button>
    </div>
  )
}
