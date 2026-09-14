/**
 * Ensures only one voice message plays at a time across the whole app — a module-level
 * singleton rather than Redux state, since "which <audio> element is currently playing"
 * is pure UI/DOM state that no other part of the app needs to read or react to.
 */
let currentlyPlaying = null

/** Call right before playing `audioEl` — pauses whatever else was playing first. */
export function notifyPlaying(audioEl) {
  if (currentlyPlaying && currentlyPlaying !== audioEl) {
    currentlyPlaying.pause()
  }
  currentlyPlaying = audioEl
}

/** Call on pause/end/unmount so a stale reference can't wrongly pause the next player. */
export function notifyStopped(audioEl) {
  if (currentlyPlaying === audioEl) currentlyPlaying = null
}
