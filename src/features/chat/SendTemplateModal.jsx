import { useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { getTemplates, getTemplateDetail } from '../../lib/api'
import { sendTemplateMessage } from '../../store/messagesSlice'

const CATEGORY_LABEL = { M: 'Marketing', U: 'Utility' }

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
 * Recreates send_whatsapp_pop_other.php's workflow for a single already-open
 * conversation (not its bulk-recipient-list / invoice-attachment paths, which
 * don't apply here): pick an approved template, fill in only the variables that
 * need a manually-typed value (every other variable auto-resolves from CRM data
 * server-side — see templatesController.js), preview, then send.
 */
export function SendTemplateModal({ mobile, ctrId, onClose }) {
  const dispatch = useDispatch()

  const [templates, setTemplates] = useState([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [templateSearch, setTemplateSearch] = useState('')

  const [selectedId, setSelectedId] = useState(null)
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
    setIsLoadingDetail(true)
    getTemplateDetail(id)
      .then((data) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setIsLoadingDetail(false))
  }

  const editableVariables = useMemo(() => detail?.variables?.filter((v) => v.editable) || [], [detail])
  const previewText = useMemo(
    () => (detail ? buildPreviewText(detail.description, detail.variables || [], manualValues) : ''),
    [detail, manualValues],
  )

  const filteredTemplates = templateSearch.trim()
    ? templates.filter((t) => t.title.toLowerCase().includes(templateSearch.trim().toLowerCase()))
    : templates

  async function handleSend() {
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-label="Send approved WhatsApp template">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg bg-wa-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-wa-border px-4 py-3">
          <h2 className="text-base font-medium text-wa-text-primary">Send Approved Template</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-wa-text-secondary hover:text-wa-text-primary">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <label className="mb-1 block text-xs font-medium text-wa-text-secondary">Select WhatsApp Template</label>
          <input
            type="text"
            value={templateSearch}
            onChange={(event) => setTemplateSearch(event.target.value)}
            placeholder="Search templates…"
            className="mb-2 w-full rounded-md bg-wa-panel-textarea px-3 py-2 text-sm text-wa-text-primary placeholder:text-wa-text-secondary focus:outline-none"
          />

          {isLoadingTemplates ? (
            <div className="py-3 text-sm text-wa-text-secondary">Loading templates…</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-3 text-sm text-wa-text-secondary">No approved templates found.</div>
          ) : (
            <div className="mb-3 max-h-40 overflow-y-auto rounded-md border border-wa-border">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template.id)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-wa-border px-3 py-2 text-left last:border-b-0 hover:bg-wa-panel-hover ${
                    selectedId === template.id ? 'bg-wa-panel-hover' : ''
                  }`}
                >
                  <span className="text-sm text-wa-text-primary">{template.title}</span>
                  <span className="text-xs text-wa-text-secondary">
                    {CATEGORY_LABEL[template.category] || template.category} · {template.language}
                  </span>
                </button>
              ))}
            </div>
          )}

          {isLoadingDetail && <div className="py-2 text-sm text-wa-text-secondary">Loading template…</div>}

          {detail && !isLoadingDetail && (
            <div className="flex flex-col gap-3">
              {editableVariables.map((variable) => (
                <div key={variable.id}>
                  <label className="mb-1 block text-xs font-medium text-wa-text-secondary">{variable.label}</label>
                  <input
                    type="text"
                    required
                    value={manualValues[variable.id] || ''}
                    onChange={(event) => setManualValues((prev) => ({ ...prev, [variable.id]: event.target.value }))}
                    className="w-full rounded-md bg-wa-panel-textarea px-3 py-2 text-sm text-wa-text-primary focus:outline-none"
                  />
                </div>
              ))}

              {detail.mediaType !== 'text' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-wa-text-secondary">
                    Attach {detail.mediaType} (optional — overrides the template&rsquo;s default media)
                  </label>
                  <input
                    type="file"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                    className="w-full text-xs text-wa-text-secondary file:mr-2 file:rounded file:border-0 file:bg-wa-panel-hover file:px-2 file:py-1 file:text-wa-text-primary"
                  />
                </div>
              )}

              {!showPreview ? (
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="self-center rounded-md border border-wa-border px-4 py-2 text-sm text-wa-text-primary hover:bg-wa-panel-hover"
                >
                  View Template Preview
                </button>
              ) : (
                <div className="rounded-md border border-wa-border bg-wa-chat-bg p-3">
                  <h3 className="mb-2 text-sm font-semibold text-wa-text-primary">WhatsApp Template Preview</h3>
                  <p className="whitespace-pre-wrap text-sm text-wa-text-secondary">{previewText}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-wa-border px-4 py-3">
          {sendError && <div className="mb-2 text-xs text-wa-danger">Failed to send: {sendError}</div>}
          <button
            type="button"
            onClick={handleSend}
            disabled={!selectedId || !showPreview || isSending}
            className="w-full rounded-md bg-wa-green px-4 py-2 text-sm font-medium text-white enabled:hover:bg-wa-green-dark disabled:opacity-40"
          >
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
