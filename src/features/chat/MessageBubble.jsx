import { memo } from 'react'
import { TextMessage } from './messageTypes/TextMessage.jsx'
import { ImageMessage } from './messageTypes/ImageMessage.jsx'
import { VideoMessage } from './messageTypes/VideoMessage.jsx'
import { AudioMessage } from './messageTypes/AudioMessage.jsx'
import { DocumentMessage } from './messageTypes/DocumentMessage.jsx'
import { LocationMessage } from './messageTypes/LocationMessage.jsx'
import { TickIcon } from './TickIcon.jsx'
import { formatMessageTime } from '../../utils/formatTime'
import { parseLocationText } from '../../utils/locationText'

const RENDERERS = {
  text: TextMessage,
  image: ImageMessage,
  video: VideoMessage,
  audio: AudioMessage,
  document: DocumentMessage,
  location: LocationMessage,
}

function MessageBubbleImpl({ message }) {
  const isOutbound = message.direction === 'outbound'
  // The real schema has no dedicated location type — a shared location travels as a
  // specially-formatted text message and is recognized back here for rendering.
  const location = message.type === 'text' ? parseLocationText(message.text) : null
  const Renderer = location ? LocationMessage : RENDERERS[message.type] || TextMessage
  const renderMessage = location ? { ...message, location } : message

  return (
    <div className={`flex px-4 py-0.5 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[65%] rounded-lg px-2 py-1.5 shadow-sm ${
          isOutbound ? 'bg-wa-outgoing' : 'bg-wa-panel'
        }`}
      >
        <Renderer message={renderMessage} />
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-wa-text-secondary">
          <span>{formatMessageTime(message.createdAt)}</span>
          {isOutbound && <TickIcon status={message.status} />}
        </div>
        {message.status === 'failed' && (
          <div className="mt-1 text-[11px] text-wa-danger">
            {message.failedReason || 'Failed to send'}
          </div>
        )}
      </div>
    </div>
  )
}

export const MessageBubble = memo(MessageBubbleImpl)