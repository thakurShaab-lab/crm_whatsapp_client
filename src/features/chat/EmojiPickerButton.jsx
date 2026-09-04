import { useSelector } from 'react-redux'
import EmojiPicker, { Theme } from 'emoji-picker-react'

export function EmojiPickerPopover({ onSelect, onClose }) {
  const theme = useSelector((state) => state.ui.theme)

  return (
    <div className="absolute bottom-14 left-0 z-10" role="presentation">
      <EmojiPicker
        theme={theme === 'light' ? Theme.LIGHT : Theme.DARK}
        onEmojiClick={(emojiData) => {
          onSelect(emojiData.emoji)
          onClose()
        }}
        searchDisabled={false}
        skinTonesDisabled
        width={320}
        height={380}
      />
    </div>
  )
}
