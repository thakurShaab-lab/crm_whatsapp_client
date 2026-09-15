import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { sendMessage } from '../../store/messagesSlice'
import { formatLocationText } from '../../utils/locationText'
import { makeTempMessageId } from '../../utils/optimisticMessage'

function permissionErrorMessage(error) {
  if (error.code === error.PERMISSION_DENIED) return 'Location permission denied'
  if (error.code === error.POSITION_UNAVAILABLE) return 'Your location could not be determined'
  if (error.code === error.TIMEOUT) return 'Getting your location took too long — please try again'
  return 'Could not get your location'
}

/**
 * "Location" in the attachment menu opens this instead of sharing immediately —
 * the user picks either their current position or searches for a place, and the
 * location is only ever sent once one of those two choices resolves. Both paths
 * end up calling the exact same send mechanism the composer's own text/file send
 * uses (sendMessage + an optimistic 'sending' bubble) with a location-formatted
 * text body (utils/locationText.js) — no parallel/new message type or format.
 */
export function LocationShareModal({ mobile, onClose }) {
  const dispatch = useDispatch()
  const [view, setView] = useState('choice') // 'choice' | 'search'
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [sendingResultId, setSendingResultId] = useState(null)
  const searchInputRef = useRef(null)

  // Debounced exactly like SidebarHeader.jsx's own search box, so typing a query
  // doesn't fire a lookup on every keystroke. Clearing the query back to empty is
  // handled directly in the input's onChange (see handleQueryChange below), not
  // here, so this effect never needs to reset state on a guard-clause early return.
  useEffect(() => {
    if (view !== 'search' || !query.trim()) return undefined
    const timer = setTimeout(async () => {
      try {
        // OpenStreetMap's Nominatim — free, no API key, CORS-open. A production
        // app at real scale should proxy this through a backend (Nominatim's own
        // usage policy asks for a custom User-Agent, which a browser can't set),
        // but for this internal tool's search volume, calling it directly avoids
        // a new backend endpoint for what's a small, self-contained lookup.
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&q=${encodeURIComponent(query.trim())}`
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Search failed (${response.status})`)
        const data = await response.json()
        setResults(data)
        if (data.length === 0) setSearchError('No locations found for that search.')
      } catch {
        setResults([])
        setSearchError('Could not search for that location. Check your connection and try again.')
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [query, view])

  useEffect(() => {
    if (view === 'search') searchInputRef.current?.focus()
  }, [view])

  function handleQueryChange(value) {
    setQuery(value)
    if (!value.trim()) {
      setResults([])
      setSearchError(null)
      setSearching(false)
    } else {
      // Shown immediately on each keystroke, ahead of the debounced fetch below,
      // so the "Searching…" state isn't delayed behind the debounce itself.
      setSearching(true)
      setSearchError(null)
    }
  }

  async function sendLocation(latitude, longitude) {
    const locationText = formatLocationText(latitude, longitude)
    const optimisticMessages = [
      {
        id: makeTempMessageId(),
        mobile,
        direction: 'outbound',
        type: 'text',
        text: locationText,
        media: null,
        status: 'sending',
        failedReason: null,
        vendorMessageId: null,
        createdAt: new Date().toISOString(),
      },
    ]
    // Not awaited by the caller beyond letting the modal close immediately after
    // dispatching — same "never hidden while sending" optimistic behavior as
    // every other message type (see messagesSlice.js's sendMessage.pending);
    // a failure still shows in the thread as a "failed" bubble with retry.
    await dispatch(sendMessage({ mobile, text: locationText, optimisticMessages })).unwrap().catch(() => {})
  }

  function handleSendCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported in this browser')
      return
    }
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await sendLocation(position.coords.latitude, position.coords.longitude)
        setLocating(false)
        onClose()
      },
      (error) => {
        setLocating(false)
        setLocationError(permissionErrorMessage(error))
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function handleSelectResult(result) {
    if (sendingResultId) return
    setSendingResultId(result.place_id)
    await sendLocation(Number(result.lat), Number(result.lon))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-label="Share location">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-wa-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-wa-border px-4 py-3">
          <div className="flex items-center gap-2">
            {view === 'search' && (
              <button
                type="button"
                onClick={() => setView('choice')}
                aria-label="Back"
                className="text-wa-text-secondary hover:text-wa-text-primary"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />
                </svg>
              </button>
            )}
            <h2 className="text-base font-medium text-wa-text-primary">Share location</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-wa-text-secondary hover:text-wa-text-primary">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {view === 'choice' ? (
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <button
              type="button"
              onClick={handleSendCurrentLocation}
              disabled={locating}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm text-wa-text-primary hover:bg-wa-panel-hover disabled:opacity-60"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-wa-green text-white">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4m8.94 3a9 9 0 0 0-8-7.94V2h-2v1.06A9 9 0 0 0 3 11H2v2h1.06A9 9 0 0 0 11 20.94V22h2v-1.06A9 9 0 0 0 20.94 13H22v-2zm-7.94 8A7 7 0 1 1 20 12a7 7 0 0 1-7 7" />
                </svg>
              </span>
              <span>
                <span className="block font-medium">{locating ? 'Getting your location…' : 'Send current location'}</span>
                <span className="block text-xs text-wa-text-secondary">Share the location this device reports right now</span>
              </span>
            </button>

            {locationError && <div className="px-3 pb-1 text-xs text-wa-danger">{locationError}</div>}

            <button
              type="button"
              onClick={() => setView('search')}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm text-wa-text-primary hover:bg-wa-panel-hover"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-wa-panel-hover text-wa-text-secondary">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14" />
                </svg>
              </span>
              <span>
                <span className="block font-medium">Search location</span>
                <span className="block text-xs text-wa-text-secondary">Find a place and send its location</span>
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden px-3 py-3">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Search for a place or address"
              className="w-full flex-shrink-0 rounded-full border border-wa-border bg-wa-panel-textarea px-4 py-2 text-sm text-wa-text-primary placeholder:text-wa-text-secondary focus:outline-none"
            />

            <div className="mt-2 flex-1 overflow-y-auto">
              {searching && <div className="px-2 py-3 text-sm text-wa-text-secondary">Searching…</div>}
              {!searching && searchError && <div className="px-2 py-3 text-sm text-wa-danger">{searchError}</div>}
              {!searching &&
                results.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    disabled={sendingResultId != null}
                    className="flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left text-sm text-wa-text-primary hover:bg-wa-panel-hover disabled:opacity-60"
                  >
                    <span className="mt-0.5 flex-shrink-0 text-wa-text-secondary">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5" />
                      </svg>
                    </span>
                    <span>
                      {sendingResultId === result.place_id ? 'Sending…' : result.display_name}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
