import { useEffect } from 'react'
import { initialsFor, avatarColorFor } from '../../utils/avatar'

function ProfileField({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs font-medium text-wa-text-secondary">{label}</div>
      <div className="break-words text-sm text-wa-text-primary">{value}</div>
    </div>
  )
}

/**
 * This chat's contact — the exact same name/mobile/avatar the chat header and its
 * sidebar row already show (same `displayName`/`contact` ChatHeader.jsx itself
 * uses, passed straight through as props here — no separate fetch, no separate
 * data source, so it can never disagree with what's already on screen). Reuses the
 * same centered-card modal shape as SendTemplateModal.jsx rather than a new layout,
 * and the same avatar/initials treatment used for contacts throughout the app.
 */
export function ProfileModal({ name, mobile, stopService, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Profile">
      <div className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-lg bg-wa-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-wa-border px-4 py-3">
          <h2 className="text-base font-medium text-wa-text-primary">Profile</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-wa-text-secondary hover:text-wa-text-primary">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
                style={{ backgroundColor: avatarColorFor(mobile) }}
              >
                {initialsFor(name)}
              </div>
              <div className="max-w-full break-words text-center text-[15px] text-wa-text-primary">{name}</div>
            </div>

            <div className="flex flex-col gap-3 border-t border-wa-border pt-3">
              <ProfileField label="Mobile" value={stopService ? null : mobile} />
              {stopService && <ProfileField label="Status" value="Opted out of WhatsApp messages" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
