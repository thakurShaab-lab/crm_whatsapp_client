import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { searchContacts } from '../../lib/api'
import { openConversation } from '../../store/uiSlice'
import { buildChatUrl } from '../../utils/chatUrl'
import { initialsFor, avatarColorFor } from '../../utils/avatar'

// A plausible WhatsApp number: digits only (an optional leading + is stripped before
// this check runs), long enough to be a real number with country code.
const RAW_NUMBER_PATTERN = /^\d{8,15}$/

export function NewChatModal({ onClose }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) return undefined

    const timer = setTimeout(() => {
      setIsLoading(true)
      searchContacts(trimmed)
        .then((data) => setResults(data.items || []))
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const displayResults = query.trim() ? results : []

  function goToChat(conversation) {
    dispatch(openConversation(conversation.mobile))
    navigate(buildChatUrl(conversation))
    onClose()
  }

  const rawDigits = query.trim().replace(/^\+/, '')
  const canStartWithRawNumber = RAW_NUMBER_PATTERN.test(rawDigits) && !displayResults.some((c) => c.mobile === rawDigits)

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-wa-bg" role="dialog" aria-label="Start a new chat">
      <div className="flex items-center gap-4 border-b border-wa-border bg-wa-panel px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Close" className="text-wa-text-secondary hover:text-wa-text-primary">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />
          </svg>
        </button>
        <span className="text-base font-medium text-wa-text-primary">New chat</span>
      </div>

      <div className="border-b border-wa-border px-3 py-2">
        <div className="flex items-center gap-3 rounded-[100px] bg-wa-panel px-3 py-1.5">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-wa-text-secondary">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14" />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or enter a phone number"
            className="w-full bg-transparent text-sm text-wa-text-primary placeholder:text-wa-text-secondary focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {canStartWithRawNumber && (
          <button
            type="button"
            onClick={() => goToChat({ mobile: rawDigits })}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-wa-panel-hover"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-wa-green/15 text-wa-green">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9m1 13h-2v-3H8v-2h3V8h2v3h3v2h-3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] text-wa-text-primary">Start chat with {rawDigits}</div>
              <div className="text-xs text-wa-text-secondary">Not in your contacts</div>
            </div>
          </button>
        )}

        {isLoading && <div className="px-4 py-3 text-sm text-wa-text-secondary">Searching…</div>}

        {!isLoading &&
          displayResults.map((contact) => (
            <button
              key={contact.mobile}
              type="button"
              onClick={() => goToChat(contact)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-wa-panel-hover"
            >
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: avatarColorFor(contact.mobile) || '#546069' }}
              >
                {initialsFor(contact.name || contact.mobile)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] text-wa-text-primary">{contact.name || contact.mobile}</div>
                <div className="truncate text-xs text-wa-text-secondary">{contact.mobile}</div>
              </div>
            </button>
          ))}

        {!isLoading && !canStartWithRawNumber && displayResults.length === 0 && query.trim() && (
          <div className="px-4 py-3 text-sm text-wa-text-secondary">No contacts found.</div>
        )}
      </div>
    </div>
  )
}
