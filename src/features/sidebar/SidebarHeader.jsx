import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setFilter, fetchConversations } from '../../store/conversationsSlice'
import { ThemeToggle } from './ThemeToggle.jsx'

const TABS = [
  { key: 'recent', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'dateRange', label: 'Date Filter' },
]

export function SidebarHeader({ onNewChat }) {
  const dispatch = useDispatch()
  const filter = useSelector((state) => state.conversations.filter)
  const [inputValue, setInputValue] = useState('')
  const [fromDateInput, setFromDateInput] = useState('')
  const [toDateInput, setToDateInput] = useState('')
  const [dateRangeError, setDateRangeError] = useState(null)
  // Purely presentational: whether the date-range fields float open as an overlay
  // below the tabs. Deliberately separate from `filter` — closing the overlay
  // (outside click, Escape, the × button) must never change which filter is
  // actually applied to the list, only whether its controls are visible.
  const [showDateOverlay, setShowDateOverlay] = useState(false)
  const tabsRef = useRef(null)

  // Debounced so typing a search query doesn't hit the API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(fetchConversations({ search: inputValue.trim(), filter }))
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

  // Closes the overlay on an outside click or Escape — `tabsRef` wraps both the
  // tab buttons and the overlay itself, so re-clicking the "Date Filter" tab to
  // toggle it back open is never misread as an "outside" click closing it first.
  useEffect(() => {
    if (!showDateOverlay) return undefined
    function handleOutsideClick(event) {
      if (!tabsRef.current?.contains(event.target)) setShowDateOverlay(false)
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setShowDateOverlay(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showDateOverlay])

  function handleFilterClick(nextFilter) {
    dispatch(setFilter(nextFilter))
    setDateRangeError(null)
    // Switching to Date Filter just reveals the From/To fields — it doesn't apply
    // any date bound on its own (matches "All", showing everything) until Apply.
    dispatch(fetchConversations({ search: inputValue.trim(), filter: nextFilter }))
    // Clicking "Date Filter" toggles its overlay open/closed; any other tab has no
    // overlay of its own, so it always closes this one.
    setShowDateOverlay(nextFilter === 'dateRange' ? (open) => !open : false)
  }

  function handleApplyDateRange() {
    if (fromDateInput && toDateInput && fromDateInput > toDateInput) {
      setDateRangeError('"From Date" must be on or before "To Date".')
      return
    }
    setDateRangeError(null)
    dispatch(fetchConversations({ search: inputValue.trim(), filter: 'dateRange', fromDate: fromDateInput, toDate: toDateInput }))
  }

  function handleClearDateRange() {
    setFromDateInput('')
    setToDateInput('')
    setDateRangeError(null)
    dispatch(fetchConversations({ search: inputValue.trim(), filter: 'dateRange' }))
  }

  return (
    <div className="flex flex-col gap-3 border-b border-wa-border bg-wa-bg px-3 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-3 rounded-[100px] bg-wa-search-bg px-3 py-2">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="flex-shrink-0 text-wa-text-secondary">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14" />
          </svg>
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Search or start a new chat"
            className="w-full bg-transparent text-sm text-wa-text-primary placeholder:text-wa-text-secondary focus:outline-none"
          />
        </div>
        {/* <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat"
          title="New chat"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-wa-text-secondary transition-colors hover:bg-wa-panel-hover hover:text-wa-text-primary"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M4 20h16v2H4zM17.71 3.29a1 1 0 0 0-1.42 0l-1.5 1.5 3.42 3.42 1.5-1.5a1 1 0 0 0 0-1.42zM3 17.25V21h3.75L18.81 8.94l-3.75-3.75z" />
          </svg>
        </button> */}
        <ThemeToggle />
      </div>

      <div ref={tabsRef} className="relative flex gap-1 rounded-full bg-wa-search-bg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleFilterClick(tab.key)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key ? 'bg-wa-green text-white shadow-sm' : 'text-wa-text-secondary hover:text-wa-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {showDateOverlay && (
          <div
            role="dialog"
            aria-label="Filter conversations by date"
            className="date-filter-overlay absolute left-0 right-0 top-full z-30 mt-3 rounded-2xl border border-wa-overlay-border bg-wa-panel/75 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-wa-text-primary">Filter by date</h3>
              <button
                type="button"
                onClick={() => setShowDateOverlay(false)}
                aria-label="Close date filter"
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-wa-text-secondary transition-colors hover:bg-wa-panel-hover hover:text-wa-text-primary"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.29-6.3z" />
                </svg>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="flex flex-col text-xs font-medium text-wa-text-secondary">
                From Date
                <input
                  type="date"
                  value={fromDateInput}
                  max={toDateInput || undefined}
                  onChange={(event) => setFromDateInput(event.target.value)}
                  className="mt-1 rounded-md border border-wa-border bg-wa-panel-textarea px-2 py-1.5 text-sm text-wa-text-primary focus:outline-none focus:ring-2 focus:ring-wa-green/40"
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-wa-text-secondary">
                To Date
                <input
                  type="date"
                  value={toDateInput}
                  min={fromDateInput || undefined}
                  onChange={(event) => setToDateInput(event.target.value)}
                  className="mt-1 rounded-md border border-wa-border bg-wa-panel-textarea px-2 py-1.5 text-sm text-wa-text-primary focus:outline-none focus:ring-2 focus:ring-wa-green/40"
                />
              </label>
              <button
                type="button"
                onClick={handleApplyDateRange}
                disabled={!fromDateInput && !toDateInput}
                className="rounded-full bg-wa-green px-4 py-1.5 text-sm font-medium text-white transition-colors enabled:hover:bg-wa-green-dark disabled:opacity-40"
              >
                Apply
              </button>
              {(fromDateInput || toDateInput) && (
                <button
                  type="button"
                  onClick={handleClearDateRange}
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-wa-text-secondary transition-colors hover:bg-wa-panel-hover hover:text-wa-text-primary"
                >
                  Clear
                </button>
              )}
            </div>
            {dateRangeError && <div className="mt-2 text-xs text-wa-danger">{dateRangeError}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
