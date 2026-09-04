export function EmptyState() {
  return (
    <div className="hidden h-full flex-1 flex-col items-center justify-center gap-4 bg-wa-panel text-center md:flex">
      <svg viewBox="0 0 303 172" width="220" height="125" className="fill-wa-panel-hover opacity-70">
        <circle cx="151" cy="86" r="80" />
      </svg>
      <h1 className="text-3xl font-light text-wa-text-primary">WhatsApp Web</h1>
      <p className="max-w-sm text-sm text-wa-text-secondary">
        Select a chat from the list to start messaging, or use the search box to find a contact.
      </p>
    </div>
  )
}
