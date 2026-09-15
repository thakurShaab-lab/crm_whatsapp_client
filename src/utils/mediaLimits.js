// Mirrors the server's own upload limits exactly — see the server's
// src/config/index.js `upload` block and utils/mimeValidation.js's ALLOWLIST.
// Keep both in sync if either ever changes. Checked here too so an oversized
// file is rejected immediately, before ever staging/uploading it, rather than
// only failing after a round trip to the server.
export const MAX_BYTES_BY_MEDIA_TYPE = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
}

const LABEL_BY_MEDIA_TYPE = { image: 'Images', video: 'Videos', document: 'Documents' }

function mediaTypeForFile(file) {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'document'
}

/**
 * Returns null when `file` is within its media type's size limit, or a
 * human-readable rejection message otherwise. Audio is intentionally not
 * covered — voice messages/audio attachments aren't part of this size limit.
 */
export function checkFileSizeLimit(file) {
  if (file.type.startsWith('audio/')) return null

  const mediaType = mediaTypeForFile(file)
  const maxBytes = MAX_BYTES_BY_MEDIA_TYPE[mediaType]
  if (file.size <= maxBytes) return null

  const maxMb = Math.round(maxBytes / (1024 * 1024))
  return `${LABEL_BY_MEDIA_TYPE[mediaType]} must be ${maxMb}MB or smaller — "${file.name}" is too large to send.`
}
