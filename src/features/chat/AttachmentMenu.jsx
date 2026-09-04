import { useRef, useState } from 'react'

const FILE_OPTIONS = [
  { key: 'media', label: 'Photos & videos', accept: 'image/*,video/*', icon: '🖼️' },
  { key: 'document', label: 'Document', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip', icon: '📄' },
  { key: 'audio', label: 'Audio', accept: 'audio/*', icon: '🎵' },
]

export function AttachmentMenu({ onFilesSelected, onLocationSelected, onClose }) {
  const inputRef = useRef(null)
  const [locationError, setLocationError] = useState(null)
  const [locating, setLocating] = useState(false)

  function handlePick(accept) {
    const input = inputRef.current
    input.accept = accept
    input.click()
  }

  function handleShareLocation() {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported in this browser')
      return
    }

    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationSelected({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        onClose()
      },
      (error) => {
        setLocating(false)
        setLocationError(error.code === error.PERMISSION_DENIED ? 'Location permission denied' : 'Could not get your location')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="absolute bottom-14 left-2 z-10 w-56 overflow-hidden rounded-lg bg-wa-panel shadow-xl">
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
        onClick={handleShareLocation}
        disabled={locating}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-wa-text-primary hover:bg-wa-panel-hover disabled:opacity-60"
      >
        <span className="text-lg">📍</span>
        {locating ? 'Getting location…' : 'Location'}
      </button>
      {locationError && <div className="px-4 pb-2 text-xs text-wa-danger">{locationError}</div>}

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
