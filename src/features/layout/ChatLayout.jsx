import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Sidebar } from '../sidebar/Sidebar.jsx'
import { ChatPanel } from '../chat/ChatPanel.jsx'
import { useSocketEvents } from '../../hooks/useSocketEvents'
import { buildChatUrl } from '../../utils/chatUrl'

export function ChatLayout() {
  useSocketEvents()
  // The open conversation is identified purely by the `wanum` query param (mirroring
  // the legacy `whatsapp_chat.php?wanum=...` route) rather than a URL path segment.
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mobile = searchParams.get('wanum')
  const mobileView = useSelector((state) => state.ui.mobileView)
  const { items: conversations, status: conversationsStatus } = useSelector((state) => state.conversations)

  // Opens the most recent conversation by default when the panel first loads
  // with none already selected (e.g. a bare `/` or `/chat` URL) — once only, via
  // the ref, so this never fights a deliberate later navigation back to no chat
  // selected. `items` is already most-recent-first, same order the sidebar shows.
  // Only the URL changes here — `mobileView` is deliberately left alone, so a
  // narrow/mobile screen still opens on the chat list, not straight into a chat.
  const hasAutoOpenedRef = useRef(false)
  useEffect(() => {
    if (hasAutoOpenedRef.current || mobile != null) return
    if (conversationsStatus !== 'succeeded') return
    hasAutoOpenedRef.current = true
    if (conversations.length > 0) {
      navigate(buildChatUrl(conversations[0]), { replace: true })
    }
  }, [mobile, conversations, conversationsStatus, navigate])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-wa-bg">
      <div className={`w-full flex-shrink-0 md:w-[400px] md:flex ${mobileView === 'chat' ? 'hidden' : 'flex'}`}>
        <Sidebar activeMobile={mobile} />
      </div>
      <div className={`min-w-0 flex-1 md:flex ${mobileView === 'chat' ? 'flex' : 'hidden'}`}>
        <ChatPanel mobile={mobile} />
      </div>
    </div>
  )
}
