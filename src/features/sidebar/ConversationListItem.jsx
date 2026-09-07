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
  const { name, mobile, unreadCount, lastMessage, stopService } = conversation
  const avatarColor = avatarColorFor(mobile)
  const preview = lastMessage
    ? lastMessage.type === 'text'
      ? parseLocationText(lastMessage.text)
        ? '📍 Location'
        : lastMessage.text
      : TYPE_PREVIEW[lastMessage.type] || lastMessage.type
    : 'No messages yet'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
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
          <span className={`flex-shrink-0 text-xs ${unreadCount > 0 ? 'text-wa-green' : 'text-wa-text-secondary'}`}>
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
  )
}
