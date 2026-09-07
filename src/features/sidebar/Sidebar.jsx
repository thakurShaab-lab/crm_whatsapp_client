import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { SidebarHeader } from './SidebarHeader.jsx'
import { ConversationList } from './ConversationList.jsx'
import { NewChatModal } from './NewChatModal.jsx'
import { openConversation } from '../../store/uiSlice'
import { fetchConversations, fetchMoreConversations, markConversationRead } from '../../store/conversationsSlice'
import { buildChatUrl } from '../../utils/chatUrl'

export function Sidebar({ activeMobile }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { items, status, nextCursor } = useSelector((state) => state.conversations)
  const [showNewChat, setShowNewChat] = useState(false)

  useEffect(() => {
    dispatch(fetchConversations({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSelect(conversation) {
    dispatch(openConversation(conversation.mobile))
    navigate(buildChatUrl(conversation))
    if (conversation.unreadCount > 0) {
      dispatch(markConversationRead(conversation.mobile))
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col border-r border-wa-border bg-wa-bg">
      <SidebarHeader onNewChat={() => setShowNewChat(true)} />
      <ConversationList
        items={items}
        activeMobile={activeMobile}
        onSelect={handleSelect}
        onEndReached={() => nextCursor && status !== 'loadingMore' && dispatch(fetchMoreConversations())}
        isLoading={status === 'loading'}
        isFetchingMore={status === 'loadingMore'}
        isError={status === 'failed'}
      />
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </div>
  )
}
