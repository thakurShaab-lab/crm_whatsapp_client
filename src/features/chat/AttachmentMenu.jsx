import { useRef } from 'react'

const FILE_OPTIONS = [
  { key: 'media', label: 'Photos & videos', accept: 'image/*,video/*', icon: '🖼️' },
  { key: 'document', label: 'Document', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip', icon: '📄' },
  { key: 'audio', label: 'Audio', accept: 'audio/*', icon: '🎵' },
]

export function AttachmentMenu({ onFilesSelected, onOpenLocationPicker, onTemplateSelected, onClose }) {
  const inputRef = useRef(null)

  function handlePick(accept) {
    const input = inputRef.current
    input.accept = accept
    input.click()
  }

  return (
    <div className="absolute bottom-14 right-2 z-10 w-56 overflow-hidden rounded-lg bg-wa-panel shadow-xl">
      {FILE_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => handlePick(option.accept)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-wa-text-primary hover:bg-wa-panel-hover"
        >
          <span className="text-lg">{option.icon}</span>
          {option.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => { 
          onTemplateSelected()
          onClose()
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-wa-text-primary hover:bg-wa-panel-hover"
      >
        <span className="text-lg">📋</span>
        Template
      </button>
      <button
        type="button"
        onClick={() => {
          onOpenLocationPicker()
          onClose()
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-wa-text-primary hover:bg-wa-panel-hover"
      >
        <span className="text-lg">📍</span>
        Location
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files || [])
          if (files.length > 0) onFilesSelected(files)
          event.target.value = ''
          onClose()
        }}
      />
    </div>
  )
}
