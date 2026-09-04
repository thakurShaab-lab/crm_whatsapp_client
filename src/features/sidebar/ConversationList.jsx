import { Virtuoso } from 'react-virtuoso'
import { ConversationListItem } from './ConversationListItem.jsx'

export function ConversationList({ items, activeMobile, onSelect, onEndReached, isLoading, isFetchingMore, isError }) {
  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-wa-text-secondary">Loading chats…</div>
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-wa-text-secondary">
        Couldn&apos;t load conversations. Check that the backend is running.
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-wa-text-secondary">
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
