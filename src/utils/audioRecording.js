// Ordered by preference: Opus-in-WebM (Chrome/Edge/Firefox) gives the best
// size/quality tradeoff for speech; Ogg/Opus covers older Firefox; MP4/AAC and
// plain MPEG are Safari's and any remaining browser's actual supported formats.
// The server accepts all of these — see server's utils/mimeValidation.js.
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
]

/** Picks the best MIME type this browser's MediaRecorder actually supports, instead of hard-coding one — returns null when MediaRecorder itself isn't available at all. */
export function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || null
}

export function isVoiceRecordingSupported() {
  return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && getSupportedAudioMimeType() != null
}

/** Downsamples one channel of a decoded AudioBuffer into `barCount` normalized (0-1) peak values — a real waveform shape from the actual recorded audio, not a simulated one. */
export function computeWaveformPeaks(audioBuffer, barCount = 40) {
  const channelData = audioBuffer.getChannelData(0)
  const samplesPerBar = Math.max(1, Math.floor(channelData.length / barCount))
  const peaks = []

  for (let i = 0; i < barCount; i += 1) {
    const start = i * samplesPerBar
    const end = Math.min(start + samplesPerBar, channelData.length)
    let max = 0
    for (let j = start; j < end; j += 1) {
      const abs = Math.abs(channelData[j])
      if (abs > max) max = abs
    }
    peaks.push(max)
  }

  const overallMax = Math.max(...peaks, 0.01)
  return peaks.map((peak) => peak / overallMax)
}

/** Decodes a recorded Blob and returns its real waveform peaks — used by the preview player, never a placeholder shape. */
export async function decodeAudioPeaks(blob, barCount = 40) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null

  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new AudioContextClass()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    return computeWaveformPeaks(audioBuffer, barCount)
  } finally {
    audioContext.close().catch(() => {})
  }
}
