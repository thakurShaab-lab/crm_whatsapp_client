import { useEffect, useRef, useState } from 'react'
import { TickIcon } from './TickIcon.jsx'

/**
 * The small red "failed" badge next to a message's timestamp: hovering it opens a
 * WhatsApp-style dark tooltip with the actual backend/vendor error and a retry
 * action — replacing the old always-visible red text block under the bubble.
 * Colors are hardcoded (not the wa-* theme tokens) since this tooltip should look
 * identical in light and dark mode, exactly like WhatsApp's own error tooltip.
 * Tap (not just hover) also opens it, and a tap outside closes it, so it still
 * works on touch devices that have no hover state.
 */
export function MessageErrorTooltip({ message, onRetry }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handleOutsideClick(event) {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Message failed to send — show details"
        className="flex items-center justify-center"
      >
        <TickIcon status="failed" />
      </button>

      {open && (
        // The pb-2 here (not a margin) is a deliberate hover bridge: it keeps this
        // wrapper's own hit-box continuous from the icon up to the visible tooltip
        // below, so moving the mouse from one to the other never dips into the
        // parent bubble in between and cuts the hover off early.
        <div className="absolute bottom-full right-0 z-20 pb-2">
          <div role="tooltip" className="relative w-60 rounded-md bg-[#233138] px-3 py-2 text-left shadow-lg">
            <p className="text-xs font-semibold text-white">Message Failed</p>
            <p className="mt-1 text-xs leading-snug text-[#e4c88c]">{message.failedReason || 'Failed to send'}</p>
            {onRetry && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onRetry(message)
                }}
                className="mt-2 text-xs font-medium text-wa-green underline underline-offset-2"
              >
                Tap to retry
              </button>
            )}
            <span className="absolute -bottom-1.5 right-3 h-3 w-3 rotate-45 bg-[#233138]" />
          </div>
        </div>
      )}
    </span>
  )
}
