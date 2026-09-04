import { useState } from 'react'
import { Linkified } from '../../../utils/linkify.jsx'
import { resolveMediaUrl } from '../../../lib/apiConfig'

/** Lightbox is intentionally lightweight (no lib) — a full-bleed overlay with the original image. */
export function ImageMessage({ message }) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const url = resolveMediaUrl(message.media?.url)

  return (
    <div>
      {failed ? (
        <div className="flex h-40 w-56 max-w-full flex-col items-center justify-center gap-1 rounded-md bg-black/20 text-wa-text-secondary">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5z" />
          </svg>
          <span className="text-xs">Photo failed to load</span>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="block max-w-full">
          <img
            src={url}
            alt={message.text || 'Photo'}
            loading="lazy"
            onError={() => setFailed(true)}
            className="max-h-72 max-w-full rounded-md object-cover"
          />
        </button>
      )}
      {message.text && <p className="mt-1 whitespace-pre-wrap break-words text-[14.5px] text-wa-text-primary"><Linkified text={message.text} /></p>}

      {open && !failed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <img src={url} alt={message.text || 'Photo'} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  )
}
