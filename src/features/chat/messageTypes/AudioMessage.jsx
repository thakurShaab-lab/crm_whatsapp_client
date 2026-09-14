import { useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '../../../lib/apiConfig'
import { decodeAudioPeaksFromUrl } from '../../../utils/audioRecording'
import { formatDuration } from '../../../utils/formatTime'
import { notifyPlaying, notifyStopped } from '../../../utils/audioPlaybackCoordinator'

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}

function MicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M19 11h-1.7a5.3 5.3 0 0 1-.3 1.5l1.2 1.2A7 7 0 0 0 19 11M4.3 3 3 4.3 9 10.3V11a3 3 0 0 0 4.6 2.6l1 1A5 5 0 0 1 7 11H5.3a7 7 0 0 0 6.2 6.9V21h1.5v-3.1a7 7 0 0 0 2.1-.6l3.6 3.6 1.3-1.3zM12 15a3 3 0 0 0 2.8-2l-4.8-4.8V12a3 3 0 0 0 2 3M15 5a3 3 0 0 0-6 0v.3l6 6z" />
    </svg>
  )
}

const SEEK_STEP_SECONDS = 5

/**
 * A WhatsApp-style voice-message bubble: custom play/pause, a real waveform
 * decoded from the actual audio (never a placeholder shape), click/drag-to-seek,
 * and elapsed/total duration. Works identically for a message still `local`
 * (optimistic, playing straight from the just-recorded blob URL while it
 * uploads) and one already `vendor`/server-hosted (see mappers.js's
 * toMessageDto) — both are just a URL to this component. Timestamp, tick
 * status, and failed/retry are already handled generically by MessageBubble.jsx,
 * so this component only renders the audio content itself.
 */
export function AudioMessage({ message }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  // An optimistic message (see utils/optimisticMessage.js) already knows its own
  // duration from the recorder's timer — shown instantly, before the waveform
  // decode (below) resolves or in case it never does (e.g. blocked by CORS).
  const [duration, setDuration] = useState(message.media?.durationMs ? message.media.durationMs / 1000 : 0)
  const [peaks, setPeaks] = useState(null)
  const [failed, setFailed] = useState(false)

  const url = resolveMediaUrl(message.media?.url)

  useEffect(() => {
    if (!url) return undefined
    let cancelled = false
    decodeAudioPeaksFromUrl(url).then((result) => {
      if (cancelled || !result) return
      setPeaks(result.peaks)
      setDuration((prev) => prev || result.durationSeconds)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    // Losing the seeked-to position when a different message starts playing (the
    // coordinator pauses this one) matches every other player's own reset-on-pause
    // convention — nothing to do here beyond what the `pause`/`ended` handlers below
    // already do; this effect exists only to release the coordinator's reference
    // when THIS bubble unmounts (e.g. its message is deleted, or scrolled out of an
    // unmounted list), so a stale ref can never wrongly suppress the next player.
    const audio = audioRef.current
    return () => notifyStopped(audio)
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio || failed) return
    if (playing) {
      audio.pause()
    } else {
      notifyPlaying(audio)
      audio.play().catch(() => setFailed(true))
    }
  }

  function seekToRatio(ratio) {
    const audio = audioRef.current
    if (!audio || !duration) return
    audio.currentTime = Math.min(duration, Math.max(0, ratio * duration))
    setCurrentTime(audio.currentTime)
  }

  function handleSeekClick(event) {
    if (!duration) return
    const rect = event.currentTarget.getBoundingClientRect()
    seekToRatio((event.clientX - rect.left) / rect.width)
  }

  function handleSeekKeyDown(event) {
    const audio = audioRef.current
    if (!audio || !duration) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      seekToRatio((currentTime + SEEK_STEP_SECONDS) / duration)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      seekToRatio((currentTime - SEEK_STEP_SECONDS) / duration)
    } else if (event.key === 'Home') {
      event.preventDefault()
      seekToRatio(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      seekToRatio(1)
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      togglePlay()
    }
  }

  if (!url) {
    return <div className="flex items-center gap-2 py-1 text-xs text-wa-text-secondary">Voice message unavailable</div>
  }

  const progress = duration ? currentTime / duration : 0
  const displaySeconds = playing || currentTime > 0 ? currentTime : duration

  return (
    <div className="flex min-w-[220px] max-w-[280px] items-center gap-2 py-1">
      <button
        type="button"
        onClick={togglePlay}
        disabled={failed}
        aria-label={failed ? 'Voice message unavailable' : playing ? 'Pause voice message' : 'Play voice message'}
        title={failed ? 'Voice message unavailable' : playing ? 'Pause' : 'Play'}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-wa-green text-white disabled:opacity-40"
      >
        {failed ? <MicOffIcon /> : playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div
        role="slider"
        tabIndex={failed ? -1 : 0}
        aria-label="Seek voice message"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.round(duration))}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatDuration(currentTime * 1000)} of ${formatDuration(duration * 1000)}`}
        onClick={failed ? undefined : handleSeekClick}
        onKeyDown={failed ? undefined : handleSeekKeyDown}
        className={`flex h-8 flex-1 items-center gap-[2px] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-wa-green ${
          failed ? 'cursor-default opacity-50' : 'cursor-pointer'
        }`}
      >
        {peaks ? (
          peaks.map((peak, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={`w-[3px] flex-1 rounded-full ${index / peaks.length < progress ? 'bg-wa-green' : 'bg-wa-text-secondary/40'}`}
              style={{ height: `${Math.max(15, peak * 100)}%` }}
            />
          ))
        ) : (
          <div className="h-1 flex-1 rounded-full bg-wa-text-secondary/30" aria-hidden="true" />
        )}
      </div>

      <span className="flex-shrink-0 text-xs tabular-nums text-wa-text-secondary">{formatDuration(displaySeconds * 1000)}</span>

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false)
          notifyStopped(audioRef.current)
        }}
        onEnded={() => {
          setPlaying(false)
          setCurrentTime(0)
          notifyStopped(audioRef.current)
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
