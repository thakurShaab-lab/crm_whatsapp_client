import { describe, test, expect } from 'vitest'
import { checkFileSizeLimit, MAX_BYTES_BY_MEDIA_TYPE } from './mediaLimits.js'

function fakeFile({ type, sizeBytes, name = 'file' }) {
  return { name, type, size: sizeBytes }
}

describe('checkFileSizeLimit', () => {
  test('accepts an image right at the 5MB limit', () => {
    expect(checkFileSizeLimit(fakeFile({ type: 'image/jpeg', sizeBytes: MAX_BYTES_BY_MEDIA_TYPE.image }))).toBe(null)
  })

  test('rejects an image one byte over the 5MB limit', () => {
    const error = checkFileSizeLimit(fakeFile({ type: 'image/jpeg', sizeBytes: MAX_BYTES_BY_MEDIA_TYPE.image + 1, name: 'photo.jpg' }))
    expect(error).toMatch(/5MB/)
    expect(error).toMatch(/photo\.jpg/)
  })

  test('accepts a video right at the 16MB limit, rejects over it', () => {
    expect(checkFileSizeLimit(fakeFile({ type: 'video/mp4', sizeBytes: MAX_BYTES_BY_MEDIA_TYPE.video }))).toBe(null)
    expect(checkFileSizeLimit(fakeFile({ type: 'video/mp4', sizeBytes: MAX_BYTES_BY_MEDIA_TYPE.video + 1 }))).toMatch(/16MB/)
  })

  test('accepts a document right at the 100MB limit, rejects over it', () => {
    expect(checkFileSizeLimit(fakeFile({ type: 'application/pdf', sizeBytes: MAX_BYTES_BY_MEDIA_TYPE.document }))).toBe(null)
    expect(checkFileSizeLimit(fakeFile({ type: 'application/pdf', sizeBytes: MAX_BYTES_BY_MEDIA_TYPE.document + 1 }))).toMatch(/100MB/)
  })

  test('a non-image/video file (e.g. a spreadsheet) is treated as a document', () => {
    const error = checkFileSizeLimit(fakeFile({ type: 'application/vnd.ms-excel', sizeBytes: MAX_BYTES_BY_MEDIA_TYPE.document + 1 }))
    expect(error).toMatch(/100MB/)
  })

  test('audio files are never rejected by this check, regardless of size', () => {
    expect(checkFileSizeLimit(fakeFile({ type: 'audio/webm', sizeBytes: MAX_BYTES_BY_MEDIA_TYPE.document * 2 }))).toBe(null)
  })
})
