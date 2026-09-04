import { resolveMediaUrl } from '../../../lib/apiConfig'

function formatBytes(bytes) {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function DocumentMessage({ message }) {
  const filename = message.media?.filename || 'Document'
  const extension = filename.split('.').pop()?.toUpperCase() || 'FILE'

  return (
    <a
      href={resolveMediaUrl(message.media?.url)}
      target="_blank"
      rel="noreferrer"
      download={filename}
      className="flex min-w-[220px] max-w-full items-center gap-3 rounded-md bg-black/10 p-2 hover:bg-black/20"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded bg-wa-danger/80 text-[10px] font-bold text-white">
        {extension.slice(0, 4)}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm text-wa-text-primary">{filename}</div>
        <div className="text-xs text-wa-text-secondary">{formatBytes(message.media?.sizeBytes)}</div>
      </div>
    </a>
  )
}
