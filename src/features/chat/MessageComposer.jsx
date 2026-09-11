import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setDraft, clearDraft, toggleAttachmentMenu, toggleEmojiPicker, closeMenus } from '../../store/uiSlice'
import { sendMessage } from '../../store/messagesSlice'
import { formatLocationText } from '../../utils/locationText'
import { buildOptimisticMessages, makeTempMessageId } from '../../utils/optimisticMessage'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { AttachmentMenu } from './AttachmentMenu.jsx'
import { EmojiPickerPopover } from './EmojiPickerButton.jsx'
import { VoiceRecorder } from './VoiceRecorder.jsx'

// Matches the MediaRecorder mimeType this browser actually recorded with (see
// utils/audioRecording.js's getSupportedAudioMimeType) to a sensible filename
// extension, purely for a nicer stored/displayed filename — the real content
// type on the message itself always comes from the mimeType, not this guess.
function extensionForMimeType(mimeType) {
  if (!mimeType) return 'webm'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mpeg')) return 'mp3'
  return 'webm'
}

export function MessageComposer({ mobile, disabled, disabledReason, onSendTemplate }) {
  const dispatch = useDispatch()
  const draft = useSelector((state) => state.ui.composerDrafts[mobile] || '')
  const attachmentMenuOpen = useSelector((state) => state.ui.attachmentMenuOpen)
  const emojiPickerOpen = useSelector((state) => state.ui.emojiPickerOpen)

  const [stagedFiles, setStagedFiles] = useState([])
  const [stagedLocations, setStagedLocations] = useState([])
  const [sending, setSending] = useState(false)
  const textareaRef = useRef(null)
  const cameraInputRef = useRef(null)
  const attachmentRef = useRef(null) // wraps the attach button + its popup, for outside-click-to-close
  const recorder = useAudioRecorder()
  // A synchronous re-entrancy guard, not just the `sending` state: two Enter
  // keydowns (OS key-repeat, or a fast double Enter/click) each invoke this
  // handler as a separate top-level event before React ever re-renders, so
  // `sending`/`canSend` can still read stale (false) in the second call. A ref
  // flips the instant the first call starts, before anything async happens, so
  // the second call's guard below always sees the true, current value.
  const sendingRef = useRef(false)

  const hasContent = draft.trim().length > 0 || stagedFiles.length > 0 || stagedLocations.length > 0
  const canSend = !sending && hasContent
  const isRecorderActive = recorder.state !== 'idle'

  // Switching conversations mid-recording would otherwise silently keep
  // recording into whatever chat is now open — cancel it instead, exactly like
  // any other per-conversation composer state.
  useEffect(() => {
    return () => recorder.discard()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only mobile identifies "switched conversation"; recorder itself is stable
  }, [mobile])

  // Clicking anywhere outside the open attachment menu (including its own
  // trigger button, which stays inside this same ref) closes it.
  useEffect(() => {
    if (!attachmentMenuOpen) return undefined
    function handleOutsideClick(event) {
      if (!attachmentRef.current?.contains(event.target)) dispatch(closeMenus())
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [attachmentMenuOpen, dispatch])

  async function handleSend() {
    if (sendingRef.current) return
    const text = draft.trim()
    const files = stagedFiles.map((f) => f.file)
    const locations = stagedLocations
    if (!text && files.length === 0 && locations.length === 0) return

    sendingRef.current = true
    setSending(true)
    // Cleared immediately (before any request even starts), not after — so the
    // input box empties the instant submission begins, and a repeated Enter/
    // click has nothing left to resubmit even in the brief window before
    // `sendingRef` alone would have blocked it.
    dispatch(clearDraft(mobile))
    setStagedFiles([])
    setStagedLocations([])

    try {
      if (text || files.length > 0) {
        // Shown in the thread immediately (status 'sending') — see
        // messagesSlice.js's sendMessage.pending; never hidden while in flight.
        const optimisticMessages = buildOptimisticMessages({ mobile, text, stagedFiles })
        await dispatch(sendMessage({ mobile, text, files, optimisticMessages })).unwrap()
      }
      // Each shared location becomes its own message (the composer's single text field
      // can only carry one body per call) — and its own optimistic bubble.
      for (const location of locations) {
        const locationText = formatLocationText(location.latitude, location.longitude)
        const optimisticMessages = [
          {
            id: makeTempMessageId(),
            mobile,
            direction: 'outbound',
            type: 'text',
            text: locationText,
            media: null,
            status: 'sending',
            failedReason: null,
            vendorMessageId: null,
            createdAt: new Date().toISOString(),
          },
        ]
        await dispatch(sendMessage({ mobile, text: locationText, optimisticMessages })).unwrap()
      }
    } catch {
      // The failed message itself (with a retry affordance) already shows this
      // in the thread — see messagesSlice.js's sendMessage.rejected — so nothing
      // else is needed here beyond letting the composer clear its own busy state.
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }

  /** A finished voice recording is sent through the exact same pipeline as any other attached file — no parallel send path. */
  async function handleSendVoiceMessage({ blob, mimeType }) {
    if (sendingRef.current || !blob) return
    const file = new File([blob], `voice-message.${extensionForMimeType(mimeType)}`, { type: mimeType || 'audio/webm' })

    // The recording UI returns to normal immediately — the message now lives in
    // the thread as its own bubble, exactly like a just-sent text/image message.
    recorder.discard()

    sendingRef.current = true
    setSending(true)
    try {
      const optimisticMessages = buildOptimisticMessages({ mobile, text: '', stagedFiles: [{ file, previewUrl: null }] })
      await dispatch(sendMessage({ mobile, text: '', files: [file], optimisticMessages })).unwrap()
    } catch {
      // Same as above — a failed send shows as a "failed" bubble with its own retry button.
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  function addFiles(files) {
    setStagedFiles((prev) => [
      ...prev,
      ...files.map((file) => ({
        file,
        id: `${file.name}-${file.size}-${Math.random()}`,
        // Also used as the optimistic message bubble's own media.url the instant
        // Send is pressed (see utils/optimisticMessage.js) — video included so a
        // just-attached video shows its real local preview there too, not just images.
        previewUrl: file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : null,
      })),
    ])
  }

  function addLocation(location) {
    setStagedLocations((prev) => [...prev, { id: `loc-${Math.random()}`, ...location }])
  }

  function removeStagedFile(id) {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  function removeStagedLocation(id) {
    setStagedLocations((prev) => prev.filter((l) => l.id !== id))
  }

  if (disabled) {
    return (
      <div className="flex flex-shrink-0 items-center justify-center gap-3 border-t border-wa-border bg-wa-panel px-4 py-4 text-center text-sm text-wa-text-secondary">
        {disabledReason}
      </div>
    )
  }

  return (
    <div className="relative flex-shrink-0 border-t border-wa-border bg-wa-panel px-3 py-2">
      {(stagedFiles.length > 0 || stagedLocations.length > 0) && (
        <div className="mb-2 flex flex-wrap gap-2 border-b border-wa-border pb-2">
          {stagedFiles.map((staged) => (
            <div key={staged.id} className="relative">
              {staged.previewUrl && staged.file.type.startsWith('video/') ? (
                <video src={staged.previewUrl} muted className="h-16 w-16 rounded object-cover" />
              ) : staged.previewUrl ? (
                <img src={staged.previewUrl} alt="" className="h-16 w-16 rounded object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded bg-wa-panel-hover px-1 text-center text-[10px] text-wa-text-secondary">
                  {staged.file.name}
                </div>
              )}
              <button
                type="button"
                onClick={() => removeStagedFile(staged.id)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-wa-bg text-xs text-wa-text-primary shadow"
                aria-label="Remove attachment"
              >
                ✕
              </button>
            </div>
          ))}
          {stagedLocations.map((location) => (
            <div key={location.id} className="relative">
              <div className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded bg-wa-panel-hover text-wa-text-secondary">
                <span className="text-lg">📍</span>
                <span className="text-[10px]">Location</span>
              </div>
              <button
                type="button"
                onClick={() => removeStagedLocation(location.id)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-wa-bg text-xs text-wa-text-primary shadow"
                aria-label="Remove location"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {isRecorderActive ? (
          <VoiceRecorder recorder={recorder} onSend={handleSendVoiceMessage} onDiscard={recorder.discard} sending={sending} />
        ) : (
          <div className="flex flex-1 items-end gap-1 rounded-[24px] bg-wa-panel-textarea px-2 py-1">
            <button
              type="button"
              onClick={() => dispatch(toggleEmojiPicker())}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-wa-text-secondary hover:bg-wa-panel-hover"
              aria-label="Choose emoji"
              title="Choose emoji"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8m3.5-9a1.5 1.5 0 1 0-1.5-1.5A1.5 1.5 0 0 0 15.5 11m-7 0A1.5 1.5 0 1 0 7 9.5 1.5 1.5 0 0 0 8.5 11m3.5 6.5a5.5 5.5 0 0 0 5-3.2H7a5.5 5.5 0 0 0 5 3.2" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => dispatch(setDraft({ mobile, text: event.target.value }))}
              onKeyDown={handleKeyDown}
              placeholder="Message"
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-sm text-wa-text-primary placeholder:text-wa-text-secondary focus:outline-none"
            />

            <div ref={attachmentRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => dispatch(toggleAttachmentMenu())}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-wa-text-secondary hover:bg-wa-panel-hover"
                aria-label="Attach file"
                title="Attach"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z" />
                </svg>
              </button>

              {attachmentMenuOpen && (
                <AttachmentMenu
                  onFilesSelected={addFiles}
                  onLocationSelected={addLocation}
                  onTemplateSelected={onSendTemplate}
                  onClose={() => dispatch(closeMenus())}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-wa-text-secondary hover:bg-wa-panel-hover"
              aria-label="Camera"
              title="Camera"
            >
              <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor">
                <path d="M9.4 3 7.8 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.8L14.6 3zM12 18a5 5 0 1 1 0-10 5 5 0 0 1 0 10m0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6" />
              </svg>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files || [])
                if (files.length > 0) addFiles(files)
                event.target.value = ''
              }}
            />
          </div>
        )}

        {!isRecorderActive &&
          (hasContent ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send message"
              title="Send"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-wa-green text-white enabled:hover:bg-wa-green-dark disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={recorder.start}
              aria-label="Record a voice message"
              title="Record a voice message"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-wa-green text-white hover:bg-wa-green-dark"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3m5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
              </svg>
            </button>
          ))}
      </div>

      {emojiPickerOpen && (
        <EmojiPickerPopover
          onSelect={(emoji) => dispatch(setDraft({ mobile, text: draft + emoji }))}
          onClose={() => dispatch(closeMenus())}
        />
      )}
    </div>
  )
}
