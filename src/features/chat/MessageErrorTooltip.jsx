import { useEffect, useRef, useState } from 'react'
import { TickIcon } from './TickIcon.jsx'

/**
 * The small red "failed" badge next to a message's timestamp, tap-toggling a
 * WhatsApp-style dark tooltip with the actual backend/vendor error and a retry
 * action — replacing the old always-visible red text block under the bubble.
 * Colors are hardcoded (not the wa-* theme tokens) since this tooltip should look
 * identical in light and dark mode, exactly like WhatsApp's own error tooltip.
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
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-label="Message failed to send — show details"
        className="flex items-center justify-center"
      >
        <TickIcon status="failed" />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute bottom-full right-0 z-20 mb-2 w-60 rounded-md bg-[#233138] px-3 py-2 text-left shadow-lg"
        >
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
      )}
    </span>
  )
}
