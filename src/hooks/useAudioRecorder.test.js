import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioRecorder } from './useAudioRecorder'

/** A minimal, spec-accurate-enough fake — just enough state/events for the hook's own logic to exercise, not a real recorder. */
class FakeMediaRecorder {
  static isTypeSupported = () => true

  constructor(stream) {
    this.stream = stream
    this.state = 'inactive'
    this.listeners = {}
  }

  addEventListener(type, cb) {
    ;(this.listeners[type] ||= []).push(cb)
  }

  start() {
    this.state = 'recording'
  }

  pause() {
    this.state = 'paused'
  }

  resume() {
    this.state = 'recording'
  }

  stop() {
    if (this.state === 'inactive') return
    this.state = 'inactive'
    this.listeners.dataavailable?.forEach((cb) => cb({ data: new Blob(['fake-audio-bytes']) }))
    this.listeners.stop?.forEach((cb) => cb())
  }
}

function fakeTrack() {
  return { stop: vi.fn(), addEventListener: vi.fn() }
}

function fakeStream() {
  const tracks = [fakeTrack()]
  return { getTracks: () => tracks, getAudioTracks: () => tracks }
}

describe('useAudioRecorder', () => {
  let getUserMedia

  beforeEach(() => {
    vi.useFakeTimers()
    globalThis.MediaRecorder = FakeMediaRecorder
    getUserMedia = vi.fn().mockResolvedValue(fakeStream())
    globalThis.navigator.mediaDevices = { getUserMedia }
    // No AudioContext in this environment — the hook's live level-meter setup is
    // wrapped in try/catch and is non-fatal without it, so the state machine
    // itself (what these tests care about) is unaffected.
    delete globalThis.window.AudioContext
    delete globalThis.window.webkitAudioContext
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('starts idle, moves through requesting to recording', async () => {
    const { result } = renderHook(() => useAudioRecorder())
    expect(result.current.state).toBe('idle')

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('recording')
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  test('permission denial surfaces a human-readable error, not the raw browser error', async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('error')
    expect(result.current.error).toMatch(/microphone access was denied/i)
  })

  test('unsupported browser (no MediaRecorder) fails gracefully', async () => {
    delete globalThis.MediaRecorder
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state).toBe('error')
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  test('pause freezes the elapsed timer; resume continues it without counting the paused interval', async () => {
    const { result } = renderHook(() => useAudioRecorder())
    await act(async () => {
      await result.current.start()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    const elapsedBeforePause = result.current.elapsedMs
    expect(elapsedBeforePause).toBeGreaterThan(0)

    act(() => result.current.pause())
    expect(result.current.state).toBe('paused')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    // Frozen — no interval running while paused.
    expect(result.current.elapsedMs).toBe(elapsedBeforePause)

    act(() => result.current.resume())
    expect(result.current.state).toBe('recording')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    // Picks back up from where it paused, not from zero and not including the paused gap.
    expect(result.current.elapsedMs).toBeGreaterThan(elapsedBeforePause)
    expect(result.current.elapsedMs).toBeLessThan(elapsedBeforePause + 2000)
  })

  test('stopping a long-enough recording moves to preview with the recorded blob', async () => {
    const { result } = renderHook(() => useAudioRecorder())
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    act(() => result.current.stop())

    expect(result.current.state).toBe('preview')
    expect(result.current.audioBlob).toBeInstanceOf(Blob)
    expect(result.current.audioUrl).toBe('blob:fake-url')
  })

  test('a too-short recording is treated as an accidental tap, not sent to preview', async () => {
    const { result } = renderHook(() => useAudioRecorder())
    await act(async () => {
      await result.current.start()
    })
    // No time advanced at all — well under the minimum duration.
    act(() => result.current.stop())

    expect(result.current.state).toBe('error')
    expect(result.current.error).toMatch(/too short/i)
    expect(result.current.audioBlob).toBe(null)
  })

  test('discarding mid-recording releases the microphone and returns to idle without a preview', async () => {
    const { result } = renderHook(() => useAudioRecorder())
    let stream
    getUserMedia.mockImplementationOnce(async () => {
      stream = fakeStream()
      return stream
    })
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    act(() => result.current.discard())

    expect(result.current.state).toBe('idle')
    expect(result.current.audioBlob).toBe(null)
    stream.getTracks().forEach((track) => expect(track.stop).toHaveBeenCalled())
  })

  test('discarding from preview revokes the object URL and clears the recorded blob', async () => {
    const { result } = renderHook(() => useAudioRecorder())
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    act(() => result.current.stop())
    expect(result.current.state).toBe('preview')

    act(() => result.current.discard())

    expect(result.current.state).toBe('idle')
    expect(result.current.audioBlob).toBe(null)
    expect(result.current.audioUrl).toBe(null)
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
  })

  test('cannot start a second recording while one is already in progress', async () => {
    const { result } = renderHook(() => useAudioRecorder())
    await act(async () => {
      await result.current.start()
    })
    expect(getUserMedia).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.start()
    })
    // Still just the one call — the second start() was a no-op.
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })
})
