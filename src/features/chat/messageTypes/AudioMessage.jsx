import { resolveMediaUrl } from '../../../lib/apiConfig'

export function AudioMessage({ message }) {
  return (
    <audio controls preload="metadata" className="h-10 max-w-full min-w-[220px]">
      <source src={resolveMediaUrl(message.media?.url)} type={message.media?.mimeType} />
      Your browser doesn&apos;t support embedded audio.
    </audio>
  )
}
