import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupportedAudioMimeType } from '../utils/audioRecording'

// A sane upper bound so a forgotten-open recording can't grow unbounded — well
// past any real voice message, just a safety net.
const MAX_DURATION_MS = 5 * 60 * 1000
const LOW_BITRATE = 32_000 // good voice quality at a small file size (~240KB/min)

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
 * -> 'preview' -> 'idle' (discard) or handed off to the caller to send. Never
 * sends anything itself — the caller (MessageComposer.jsx) reads `audioBlob`/
 * `mimeType` once the user confirms Send and pushes it through the existing
 * sendMessage pipeline, exactly like any other attached file.
 */
export function useAudioRecorder() {
  const [state, setState] = useState('idle') // 'idle' | 'requesting' | 'recording' | 'preview' | 'error'
  const [error, setError] = useState(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [level, setLevel] = useState(0) // 0-1 live mic input level, for the recording indicator
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [mimeType, setMimeType] = useState(null)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const startTimeRef = useRef(0)
  const timerRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const levelFrameRef = useRef(null)
  const discardOnStopRef = useRef(false)
  const audioUrlRef = useRef(null) // mirrors `audioUrl` for use in cleanup that must not depend on the latest render

  const stopLevelMeter = useCallback(() => {
    if (levelFrameRef.current != null) cancelAnimationFrame(levelFrameRef.current)
    levelFrameRef.current = null
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
    }
    audioContextRef.current = null
    analyserRef.current = null
  }, [])

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
    stopLevelMeter()
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
  }, [releaseStream, stopLevelMeter, stopTimer])

  const start = useCallback(async () => {
    // A fresh recording always resets any stale data from a previous one.
    revokeAudioUrl()
    setAudioBlob(null)
    setMimeType(null)
    setError(null)
    setElapsedMs(0)
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

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    })

    recorder.addEventListener('stop', () => {
      const chunks = chunksRef.current
      chunksRef.current = []
      stopLevelMeter()
      stopTimer()
      releaseStream()

      if (discardOnStopRef.current) {
        discardOnStopRef.current = false
        setState('idle')
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
      stopLevelMeter()
      stopTimer()
      releaseStream()
    })

    recorder.start()
    startTimeRef.current = Date.now()
    setState('recording')

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setElapsedMs(elapsed)
      if (elapsed >= MAX_DURATION_MS && mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }, 200)

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

      const meterTick = () => {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteTimeDomainData(data)
        let sumSquares = 0
        for (let i = 0; i < data.length; i += 1) {
          const centered = (data[i] - 128) / 128
          sumSquares += centered * centered
        }
        setLevel(Math.min(1, Math.sqrt(sumSquares / data.length) * 4))
        levelFrameRef.current = requestAnimationFrame(meterTick)
      }
      levelFrameRef.current = requestAnimationFrame(meterTick)
    } catch {
      // Non-fatal — recording still works without the live level meter.
    }
  }, [releaseStream, revokeAudioUrl, stopLevelMeter, stopTimer])

  /** Finishes recording and moves to the preview state. */
  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  /** Cancels mid-recording (no preview shown at all) or discards from the preview state — either way, back to 'idle' with everything released. */
  const discard = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      discardOnStopRef.current = true
      mediaRecorderRef.current.stop()
      return
    }
    stopTimer()
    stopLevelMeter()
    releaseStream()
    revokeAudioUrl()
    setAudioBlob(null)
    setMimeType(null)
    setElapsedMs(0)
    setError(null)
    setState('idle')
  }, [releaseStream, revokeAudioUrl, stopLevelMeter, stopTimer])

  const dismissError = useCallback(() => {
    setError(null)
    setState('idle')
  }, [])

  // Microphone resources are released the moment this component unmounts, not
  // just on an explicit stop/discard — e.g. navigating away mid-recording.
  useEffect(() => {
    return () => {
      teardown()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on unmount
  }, [])

  return { state, error, elapsedMs, level, audioBlob, audioUrl, mimeType, start, stop, discard, dismissError }
}
