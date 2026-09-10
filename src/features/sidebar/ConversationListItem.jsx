import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { deleteConversation } from '../../store/conversationsSlice'
import { initialsFor, avatarColorFor } from '../../utils/avatar'
import { formatSidebarTimestamp } from '../../utils/formatTime'
import { parseLocationText } from '../../utils/locationText'
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
  const preview = lastMessage
    ? lastMessage.type === 'text'
      ? parseLocationText(lastMessage.text)
        ? '📍 Location'
        : lastMessage.text
      : TYPE_PREVIEW[lastMessage.type] || lastMessage.type
    : 'No messages yet'

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    function handleOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  function handleDelete() {
    setMenuOpen(false)
    const confirmed = window.confirm(`Delete this chat with ${name || mobile}? This permanently deletes all its messages and cannot be undone.`)
    if (confirmed) dispatch(deleteConversation(mobile))
  }

  return (
    <div className={`group relative flex w-full items-center gap-3 px-3 py-3 transition-colors ${active ? 'bg-wa-panel-hover' : 'hover:bg-wa-panel'}`}>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: avatarColor || '#546069' }}
        >
          {initialsFor(name || mobile)}
        </div>

        <div className="min-w-0 flex-1 border-b border-wa-border pb-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[15px] text-wa-text-primary">{name || mobile}</span>
            <span
              className={`flex-shrink-0 text-xs group-hover:invisible ${unreadCount > 0 ? 'text-wa-green' : 'text-wa-text-secondary'}`}
            >
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
      </button>

      <div ref={menuRef} className="absolute right-3 top-3">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Chat options"
          className="hidden h-6 w-6 items-center justify-center rounded-full text-wa-text-secondary hover:bg-wa-panel-hover group-hover:flex"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 8a2 2 0 1 0-2-2 2 2 0 0 0 2 2m0 2a2 2 0 1 0 2 2 2 2 0 0 0-2-2m0 6a2 2 0 1 0 2 2 2 2 0 0 0-2-2" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-md border border-wa-border bg-wa-panel shadow-lg">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm text-wa-danger hover:bg-wa-panel-hover"
            >
              Delete chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
