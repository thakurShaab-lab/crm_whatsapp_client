/** Sent/delivered/read/failed indicator. Status is always backend-driven — never a client timer. */
export function TickIcon({ status, className = '' }) {
  if (status === 'sending') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" className={`text-wa-text-secondary ${className}`} aria-label="Sending">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 4.5v3.8l2.6 1.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </svg>
    )
  }

  if (status === 'failed') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" className={`text-wa-danger ${className}`} aria-label="Failed to send">
        <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
        <path d="M8 4v5M8 11.2v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }

  if (status === 'sent') {
    return (
      <svg viewBox="0 0 16 15" width="14" height="14" className={`text-wa-text-secondary ${className}`} aria-label="Sent">
        <path
          d="M11.4 2.9 5.6 10.6 2.7 7.7a.6.6 0 0 0-.85.85l3.3 3.3a.6.6 0 0 0 .9-.06l6.2-8.2a.6.6 0 1 0-.95-.7Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  // delivered or read: double tick, colored blue only once read.
  const colorClass = status === 'read' ? 'text-wa-tick-read' : 'text-wa-text-secondary'
  return (
    <svg viewBox="0 0 20 15" width="16" height="14" className={`${colorClass} ${className}`} aria-label={status === 'read' ? 'Read' : 'Delivered'}>
      <path
        d="M11.4 2.9 5.6 10.6 2.7 7.7a.6.6 0 0 0-.85.85l3.3 3.3a.6.6 0 0 0 .9-.06l6.2-8.2a.6.6 0 1 0-.95-.7Z"
        fill="currentColor"
      />
      <path
        d="M16.4 2.9 10.6 10.6l-.85-.83a.6.6 0 1 0-.83.87l1.28 1.24a.6.6 0 0 0 .9-.06l6.2-8.2a.6.6 0 1 0-.95-.7Z"
        fill="currentColor"
      />
    </svg>
  )
}
