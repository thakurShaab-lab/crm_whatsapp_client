import { describe, test, expect, afterEach } from 'vitest'
import { getSupportedAudioMimeType, isVoiceRecordingSupported, computeWaveformPeaks } from './audioRecording.js'

describe('getSupportedAudioMimeType', () => {
  const originalMediaRecorder = globalThis.MediaRecorder

  afterEach(() => {
    if (originalMediaRecorder === undefined) delete globalThis.MediaRecorder
    else globalThis.MediaRecorder = originalMediaRecorder
  })

  test('returns null when MediaRecorder does not exist at all (unsupported browser)', () => {
    delete globalThis.MediaRecorder
    expect(getSupportedAudioMimeType()).toBe(null)
    expect(isVoiceRecordingSupported()).toBe(false)
  })

  test('picks the first supported type in preference order, not just any supported one', () => {
    globalThis.MediaRecorder = {
      isTypeSupported: (type) => type === 'audio/mpeg' || type === 'audio/webm',
    }
    // 'audio/webm' comes before 'audio/mpeg' in the preference list, even though both are "supported" here.
    expect(getSupportedAudioMimeType()).toBe('audio/webm')
  })

  test('falls back correctly for a Safari-like environment (no WebM/Ogg support at all)', () => {
    globalThis.MediaRecorder = { isTypeSupported: (type) => type === 'audio/mp4' }
    expect(getSupportedAudioMimeType()).toBe('audio/mp4')
  })

  test('returns null when MediaRecorder exists but supports none of the preferred types', () => {
    globalThis.MediaRecorder = { isTypeSupported: () => false }
    expect(getSupportedAudioMimeType()).toBe(null)
    expect(isVoiceRecordingSupported()).toBe(false)
  })
})

describe('computeWaveformPeaks', () => {
  function fakeAudioBuffer(samples) {
    return { getChannelData: () => Float32Array.from(samples) }
  }

  test('returns exactly `barCount` peaks, each normalized between 0 and 1', () => {
    const samples = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10) * 0.7)
    const peaks = computeWaveformPeaks(fakeAudioBuffer(samples), 20)
    expect(peaks).toHaveLength(20)
    peaks.forEach((peak) => {
      expect(peak).toBeGreaterThanOrEqual(0)
      expect(peak).toBeLessThanOrEqual(1)
    })
  })

  test('the loudest segment normalizes to peak 1 (a real, data-derived waveform, not a placeholder)', () => {
    // Quiet everywhere except one loud burst in the middle third.
    const samples = new Array(300).fill(0.01)
    for (let i = 100; i < 150; i += 1) samples[i] = 0.9
    const peaks = computeWaveformPeaks(fakeAudioBuffer(samples), 3)
    expect(peaks[1]).toBeCloseTo(1, 5)
    expect(peaks[0]).toBeLessThan(peaks[1])
    expect(peaks[2]).toBeLessThan(peaks[1])
  })

  test('silence (all zeros) never divides by zero — peaks stay finite', () => {
    const peaks = computeWaveformPeaks(fakeAudioBuffer(new Array(100).fill(0)), 10)
    peaks.forEach((peak) => expect(Number.isFinite(peak)).toBe(true))
  })
})
