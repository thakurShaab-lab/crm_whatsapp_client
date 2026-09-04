import { useDispatch, useSelector } from 'react-redux'
import { toggleTheme } from '../../store/uiSlice'

export function ThemeToggle() {
  const dispatch = useDispatch()
  const theme = useSelector((state) => state.ui.theme)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-wa-text-secondary hover:bg-wa-panel-hover"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? (
        // Sun — shown in dark mode; click to switch to light.
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 4.5a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1m0 15a1 1 0 0 1 1 1V22a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1M4.5 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1.5a1 1 0 0 1 1 1m18 0a1 1 0 0 1-1 1H20a1 1 0 1 1 0-2h1.5a1 1 0 0 1 1 1M6.34 6.34a1 1 0 0 1-1.42 0L3.87 5.29a1 1 0 0 1 1.42-1.42l1.05 1.05a1 1 0 0 1 0 1.42m12.74 12.74a1 1 0 0 1-1.42 0l-1.05-1.05a1 1 0 0 1 1.42-1.42l1.05 1.05a1 1 0 0 1 0 1.42M6.34 17.66a1 1 0 0 1 0 1.42l-1.05 1.05a1 1 0 0 1-1.42-1.42l1.05-1.05a1 1 0 0 1 1.42 0M19.08 4.92a1 1 0 0 1 0 1.42l-1.05 1.05a1 1 0 1 1-1.42-1.42l1.05-1.05a1 1 0 0 1 1.42 0M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10" />
        </svg>
      ) : (
        // Moon — shown in light mode; click to switch to dark.
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12.1 2a9.93 9.93 0 0 0-1.9.18 1 1 0 0 0-.4 1.79A8 8 0 0 1 12.1 20a8.1 8.1 0 0 1-6.73-3.62 1 1 0 0 0-1.72.24A10 10 0 1 0 12.1 2" />
        </svg>
      )}
    </button>
  )
}
