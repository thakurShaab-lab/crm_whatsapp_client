import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { getTemplates, getTemplateDetail } from '../../lib/api'
import { sendTemplateMessage } from '../../store/messagesSlice'

/** Placeholder shown in the preview for an auto-resolved variable that hasn't been typed by anyone — mirrors the legacy popup's "Auto Fetch" text. */
const AUTO_FETCH_PLACEHOLDER = 'Auto Fetch'

function buildPreviewText(description, variables, manualValues) {
  let text = description || ''
  variables.forEach((variable, index) => {
    const value = variable.editable ? manualValues[variable.id]?.trim() || AUTO_FETCH_PLACEHOLDER : AUTO_FETCH_PLACEHOLDER
    text = text.replaceAll(`{{${index + 1}}}`, value)
  })
  return text
}

/**
 * Recreates send_whatsapp_pop_other.php + ajax_response.php's
 * `get_label_by_whatsapp_template` for a single already-open conversation (not the
 * popup's bulk-recipient-list / invoice-attachment-button paths, which don't apply
 * here): picking a template from the dropdown drives its own section —
 * - a media upload box (showing the template's own attached file, replaceable)
 *   for image/video/document templates that aren't invoice-attachment templates;
 * - a single readonly "Auto Fetch" field instead, for invoice-attachment templates;
 * - every `{{N}}` variable rendered as a field, readonly with an "Auto Fetch" (or
 *   type-specific) placeholder unless it's one of the three manually-typed kinds
 *   (`other~other_text/_time/_date` — see templatesController.js's toVariableDto),
 *   or "No Any Variable In Selected Template" when the template has none at all.
 * Send is available immediately once a template is selected, exactly like legacy —
 * not gated behind having clicked "View Template Preview" first.
 */
export function SendTemplateModal({ mobile, ctrId, onClose }) {
  const dispatch = useDispatch()
  const fileInputRef = useRef(null)

  const [templates, setTemplates] = useState([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const [manualValues, setManualValues] = useState({})
  const [file, setFile] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState(null)

  useEffect(() => {
    getTemplates()
      .then((data) => setTemplates(data.items || []))
      .catch(() => setTemplates([]))
      .finally(() => setIsLoadingTemplates(false))
  }, [])

  function selectTemplate(id) {
    setSelectedId(id)
    setDetail(null)
    setManualValues({})
    setFile(null)
    setShowPreview(false)
    setSendError(null)
    if (!id) return
    setIsLoadingDetail(true)
    getTemplateDetail(id)
      .then((data) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setIsLoadingDetail(false))
  }

  const variables = useMemo(() => detail?.variables || [], [detail])
  const editableVariables = useMemo(() => variables.filter((v) => v.editable), [variables])
  // Matches ajax_response.php's own check: only these three media types ever get an
  // upload box, and only when the template isn't an invoice-attachment template
  // (which shows a single readonly "Auto Fetch" field instead — see below).
  const hasMediaUpload = Boolean(detail) && !detail.isInvoiceTemplate && ['image', 'video', 'document'].includes(detail.mediaType)
  const allVariablesFilled = editableVariables.every((v) => manualValues[v.id]?.trim())
  const previewText = useMemo(
    () => (detail ? buildPreviewText(detail.description, detail.variables || [], manualValues) : ''),
    [detail, manualValues],
  )

  async function handleSend() {
    if (!window.confirm('Are You Sure you want to Send The Whatsapp?')) return
    setSendError(null)
    setIsSending(true)
    try {
      await dispatch(sendTemplateMessage({ mobile, templateId: selectedId, manualValues, file, ctrId })).unwrap()
      onClose()
    } catch (error) {
      setSendError(error.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-label="Send Whatsapp Message">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg bg-wa-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-wa-border px-4 py-3">
          <h2 className="text-base font-medium text-wa-text-primary">Send Whatsapp Message</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-wa-text-secondary hover:text-wa-text-primary">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-wa-text-secondary">Total Selected Members :</label>
              <div className="rounded-md border border-wa-border px-3 py-2 text-sm font-medium text-wa-danger">1 Members</div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-wa-text-secondary">Select Whatsapp Template :</label>
              <select
                value={selectedId}
                onChange={(event) => selectTemplate(event.target.value ? Number(event.target.value) : '')}
                className="w-full rounded-md border border-wa-border bg-wa-panel-textarea px-3 py-2 text-sm text-wa-text-primary focus:outline-none"
              >
                <option value="">--Select--</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingTemplates && <div className="py-2 text-sm text-wa-text-secondary">Loading templates…</div>}
          {isLoadingDetail && <div className="py-2 text-sm text-wa-text-secondary">Loading template…</div>}

          {detail && !isLoadingDetail && (
            <div className="flex flex-col gap-3">
              {detail.isInvoiceTemplate ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-wa-text-secondary">Media File:</label>
                  <input
                    type="text"
                    readOnly
                    placeholder="Auto Fetch"
                    className="w-full rounded-md border border-wa-border bg-wa-panel-textarea px-3 py-2 text-sm text-wa-text-secondary focus:outline-none"
                  />
                </div>
              ) : (
                hasMediaUpload && (
                  <div className="rounded-md border border-wa-border p-3">
                    <label className="mb-1 block text-xs font-medium text-wa-text-secondary">Media File:</label>
                    <div className="rounded-md border border-wa-border px-3 py-2 text-sm text-wa-text-primary">
                      {file?.name ? (
                        <span className="text-wa-green">{file.name}</span>
                      ) : detail.vendorMediaUrl ? (
                        <a href={detail.vendorMediaUrl} target="_blank" rel="noreferrer" className="text-wa-green hover:underline">
                          {detail.mediaFilenameShort || detail.mediaType}
                        </a>
                      ) : (
                        <span className="text-wa-green">{detail.mediaFilenameShort || detail.mediaType}</span>
                      )}{' '}
                      is attached.{' '}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="text-wa-green hover:underline">
                        Click Here to change it.
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(event) => setFile(event.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                    <p className="mt-1 text-xs text-wa-text-secondary">
                      Note: Max Size allowed: Image: Up to 5 MB, Video: Up to 16 MB, Document: Up to 100 MB
                    </p>
                  </div>
                )
              )}

              {variables.length === 0 ? (
                <div className="rounded-md border border-wa-border px-3 py-2 text-center text-sm text-wa-text-secondary">
                  No Any Variable In Selected Template
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {variables.map((variable) => (
                    <div key={variable.id}>
                      <label className="mb-1 block text-xs font-medium text-wa-text-secondary">{variable.label} :</label>
                      <input
                        type={variable.inputType}
                        required={variable.editable}
                        readOnly={!variable.editable}
                        placeholder={variable.placeholder}
                        value={manualValues[variable.id] || ''}
                        onChange={(event) => setManualValues((prev) => ({ ...prev, [variable.id]: event.target.value }))}
                        className={`w-full rounded-md border border-wa-border px-3 py-2 text-sm focus:outline-none ${
                          variable.editable ? 'bg-wa-panel-textarea text-wa-text-primary' : 'bg-wa-panel text-wa-text-secondary'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowPreview((prev) => !prev)}
                  className="rounded-md border border-wa-border px-4 py-2 text-sm text-wa-text-primary hover:bg-wa-panel-hover"
                >
                  View Template Preview
                </button>
              </div>

              {showPreview && (
                <div className="rounded-md border border-wa-border bg-wa-chat-bg p-3">
                  <h3 className="mb-2 text-sm font-semibold text-wa-text-primary">WhatsApp Template Preview</h3>
                  <p className="whitespace-pre-wrap text-sm text-wa-text-secondary">{previewText}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 text-xs text-wa-danger">
            <strong>Note :</strong> Messages cannot be sent to customers who have replied with &quot;Stop Messaging&quot; on your WABA
            number. Such customers are automatically excluded (if any), and the list can be checked under the &quot;Blocked Number
            List.&quot;
          </div>
        </div>

        <div className="border-t border-wa-border px-4 py-3">
          {sendError && <div className="mb-2 text-xs text-wa-danger">Failed to send: {sendError}</div>}
          <button
            type="button"
            onClick={handleSend}
            disabled={!selectedId || !allVariablesFilled || isSending}
            className="w-full rounded-md bg-wa-green px-4 py-2 text-sm font-medium text-white enabled:hover:bg-wa-green-dark disabled:opacity-40"
          >
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
