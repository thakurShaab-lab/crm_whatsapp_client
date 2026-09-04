import { useState } from 'react'

/**
 * Static map preview via OpenStreetMap's free tile-render service — no API key needed.
 * Falls back to a plain pin card if that service can't be reached, so a network hiccup
 * never leaves an empty bubble.
 */
export function LocationMessage({ message }) {
  const { latitude, longitude } = message.location || {}
  const [imageFailed, setImageFailed] = useState(false)
  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
  const previewUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=280x160&markers=${latitude},${longitude},red-pushpin`

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noreferrer"
      className="block w-64 max-w-full overflow-hidden rounded-md"
    >
      {imageFailed ? (
        <div className="flex h-40 w-full flex-col items-center justify-center gap-1 bg-black/20 text-wa-text-secondary">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5" />
          </svg>
          <span className="text-xs">Map preview unavailable</span>
        </div>
      ) : (
        <img
          src={previewUrl}
          alt="Shared location"
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-40 w-full object-cover"
        />
      )}
      <div className="flex items-center gap-2 bg-black/10 px-2 py-1.5">
        <span className="text-base">📍</span>
        <div className="min-w-0">
          <div className="text-sm text-wa-text-primary">Current location</div>
          <div className="truncate text-xs text-wa-text-secondary">
            {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
          </div>
        </div>
      </div>
    </a>
  )
}
