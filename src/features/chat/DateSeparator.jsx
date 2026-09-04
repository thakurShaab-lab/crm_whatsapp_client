import { formatDateSeparator } from '../../utils/formatTime'

export function DateSeparator({ date }) {
  return (
    <div className="my-2 flex justify-center">
      <span className="rounded-lg bg-wa-panel px-3 py-1 text-xs text-wa-text-secondary shadow-sm">
        {formatDateSeparator(date)}
      </span>
    </div>
  )
}
