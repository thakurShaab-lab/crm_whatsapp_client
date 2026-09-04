import { resolveMediaUrl } from '../../../lib/apiConfig'

export function VideoMessage({ message }) {
  return (
    <video controls preload="metadata" className="max-h-72 max-w-full rounded-md">
      <source src={resolveMediaUrl(message.media?.url)} type={message.media?.mimeType} />
      Your browser doesn&apos;t support embedded video.
    </video>
  )
}
