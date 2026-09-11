import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../../utils/formatTime'
import { decodeAudioPeaks } from '../../utils/audioRecording'

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M6 6h12v12H6z" />
    </svg>
  )
}

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

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
    </svg>
  )
}

/** The real recorded audio's own waveform (see utils/audioRecording.js's decodeAudioPeaks) — never a simulated/placeholder shape. Bars already played are highlighted as `progress` advances. */
function Waveform({ peaks, progress }) {
  if (!peaks) {
    return <div className="h-8 flex-1 rounded bg-wa-panel-hover/40" aria-hidden="true" />
  }
  return (
    <div className="flex h-8 flex-1 items-center gap-[2px]" aria-hidden="true">
      {peaks.map((peak, index) => (
        <span
          key={index}
          className={`w-[3px] flex-1 rounded-full ${index / peaks.length < progress ? 'bg-wa-green' : 'bg-wa-text-secondary/40'}`}
          style={{ height: `${Math.max(15, peak * 100)}%` }}
        />
      ))}
    </div>
  )
}

/**
 * The 'preview' sub-state's playback UI. Rendered with `key={audioUrl}` by its
 * parent (see below) so every new recording gets a fresh mount — `playing`/
 * `playbackTime`/`peaks` all naturally start over at their initial values with
 * no reset-on-change effect needed (React's own recommended pattern for
 * "re-run this component's local state when some prop changes").
 */
function VoicePreview({ audioBlob, audioUrl, mimeType, elapsedMs, onSend, onDiscard, sending }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [peaks, setPeaks] = useState(null)
  const totalSeconds = elapsedMs / 1000

  // The real waveform is decoded once, right when this preview mounts — never a
  // placeholder shape, and never stale for a previous recording (a new
  // recording remounts this component fresh, via `key`, before this can run again).
  useEffect(() => {
    if (!audioBlob) return undefined
    let cancelled = false
    decodeAudioPeaks(audioBlob).then((result) => {
      if (!cancelled) setPeaks(result)
    })
    return () => {
      cancelled = true
    }
  }, [audioBlob])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) audio.pause()
    else audio.play()
  }

  function handleDiscard() {
    audioRef.current?.pause()
    onDiscard()
  }

  return (
    <div className="flex flex-1 items-center gap-2 rounded-[24px] bg-wa-panel-textarea px-3 py-2 transition-colors">
      <button
        type="button"
        onClick={handleDiscard}
        disabled={sending}
        aria-label="Discard recording"
        title="Discard recording"
        className="flex-shrink-0 text-wa-danger hover:opacity-80 disabled:opacity-40"
      >
        <TrashIcon />
      </button>
      <button
        type="button"
        onClick={togglePlay}
        disabled={sending}
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause' : 'Play'}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-wa-green text-white disabled:opacity-40"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <Waveform peaks={peaks} progress={totalSeconds ? playbackTime / totalSeconds : 0} />
      <span className="flex-shrink-0 text-xs tabular-nums text-wa-text-secondary">
        {formatDuration((playbackTime > 0 ? playbackTime : totalSeconds) * 1000)}
      </span>
      {/* Hidden native <audio> drives real playback of the actual recorded blob — the
          waveform/play-pause above are just a custom skin over it. Chrome's own
          `duration` metadata for a MediaRecorder-produced blob is unreliable
          (a known bug — it's often reported as Infinity), so total time comes
          from the timer-tracked `elapsedMs` above instead, not `audio.duration`. */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setPlaybackTime(0)
        }}
        onTimeUpdate={(event) => setPlaybackTime(event.currentTarget.currentTime)}
      />
      <button
        type="button"
        onClick={() => onSend({ blob: audioBlob, mimeType })}
        disabled={sending}
        aria-label="Send voice message"
        title="Send voice message"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-wa-green text-white disabled:opacity-40"
      >
        <SendIcon />
      </button>
    </div>
  )
}

/**
 * Replaces the composer's normal input row while a voice message is being
 * recorded or previewed. `recorder` is a useAudioRecorder() instance; this
 * component only renders its state and forwards user actions — all actual
 * MediaRecorder/mic handling lives in the hook.
 */
export function VoiceRecorder({ recorder, onSend, onDiscard, sending }) {
  const { state, error, elapsedMs, level, audioBlob, audioUrl, mimeType, stop, dismissError } = recorder

  if (state === 'error') {
    return (
      <div className="flex flex-1 items-center justify-between gap-3 rounded-[24px] bg-wa-panel-textarea px-4 py-2.5">
        <span className="text-sm text-wa-danger">{error}</span>
        <button type="button" onClick={dismissError} className="flex-shrink-0 text-sm font-medium text-wa-text-secondary hover:underline">
          Dismiss
        </button>
      </div>
    )
  }

  if (state === 'requesting') {
    return (
      <div className="flex flex-1 items-center gap-3 rounded-[24px] bg-wa-panel-textarea px-4 py-2.5 text-sm text-wa-text-secondary">
        Requesting microphone access…
      </div>
    )
  }

  if (state === 'recording') {
    return (
      <div className="flex flex-1 items-center gap-3 rounded-[24px] bg-wa-panel-textarea px-3 py-2 transition-colors">
        <button
          type="button"
          onClick={onDiscard}
          aria-label="Cancel recording"
          title="Cancel recording"
          className="flex-shrink-0 text-wa-danger hover:opacity-80"
        >
          <TrashIcon />
        </button>
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-wa-danger transition-opacity"
          style={{ opacity: 0.5 + level * 0.5 }}
          aria-hidden="true"
        />
        <span className="text-sm tabular-nums text-wa-text-primary">{formatDuration(elapsedMs)}</span>
        <span className="flex-1 text-center text-xs text-wa-text-secondary">Recording…</span>
        <button
          type="button"
          onClick={stop}
          aria-label="Stop recording"
          title="Stop recording"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-wa-green text-white hover:bg-wa-green-dark"
        >
          <StopIcon />
        </button>
      </div>
    )
  }

  // state === 'preview'
  return (
    <VoicePreview
      key={audioUrl}
      audioBlob={audioBlob}
      audioUrl={audioUrl}
      mimeType={mimeType}
      elapsedMs={elapsedMs}
      onSend={onSend}
      onDiscard={onDiscard}
      sending={sending}
    />
  )
}
