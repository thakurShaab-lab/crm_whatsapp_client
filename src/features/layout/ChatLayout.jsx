import { useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Sidebar } from '../sidebar/Sidebar.jsx'
import { ChatPanel } from '../chat/ChatPanel.jsx'
import { useSocketEvents } from '../../hooks/useSocketEvents'

export function ChatLayout() {
  useSocketEvents()
  // The open conversation is identified purely by the `wanum` query param (mirroring
  // the legacy `whatsapp_chat.php?wanum=...` route) rather than a URL path segment.
  const [searchParams] = useSearchParams()
  const mobile = searchParams.get('wanum')
  const mobileView = useSelector((state) => state.ui.mobileView)

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
