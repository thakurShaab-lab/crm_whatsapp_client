import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from './EmptyState.jsx'
import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import { MessageComposer } from './MessageComposer.jsx'
import { useContact } from '../../hooks/useContact'
import { useConversationSubscription } from '../../hooks/useSocketEvents'
import { fetchThreadMessages, fetchMoreThreadMessages } from '../../store/messagesSlice'
import { markConversationRead } from '../../store/conversationsSlice'

const CHAT_CONTEXT_KEYS = [
  'ctrId', 'for', 'refid', 'def', 'view', 'cname', 'viewfrom', 'is_chat', 'is_on_right', 'useradminid', 'wabano', 'wanum',
]

export function ChatPanel({ mobile }) {
  useConversationSubscription(mobile)
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const { contact } = useContact(mobile)
  const thread = useSelector((state) => state.messages.byMobile[mobile]) || { items: [], status: 'idle', nextCursor: null }

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

  if (mobile == null) {
    return <EmptyState />
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <ChatHeader contact={contact} />

      {thread.status === 'loading' ? (
        <div className="flex flex-1 items-center justify-center bg-wa-chat-bg text-sm text-wa-text-secondary">
          Loading conversation…
        </div>
      ) : (
        <MessageList
          messages={thread.items}
          onLoadOlder={() => dispatch(fetchMoreThreadMessages({ mobile, ...chatContext }))}
          hasOlder={Boolean(thread.nextCursor)}
          isLoadingOlder={thread.status === 'loadingMore'}
        />
      )}

      <MessageComposer
        mobile={mobile}
        disabled={Boolean(contact?.stopService)}
        disabledReason="This contact replied STOP and can no longer be messaged."
      />
    </div>
  )
}
