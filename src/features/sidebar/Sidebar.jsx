import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { SidebarHeader } from './SidebarHeader.jsx'
import { ConversationList } from './ConversationList.jsx'
import { openConversation } from '../../store/uiSlice'
import { fetchConversations, fetchMoreConversations, markConversationRead } from '../../store/conversationsSlice'

export function Sidebar({ activeMobile }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { items, status, nextCursor } = useSelector((state) => state.conversations)

  useEffect(() => {
    dispatch(fetchConversations({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Builds the same query-param shape the legacy `whatsapp_chat.php?...` route used
  // when a chat is opened from the sidebar (def/view/viewfrom/is_chat are fixed for
  // this entry point — a chat opened from a CRM record page instead would carry
  // different values, but that flow doesn't exist in this build).
  function handleSelect(conversation) {
    const { mobile, name, countryCode, accountId, for: forType, userAdminId, wabano } = conversation
    const params = new URLSearchParams({ def: 'Y', view: 'inbox', viewfrom: 'Y', is_chat: 'Y', is_on_right: 'Y', wanum: mobile })
    if (countryCode != null) params.set('ctrId', String(countryCode))
    if (forType) params.set('for', forType)
    if (accountId != null) params.set('refid', String(accountId))
    if (name) params.set('cname', name)
    if (userAdminId != null) params.set('useradminid', String(userAdminId))
    if (wabano) params.set('wabano', wabano)

    dispatch(openConversation(mobile))
    navigate(`/chat?${params.toString()}`)
    if (conversation.unreadCount > 0) {
      dispatch(markConversationRead(mobile))
    }
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-wa-border bg-wa-bg">
      <SidebarHeader />
      <ConversationList
        items={items}
        activeMobile={activeMobile}
        onSelect={handleSelect}
        onEndReached={() => nextCursor && status !== 'loadingMore' && dispatch(fetchMoreConversations())}
        isLoading={status === 'loading'}
        isFetchingMore={status === 'loadingMore'}
        isError={status === 'failed'}
      />
    </div>
  )
}
