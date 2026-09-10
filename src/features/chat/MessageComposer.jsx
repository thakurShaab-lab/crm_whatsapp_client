import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setDraft, clearDraft, toggleAttachmentMenu, toggleEmojiPicker, closeMenus } from '../../store/uiSlice'
import { sendMessage } from '../../store/messagesSlice'
import { formatLocationText } from '../../utils/locationText'
import { AttachmentMenu } from './AttachmentMenu.jsx'
import { EmojiPickerPopover } from './EmojiPickerButton.jsx'

export function MessageComposer({ mobile, disabled, disabledReason, onSendTemplate }) {
  const dispatch = useDispatch()
  const draft = useSelector((state) => state.ui.composerDrafts[mobile] || '')
  const attachmentMenuOpen = useSelector((state) => state.ui.attachmentMenuOpen)
  const emojiPickerOpen = useSelector((state) => state.ui.emojiPickerOpen)

  const [stagedFiles, setStagedFiles] = useState([])
  const [stagedLocations, setStagedLocations] = useState([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const textareaRef = useRef(null)

  const canSend = !sending && (draft.trim().length > 0 || stagedFiles.length > 0 || stagedLocations.length > 0)

  async function handleSend() {
    if (!canSend) return
    setSendError(null)
    setSending(true)
    try {
      const text = draft.trim()
      const files = stagedFiles.map((f) => f.file)
      if (text || files.length > 0) {
        await dispatch(sendMessage({ mobile, text, files })).unwrap()
      }
      // Each shared location becomes its own message (the composer's single text field
      // can only carry one body per call).
      for (const location of stagedLocations) {
        await dispatch(sendMessage({ mobile, text: formatLocationText(location.latitude, location.longitude) })).unwrap()
      }
      dispatch(clearDraft(mobile))
      setStagedFiles([])
      setStagedLocations([])
    } catch (error) {
      setSendError(error.message)
    } finally {
      setSending(false)
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
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
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
              {staged.previewUrl ? (
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
        <button
          type="button"
          onClick={() => dispatch(toggleAttachmentMenu())}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-wa-text-secondary hover:bg-wa-panel-hover"
          aria-label="Attach file"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => dispatch(toggleEmojiPicker())}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-wa-text-secondary hover:bg-wa-panel-hover"
          aria-label="Choose emoji"
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
          placeholder="Type a message"
          rows={1}
          className="max-h-32 flex-1 resize-none rounded-[100px] bg-wa-panel-textarea px-3 py-2 text-sm text-wa-text-primary placeholder:text-wa-text-secondary focus:outline-none"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-wa-text-secondary enabled:hover:bg-wa-panel-hover disabled:opacity-40"
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {sendError && <div className="mt-1 text-xs text-wa-danger">Failed to send: {sendError}</div>}

      {attachmentMenuOpen && (
        <AttachmentMenu
          onFilesSelected={addFiles}
          onLocationSelected={addLocation}
          onTemplateSelected={onSendTemplate}
          onClose={() => dispatch(closeMenus())}
        />
      )}
      {emojiPickerOpen && (
        <EmojiPickerPopover
          onSelect={(emoji) => dispatch(setDraft({ mobile, text: draft + emoji }))}
          onClose={() => dispatch(closeMenus())}
        />
      )}
    </div>
  )
}
