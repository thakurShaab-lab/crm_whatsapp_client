import { describe, test, expect } from 'vitest'
import { buildOptimisticMessages, makeTempMessageId } from './optimisticMessage.js'

const MOBILE = '919999900000'

describe('makeTempMessageId', () => {
  test('is always distinct and clearly not a real (numeric) server id', () => {
    const a = makeTempMessageId()
    const b = makeTempMessageId()
    expect(a).not.toBe(b)
    expect(a.startsWith('temp-')).toBe(true)
  })
})

describe('buildOptimisticMessages', () => {
  test('text only: one optimistic text message, status sending', () => {
    const messages = buildOptimisticMessages({ mobile: MOBILE, text: 'Hello', stagedFiles: [] })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ type: 'text', text: 'Hello', media: null, status: 'sending', direction: 'outbound' })
  })

  test('empty/whitespace-only text with no files: no optimistic message at all', () => {
    expect(buildOptimisticMessages({ mobile: MOBILE, text: '   ', stagedFiles: [] })).toEqual([])
  })

  test('image only (no text): one optimistic image message, no caption', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const messages = buildOptimisticMessages({ mobile: MOBILE, text: '', stagedFiles: [{ file, previewUrl: 'blob:abc' }] })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ type: 'image', text: null, status: 'sending' })
    expect(messages[0].media).toEqual({ url: 'blob:abc', filename: 'photo.jpg', source: 'local' })
  })

  test('image + caption: one optimistic message carrying both the local preview and the caption', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const messages = buildOptimisticMessages({ mobile: MOBILE, text: 'Check this out!', stagedFiles: [{ file, previewUrl: 'blob:abc' }] })
    expect(messages).toHaveLength(1)
    expect(messages[0].text).toBe('Check this out!')
    expect(messages[0].media.url).toBe('blob:abc')
  })

  test('multiple files + one caption: only the first optimistic message gets the caption, matching the server\'s own sendPlan rule', () => {
    const file1 = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    const file2 = new File(['y'], 'b.jpg', { type: 'image/jpeg' })
    const messages = buildOptimisticMessages({
      mobile: MOBILE,
      text: 'Group caption',
      stagedFiles: [{ file: file1, previewUrl: 'blob:1' }, { file: file2, previewUrl: 'blob:2' }],
    })
    expect(messages).toHaveLength(2)
    expect(messages[0].text).toBe('Group caption')
    expect(messages[1].text).toBe(null)
    expect(messages.map((m) => m.id).length).toBe(new Set(messages.map((m) => m.id)).size) // each has a distinct id
  })

  test('a video file maps to type "video"; a non-media file maps to "document"', () => {
    const video = new File(['x'], 'clip.mp4', { type: 'video/mp4' })
    const doc = new File(['x'], 'resume.pdf', { type: 'application/pdf' })
    const [videoMessage] = buildOptimisticMessages({ mobile: MOBILE, text: '', stagedFiles: [{ file: video, previewUrl: 'blob:v' }] })
    const [docMessage] = buildOptimisticMessages({ mobile: MOBILE, text: '', stagedFiles: [{ file: doc, previewUrl: null }] })
    expect(videoMessage.type).toBe('video')
    expect(docMessage.type).toBe('document')
    expect(docMessage.media).toEqual({ url: null, filename: 'resume.pdf', source: 'local' })
  })
})
