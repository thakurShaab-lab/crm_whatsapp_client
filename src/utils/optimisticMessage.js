/** Matches the renderer keys MessageBubble.jsx dispatches on (image/video/audio/document). */
function mediaTypeFor(file) {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'document'
}

let counter = 0
/** A `temp-` prefix keeps these unambiguous against real (numeric) server ids — no risk of ever colliding with one once the send resolves and swaps this out. */
export function makeTempMessageId() {
  counter += 1
  return `temp-${Date.now()}-${counter}`
}

/**
 * Mirrors the server's utils/sendPlan.js exactly: no files -> one text message;
 * one or more files -> one message per file, with the (trimmed) caption attached
 * to only the first. Shown in the thread the instant Send is pressed (status
 * 'sending') so the message is never hidden while the request is in flight —
 * only its tick changes, once the real send resolves.
 *
 * `stagedFiles` are `{file, previewUrl}` entries (see MessageComposer.jsx) —
 * `previewUrl` (a local `URL.createObjectURL` blob for images/videos) becomes
 * this optimistic message's own `media.url`, so the actual attached photo/video
 * is what's shown immediately, not a placeholder.
 */
export function buildOptimisticMessages({ mobile, text, stagedFiles }) {
  const trimmed = (text || '').trim()
  const now = new Date().toISOString()
  const base = { mobile, direction: 'outbound', status: 'sending', failedReason: null, vendorMessageId: null, createdAt: now }

  if (stagedFiles.length === 0) {
    if (!trimmed) return []
    return [{ ...base, id: makeTempMessageId(), type: 'text', text: trimmed, media: null }]
  }

  return stagedFiles.map((staged, index) => ({
    ...base,
    id: makeTempMessageId(),
    type: mediaTypeFor(staged.file),
    text: index === 0 ? trimmed || null : null,
    media: { url: staged.previewUrl || null, filename: staged.file.name, source: 'local' },
  }))
}
