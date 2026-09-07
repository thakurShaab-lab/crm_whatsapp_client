import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { initialsFor, avatarColorFor } from '../../utils/avatar'
import { formatSidebarTimestamp } from '../../utils/formatTime'
import { parseLocationText } from '../../utils/locationText'
import { deleteConversation } from '../../store/conversationsSlice'
import { TickIcon } from '../chat/TickIcon.jsx'

const TYPE_PREVIEW = {
  image: '📷 Photo',
  video: '🎥 Video',
  audio: '🎤 Voice message',
  document: '📄 Document',
}

export function ConversationListItem({ conversation, active, onClick }) {
  const dispatch = useDispatch()
  const { name, mobile, unreadCount, lastMessage, stopService } = conversation
  const avatarColor = avatarColorFor(mobile)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  const preview = lastMessage
    ? lastMessage.type === 'text'
      ? parseLocationText(lastMessage.text)
        ? '📍 Location'
        : lastMessage.text
      : TYPE_PREVIEW[lastMessage.type] || lastMessage.type
    : 'No messages yet'

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`group relative flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
        active ? 'bg-wa-panel-hover' : 'hover:bg-wa-panel'
      }`}
    >
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: avatarColor || '#546069' }}
      >
        {initialsFor(name || mobile)}
      </div>

      <div className="min-w-0 flex-1 border-b border-wa-border pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] text-wa-text-primary">{name || mobile}</span>
          <span className={`flex-shrink-0 text-xs ${unreadCount > 0 ? 'text-wa-green' : 'text-wa-text-secondary'} group-hover:hidden`}>
            {formatSidebarTimestamp(conversation.updatedAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 truncate text-sm text-wa-text-secondary">
            {lastMessage?.direction === 'outbound' && <TickIcon status={lastMessage.status} className="flex-shrink-0" />}
            <span className="truncate">{stopService ? 'Opted out (STOP)' : preview}</span>
          </span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-wa-green px-1.5 text-xs font-semibold text-wa-bg">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Hover-revealed menu trigger, positioned over the timestamp (which hides on hover) — matches real WhatsApp Web. */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setMenuOpen((open) => !open)
        }}
        aria-label="Chat options"
        className="absolute right-2 top-3 hidden h-7 w-7 items-center justify-center rounded-full text-wa-text-secondary hover:bg-wa-panel-hover group-hover:flex"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 8a2 2 0 1 0-2-2 2 2 0 0 0 2 2m0 2a2 2 0 1 0 2 2 2 2 0 0 0-2-2m0 6a2 2 0 1 0 2 2 2 2 0 0 0-2-2" />
        </svg>
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          role="presentation"
          onClick={(event) => event.stopPropagation()}
          className="absolute right-2 top-10 z-10 w-44 overflow-hidden rounded-lg bg-wa-panel shadow-xl"
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setConfirmOpen(true)
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-wa-text-primary hover:bg-wa-panel-hover"
          >
            Delete chat
          </button>
        </div>
      )}

      {confirmOpen && (
        <div
          role="presentation"
          onClick={(event) => event.stopPropagation()}
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40"
        >
          <div className="w-80 rounded-lg bg-wa-panel p-5 shadow-xl">
            <h2 className="text-base font-medium text-wa-text-primary">Delete this chat?</h2>
            <p className="mt-2 text-sm text-wa-text-secondary">
              Messages with {name || mobile} will be removed from this list. If they message again, the chat will reappear.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded px-3 py-1.5 text-sm font-medium text-wa-text-secondary hover:bg-wa-panel-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false)
                  dispatch(deleteConversation(mobile))
                }}
                className="rounded px-3 py-1.5 text-sm font-medium text-wa-danger hover:bg-wa-panel-hover"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
