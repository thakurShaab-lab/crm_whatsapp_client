import { useDispatch } from 'react-redux'
import { initialsFor, avatarColorFor } from '../../utils/avatar'
import { backToList } from '../../store/uiSlice'

export function ChatHeader({ contact }) {
  const dispatch = useDispatch()

  return (
    <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-wa-border bg-wa-panel px-4">
      <button
        type="button"
        onClick={() => dispatch(backToList())}
        className="text-wa-text-secondary md:hidden"
        aria-label="Back to chat list"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z" />
        </svg>
      </button>

      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: contact ? avatarColorFor(contact.mobile) : '#546069' }}
      >
        {initialsFor(contact?.name || contact?.mobile)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] text-wa-text-primary">{contact?.name || contact?.mobile}</div>
        <div className="truncate text-xs text-wa-text-secondary">
          {contact?.stopService ? 'Opted out of WhatsApp messages' : contact?.mobile}
        </div>
      </div>
    </div>
  )
}
