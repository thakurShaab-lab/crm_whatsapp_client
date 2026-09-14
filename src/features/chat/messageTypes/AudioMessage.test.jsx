import '@testing-library/jest-dom'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AudioMessage } from './AudioMessage.jsx'

function makeMessage(overrides = {}) {
  return {
    id: 1,
    type: 'audio',
    direction: 'outbound',
    status: 'sent',
    media: { url: 'https://example.test/media/voice-1.webm', filename: 'voice-message.webm', source: 'vendor' },
    ...overrides,
  }
}

describe('AudioMessage', () => {
  let originalFetch

  beforeEach(() => {
    // jsdom implements neither real audio playback nor AudioContext — stub the
    // bits this component actually calls so play/pause are observable, and let
    // the waveform decode fail closed (no AudioContext -> decodeAudioPeaks
    // returns null), which is itself the correct, already-handled fallback path.
    window.HTMLMediaElement.prototype.play = vi.fn(function play() {
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    })
    window.HTMLMediaElement.prototype.pause = vi.fn(function pause() {
      this.dispatchEvent(new Event('pause'))
    })
    originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('no network in tests'))
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  test('shows a fallback instead of a player when the message has no media url', () => {
    render(<AudioMessage message={makeMessage({ media: null })} />)
    expect(screen.getByText(/voice message unavailable/i)).toBeInTheDocument()
  })

  test('shows the optimistic duration immediately, before any waveform decode resolves', () => {
    render(<AudioMessage message={makeMessage({ media: { url: 'blob:fake', durationMs: 7000 } })} />)
    expect(screen.getByText('0:07')).toBeInTheDocument()
  })

  test('clicking play calls audio.play() and switches to the pause icon/label', () => {
    render(<AudioMessage message={makeMessage()} />)
    fireEvent.click(screen.getByLabelText('Play voice message'))
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Pause voice message')).toBeInTheDocument()
  })

  test('playing a second voice message pauses the first (single global playback)', () => {
    render(
      <>
        <AudioMessage message={makeMessage({ id: 1, media: { url: 'https://example.test/a.webm' } })} />
        <AudioMessage message={makeMessage({ id: 2, media: { url: 'https://example.test/b.webm' } })} />
      </>,
    )
    const [firstPlay, secondPlay] = screen.getAllByLabelText('Play voice message')

    fireEvent.click(firstPlay)
    expect(screen.getByLabelText('Pause voice message')).toBeInTheDocument()

    fireEvent.click(secondPlay)
    // Pause was invoked on the first player as a side effect of the coordinator,
    // and both bubbles are back to a "Play" affordance except the one now playing.
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    expect(screen.getAllByLabelText('Play voice message')).toHaveLength(1)
    expect(screen.getByLabelText('Pause voice message')).toBeInTheDocument()
  })

  test('a corrupt/unreadable audio source shows a disabled, human-readable failure state, not a broken player', () => {
    render(<AudioMessage message={makeMessage()} />)
    const audio = document.querySelector('audio')
    fireEvent.error(audio)
    expect(screen.getByLabelText('Voice message unavailable')).toBeDisabled()
  })
})
