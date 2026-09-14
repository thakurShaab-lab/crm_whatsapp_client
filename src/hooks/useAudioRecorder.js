import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupportedAudioMimeType } from '../utils/audioRecording'

// A sane upper bound so a forgotten-open recording can't grow unbounded — well
// past any real voice message, just a safety net. Both limits are configurable
// in one place rather than scattered as magic numbers through the UI.
const MAX_DURATION_MS = 5 * 60 * 1000
const MAX_DURATION_WARNING_MS = MAX_DURATION_MS - 10_000 // last 10s: show a "running out" warning
const MIN_DURATION_MS = 800 // shorter than this is almost always an accidental tap, matching WhatsApp's own behavior
const LOW_BITRATE = 32_000 // good voice quality at a small file size (~240KB/min)
const LEVEL_HISTORY_LENGTH = 45 // bars kept for the live recording waveform — bounded so it can never grow unbounded on a long recording
const TIMER_TICK_MS = 200

/**
 * A plain recursive function, not a hook — it needs to re-schedule itself via
 * `requestAnimationFrame`, and a `useCallback` referencing its own binding inside
 * its own body isn't allowed. Takes its refs/setter as arguments instead of
 * closing over the hook's, so it's reusable from both `start()` and `resume()`.
 */
function runLevelMeterFrame(analyserRef, levelRef, levelFrameRef, setLevel) {
  const analyser = analyserRef.current
  if (!analyser) return
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteTimeDomainData(data)
  let sumSquares = 0
  for (let i = 0; i < data.length; i += 1) {
    const centered = (data[i] - 128) / 128
    sumSquares += centered * centered
  }
  const nextLevel = Math.min(1, Math.sqrt(sumSquares / data.length) * 4)
  levelRef.current = nextLevel
  setLevel(nextLevel)
  levelFrameRef.current = requestAnimationFrame(() => runLevelMeterFrame(analyserRef, levelRef, levelFrameRef, setLevel))
}

function permissionErrorMessage(err) {
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    return 'Microphone access was denied. Allow microphone access in your browser settings to send voice messages.'
  }
  if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    return 'No microphone was found on this device.'
  }
  if (err.name === 'NotReadableError') {
    return 'The microphone is already in use by another application.'
  }
  return 'Could not access the microphone.'
}

/**
 * Voice-message recording state machine: 'idle' -> 'requesting' -> 'recording'
 * <-> 'paused' -> 'preview' -> 'idle' (discard) or handed off to the caller to
 * send. Never sends anything itself — the caller (MessageComposer.jsx) reads
 * `audioBlob`/`mimeType` once the user confirms Send and pushes it through the
 * existing sendMessage pipeline, exactly like any other attached file.
 */
export function useAudioRecorder() {
  const [state, setState] = useState('idle') // 'idle' | 'requesting' | 'recording' | 'paused' | 'preview' | 'error'
  const [error, setError] = useState(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [level, setLevel] = useState(0) // 0-1 live mic input level, for the recording indicator
  const [levelHistory, setLevelHistory] = useState([]) // rolling window of `level` samples, for the live waveform
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [mimeType, setMimeType] = useState(null)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const startTimeRef = useRef(0)
  const pausedElapsedRef = useRef(0) // elapsed active-recording time captured at the moment of the most recent pause
  const elapsedMsRef = useRef(0) // mirrors `elapsedMs` for the 'stop' event handler, which would otherwise close over a stale value
  const levelRef = useRef(0) // mirrors `level`, sampled into levelHistory on the same tick as the timer, not on every animation frame
  const timerRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const levelFrameRef = useRef(null)
  const discardOnStopRef = useRef(false)
  const audioUrlRef = useRef(null) // mirrors `audioUrl` for use in cleanup that must not depend on the latest render
  const stateRef = useRef('idle') // mirrors `state` for `start`'s re-entrancy guard, which — being a stable-identity useCallback — would otherwise only ever see the value from its very first render

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const stopLevelFrame = useCallback(() => {
    if (levelFrameRef.current != null) cancelAnimationFrame(levelFrameRef.current)
    levelFrameRef.current = null
  }, [])

  const closeAudioContext = useCallback(() => {
    stopLevelFrame()
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
    }
    audioContextRef.current = null
    analyserRef.current = null
  }, [stopLevelFrame])

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  /** Stops every mic track so the browser's own recording indicator turns off — the one thing that must always run once recording ends, success or not. */
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const revokeAudioUrl = useCallback(() => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
    setAudioUrl(null)
  }, [])

  const teardown = useCallback(() => {
    stopTimer()
    closeAudioContext()
    releaseStream()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      discardOnStopRef.current = true
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // Already stopped/inactive — nothing to do.
      }
    }
    mediaRecorderRef.current = null
  }, [closeAudioContext, releaseStream, stopTimer])

  const startLevelMeter = useCallback(() => {
    if (!analyserRef.current) return
    runLevelMeterFrame(analyserRef, levelRef, levelFrameRef, setLevel)
  }, [])

  const startTimerTick = useCallback(() => {
    stopTimer()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      elapsedMsRef.current = elapsed
      setElapsedMs(elapsed)
      setLevelHistory((prev) => [...prev.slice(-(LEVEL_HISTORY_LENGTH - 1)), levelRef.current])
      if (elapsed >= MAX_DURATION_MS && mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }, TIMER_TICK_MS)
  }, [stopTimer])

  const start = useCallback(async () => {
    // Guards against a stray double-invocation starting a second recording on
    // top of an active one — the UI already can't reach this button once a
    // recording is underway, but this makes it structurally impossible too.
    // Reads the ref, not `state` directly: `start` is a stable-identity
    // useCallback (see its dep array below), so a plain closure over `state`
    // would only ever see the value from the render that first created it.
    if (stateRef.current !== 'idle' && stateRef.current !== 'error') return

    // A fresh recording always resets any stale data from a previous one.
    revokeAudioUrl()
    setAudioBlob(null)
    setMimeType(null)
    setError(null)
    setElapsedMs(0)
    setLevelHistory([])
    elapsedMsRef.current = 0
    pausedElapsedRef.current = 0
    discardOnStopRef.current = false
    setState('requesting')

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice messages aren’t supported in this browser.')
      setState('error')
      return
    }

    const selectedMimeType = getSupportedAudioMimeType()
    if (!selectedMimeType) {
      setError('No supported audio recording format was found in this browser.')
      setState('error')
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      setError(permissionErrorMessage(err))
      setState('error')
      return
    }

    streamRef.current = stream
    chunksRef.current = []

    let recorder
    try {
      recorder = new MediaRecorder(stream, { mimeType: selectedMimeType, audioBitsPerSecond: LOW_BITRATE })
    } catch {
      setError('Could not start recording.')
      setState('error')
      releaseStream()
      return
    }
    mediaRecorderRef.current = recorder

    // The device disappearing mid-recording (unplugged, OS revokes access, ...)
    // ends the track without ever firing MediaRecorder's own 'error' — without
    // this the UI would otherwise look stuck "recording" forever.
    stream.getAudioTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state === 'inactive') return
        setError('The microphone disconnected. Please try again.')
        setState('error')
        discardOnStopRef.current = true
        stopTimer()
        closeAudioContext()
        try {
          mediaRecorderRef.current?.stop()
        } catch {
          // Already inactive — nothing to do.
        }
      })
    })

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    })

    recorder.addEventListener('stop', () => {
      const chunks = chunksRef.current
      chunksRef.current = []
      closeAudioContext()
      stopTimer()
      releaseStream()

      const finishedElapsed = elapsedMsRef.current

      if (discardOnStopRef.current) {
        discardOnStopRef.current = false
        // An error may already have been set (mic disappeared) — a plain discard
        // (Cancel button) goes back to a clean idle composer either way.
        setState((current) => (current === 'error' ? current : 'idle'))
        setElapsedMs(0)
        return
      }

      if (chunks.length === 0 || finishedElapsed < MIN_DURATION_MS) {
        setError('Recording was too short. Press the microphone again to record a voice message.')
        setState('error')
        setElapsedMs(0)
        return
      }

      const blob = new Blob(chunks, { type: selectedMimeType })
      const url = URL.createObjectURL(blob)
      audioUrlRef.current = url
      setAudioBlob(blob)
      setMimeType(selectedMimeType)
      setAudioUrl(url)
      setState('preview')
    })

    recorder.addEventListener('error', () => {
      setError('Recording failed unexpectedly.')
      setState('error')
      closeAudioContext()
      stopTimer()
      releaseStream()
    })

    recorder.start()
    startTimeRef.current = Date.now()
    setState('recording')
    startTimerTick()

    // Live level meter, purely for visual feedback — recording itself doesn't depend on it.
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const audioContext = new AudioContextClass()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      startLevelMeter()
    } catch {
      // Non-fatal — recording still works without the live level meter/waveform.
    }
  }, [closeAudioContext, releaseStream, revokeAudioUrl, startLevelMeter, startTimerTick, stopTimer])

  /** Finishes recording and moves to the preview state. Valid from either 'recording' or 'paused'. */
  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  /** Genuinely pauses capture (MediaRecorder.pause()) — the paused interval is never recorded as silence. Timer and waveform sampling freeze with it. */
  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'recording') return
    try {
      mediaRecorderRef.current.pause()
    } catch {
      return
    }
    pausedElapsedRef.current = elapsedMsRef.current
    stopTimer()
    stopLevelFrame()
    setState('paused')
  }, [stopLevelFrame, stopTimer])

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'paused') return
    try {
      mediaRecorderRef.current.resume()
    } catch {
      return
    }
    // Re-anchors the elapsed-time calculation so the paused interval is never counted.
    startTimeRef.current = Date.now() - pausedElapsedRef.current
    setState('recording')
    startTimerTick()
    startLevelMeter()
  }, [startLevelMeter, startTimerTick])

  /** Cancels mid-recording/paused (no preview shown at all) or discards from the preview state — either way, back to 'idle' with everything released. */
  const discard = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      discardOnStopRef.current = true
      mediaRecorderRef.current.stop()
      return
    }
    stopTimer()
    closeAudioContext()
    releaseStream()
    revokeAudioUrl()
    setAudioBlob(null)
    setMimeType(null)
    setElapsedMs(0)
    setLevelHistory([])
    setError(null)
    setState('idle')
  }, [closeAudioContext, releaseStream, revokeAudioUrl, stopTimer])

  const dismissError = useCallback(() => {
    setError(null)
    setState('idle')
  }, [])

  // Microphone resources are released the moment this component unmounts, not
  // just on an explicit stop/discard — e.g. navigating away mid-recording. Also
  // covers an abrupt tab close/reload, which may not run React's unmount effect
  // in time otherwise.
  useEffect(() => {
    window.addEventListener('pagehide', teardown)
    return () => {
      window.removeEventListener('pagehide', teardown)
      teardown()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on mount/unmount
  }, [])

  return {
    state,
    error,
    elapsedMs,
    level,
    levelHistory,
    audioBlob,
    audioUrl,
    mimeType,
    maxDurationMs: MAX_DURATION_MS,
    isNearMaxDuration: elapsedMs >= MAX_DURATION_WARNING_MS,
    start,
    stop,
    pause,
    resume,
    discard,
    dismissError,
  }
}
