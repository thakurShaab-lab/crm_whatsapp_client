import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from './EmptyState.jsx'
import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import { MessageComposer } from './MessageComposer.jsx'
import { WhatsAppWindowNotice } from './WhatsAppWindowNotice.jsx'
import { SendTemplateModal } from './SendTemplateModal.jsx'
import { useConversationSubscription } from '../../hooks/useSocketEvents'
import { fetchThreadMessages, fetchMoreThreadMessages, retryMessage } from '../../store/messagesSlice'
import { markConversationRead } from '../../store/conversationsSlice'

const CHAT_CONTEXT_KEYS = [
  'ctrId', 'for', 'refid', 'def', 'view', 'cname', 'viewfrom', 'is_chat', 'is_on_right', 'useradminid', 'wabano', 'wanum',
]

export function ChatPanel({ mobile }) {
  useConversationSubscription(mobile)
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const thread = useSelector((state) => state.messages.byMobile[mobile]) || {
    items: [],
    status: 'idle',
    nextCursor: null,
    hasMore: false,
    loadMoreStatus: 'idle',
    loadMoreError: null,
    contact: null,
  }
  // The thread-fetch response already carries the contact (see messagesSlice.js's
  // fetchThreadMessages.fulfilled) — there is no need for a second, separate
  // `GET /api/contacts/:mobile` round trip just to get the same data a moment later.
  const { contact } = thread
  const loadingMoreRef = useRef(false)

  // The URL carries the same identifying query params the legacy `whatsapp_chat.php`
  // route did (see Sidebar.jsx) — forward them to the thread fetch so the server can
  // resolve/validate against tbl_account and tbl_employees the same way.
  const chatContext = useMemo(() => {
    const entries = CHAT_CONTEXT_KEYS.map((key) => [key, searchParams.get(key)]).filter(([, value]) => value != null)
    return Object.fromEntries(entries)
  }, [searchParams])

  useEffect(() => {
    if (mobile != null) {
      dispatch(fetchThreadMessages({ mobile, ...chatContext }))
      dispatch(markConversationRead(mobile))
    }
  }, [mobile, chatContext, dispatch])

  // Synchronous re-entrancy guard: the thunk's `condition` option can't reliably
  // block a true zero-delay double-dispatch (both calls can pass the `getState()`
  // check before the first dispatch's `pending` action has reduced), so this ref
  // blocks the second click at the call site instead, before any dispatch happens.
  async function handleLoadOlder() {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    try {
      await dispatch(fetchMoreThreadMessages({ mobile, ...chatContext }))
    } finally {
      loadingMoreRef.current = false
    }
  }

  // Stable across renders — MessageBubble is memoized, so a fresh function
  // identity here would force every bubble in the list to re-render, not just
  // the one being retried.
  const handleRetryMessage = useCallback(
    (message) => {
      dispatch(
        retryMessage({
          mobile,
          id: message.id,
          text: message.text || '',
          mediaUrl: message.media?.url || null,
          mediaFilename: message.media?.filename || null,
        }),
      )
    },
    [dispatch, mobile],
  )

  if (mobile == null) {
    return <EmptyState />
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <ChatHeader contact={contact} cname={chatContext.cname} />

      {thread.status === 'loading' ? (
        <div className="flex flex-1 items-center justify-center bg-wa-chat-bg text-sm text-wa-text-secondary">
          Loading conversation…
        </div>
      ) : (
        <MessageList
          messages={thread.items}
          onLoadOlder={handleLoadOlder}
          hasMore={thread.hasMore}
          isLoadingMore={thread.loadMoreStatus === 'loading'}
          loadMoreError={thread.loadMoreStatus === 'failed' ? thread.loadMoreError : null}
          onRetryMessage={handleRetryMessage}
        />
      )}

      {/* Keyed by `mobile` so switching conversations naturally resets
          `templateSentForMobile`/`showTemplateModal` via a fresh mount — React's
          own recommended pattern for "reset this state when a prop changes",
          rather than an effect (or a ref-in-render trick) explicitly resetting it. */}
      <ComposerArea key={mobile} mobile={mobile} contact={contact} ctrId={chatContext.ctrId} />
    </div>
  )
}

function ComposerArea({ mobile, contact, ctrId }) {
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  // Once an approved template has been sent for this conversation, stop showing the
  // "WhatsApp Communication Notice" banner for it — `contact.windowExpired` only
  // updates the next time the thread itself is refetched, so without this the
  // banner would keep showing a stale "you can't message them" notice right below
  // a message that was just sent.
  const [templateSentForMobile, setTemplateSentForMobile] = useState(false)

  return (
    <>
      {contact?.stopService ? (
        <MessageComposer mobile={mobile} disabled disabledReason="This contact replied STOP and can no longer be messaged." />
      ) : contact?.windowExpired && !templateSentForMobile ? (
        <WhatsAppWindowNotice onSendTemplate={() => setShowTemplateModal(true)} />
      ) : (
        <MessageComposer mobile={mobile} onSendTemplate={() => setShowTemplateModal(true)} />
      )}

      {showTemplateModal && (
        <SendTemplateModal
          mobile={mobile}
          ctrId={ctrId}
          onClose={() => setShowTemplateModal(false)}
          onSent={() => setTemplateSentForMobile(true)}
        />
      )}
    </>
  )
}
