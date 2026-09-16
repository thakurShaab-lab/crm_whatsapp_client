import { Virtuoso } from 'react-virtuoso'
import { ConversationListItem } from './ConversationListItem.jsx'

const CHAT_ICON = (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" className="text-wa-text-secondary/50">
    <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2Z" />
  </svg>
)

export function ConversationList({ items, activeMobile, onSelect, onEndReached, isLoading, isFetchingMore, isError }) {
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-wa-text-secondary">
        <svg viewBox="0 0 16 16" width="24" height="24" className="animate-spin text-wa-text-secondary/60">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30 40" strokeLinecap="round" />
        </svg>
        Loading chats…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-wa-text-secondary">
        {CHAT_ICON}
        Couldn&apos;t load conversations. Check that the backend is running.
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-wa-text-secondary">
        {CHAT_ICON}
        No conversations here yet.
      </div>
    )
  }

  return (
    <Virtuoso
      className="flex-1"
      data={items}
      endReached={onEndReached}
      overscan={400}
      itemContent={(_, conversation) => (
        <ConversationListItem
          key={conversation.mobile}
          conversation={conversation}
          active={conversation.mobile === activeMobile}
          onClick={() => onSelect(conversation)}
        />
      )}
      components={{
        Footer: () =>
          isFetchingMore ? <div className="py-3 text-center text-xs text-wa-text-secondary">Loading more…</div> : null,
      }}
    />
  )
}
