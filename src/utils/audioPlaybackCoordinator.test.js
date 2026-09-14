import { describe, test, expect, vi } from 'vitest'
import { notifyPlaying, notifyStopped } from './audioPlaybackCoordinator.js'

function fakeAudioEl() {
  return { pause: vi.fn() }
}

describe('audioPlaybackCoordinator', () => {
  test('starting a second player pauses the first', () => {
    const first = fakeAudioEl()
    const second = fakeAudioEl()

    notifyPlaying(first)
    notifyPlaying(second)

    expect(first.pause).toHaveBeenCalledTimes(1)
    expect(second.pause).not.toHaveBeenCalled()
  })

  test('re-notifying the same element playing again does not pause itself', () => {
    const el = fakeAudioEl()
    notifyPlaying(el)
    notifyPlaying(el)
    expect(el.pause).not.toHaveBeenCalled()
  })

  test('a stopped player, once forgotten, cannot wrongly pause the next one that starts', () => {
    const first = fakeAudioEl()
    const second = fakeAudioEl()

    notifyPlaying(first)
    notifyStopped(first)
    notifyPlaying(second)

    // Nothing was "still playing" when `second` started, so nothing gets paused.
    expect(first.pause).not.toHaveBeenCalled()
    expect(second.pause).not.toHaveBeenCalled()
  })
})
