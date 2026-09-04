import { useEffect, useRef, useState } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { MessageBubble } from './MessageBubble.jsx'
import { DateSeparator } from './DateSeparator.jsx'
import { dayKey } from '../../utils/formatTime'

const START_INDEX = 1_000_000

export function MessageList({ messages, onLoadOlder, hasOlder, isLoadingOlder }) {
  const virtuosoRef = useRef(null)
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX)
  const prevFirstIdRef = useRef(null)
  const [atBottom, setAtBottom] = useState(true)
  const [newMessagePill, setNewMessagePill] = useState(false)
  const prevLastIdRef = useRef(null)

  // Keeps the scroll position anchored when an older page is prepended to the front.
  useEffect(() => {
    if (messages.length === 0) return
    const newFirstId = messages[0].id
    if (prevFirstIdRef.current !== null && newFirstId !== prevFirstIdRef.current) {
      const addedCount = messages.findIndex((m) => m.id === prevFirstIdRef.current)
      if (addedCount > 0) setFirstItemIndex((prev) => prev - addedCount)
    }
    prevFirstIdRef.current = newFirstId
  }, [messages])

  // Shows a "new messages" pill instead of forcing scroll when the user is reading older history.
  useEffect(() => {
    if (messages.length === 0) return
    const newLastId = messages[messages.length - 1].id
    if (prevLastIdRef.current !== null && newLastId !== prevLastIdRef.current && !atBottom) {
      setNewMessagePill(true)
    }
    prevLastIdRef.current = newLastId
  }, [messages, atBottom])

  function scrollToBottom() {
    virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' })
    setNewMessagePill(false)
  }

  return (
    <div className="chat-wallpaper relative flex-1 bg-wa-chat-bg">
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        data={messages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={messages.length - 1}
        alignToBottom
        followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
        atBottomStateChange={(bottom) => {
          setAtBottom(bottom)
          if (bottom) setNewMessagePill(false)
        }}
        startReached={() => hasOlder && !isLoadingOlder && onLoadOlder?.()}
        increaseViewportBy={{ top: 400, bottom: 200 }}
        components={{
          Header: () =>
            isLoadingOlder ? (
              <div className="py-3 text-center text-xs text-wa-text-secondary">Loading older messages…</div>
            ) : null,
        }}
        itemContent={(index, message) => {
          const arrayIndex = index - firstItemIndex
          const prevMessage = arrayIndex > 0 ? messages[arrayIndex - 1] : null
          const showDateSeparator = !prevMessage || dayKey(prevMessage.createdAt) !== dayKey(message.createdAt)

          return (
            <div>
              {showDateSeparator && <DateSeparator date={message.createdAt} />}
              <MessageBubble message={message} />
            </div>
          )
        }}
      />

      {newMessagePill && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-wa-panel px-4 py-1.5 text-xs text-wa-text-primary shadow-lg hover:bg-wa-panel-hover"
        >
          New messages ↓
        </button>
      )}
    </div>
  )
}
