import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setFilter, fetchConversations } from '../../store/conversationsSlice'
import { ThemeToggle } from './ThemeToggle.jsx'

export function SidebarHeader({ onNewChat }) {
  const dispatch = useDispatch()
  const filter = useSelector((state) => state.conversations.filter)
  const [inputValue, setInputValue] = useState('')

  // Debounced so typing a search query doesn't hit the API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(fetchConversations({ search: inputValue.trim(), filter }))
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

  function handleFilterClick(nextFilter) {
    dispatch(setFilter(nextFilter))
    dispatch(fetchConversations({ search: inputValue.trim(), filter: nextFilter }))
  }

  return (
    <div className="flex flex-col gap-2 border-b border-wa-border bg-wa-bg px-3 py-2">
      <div className="flex items-center gap-1">
        <div className="flex flex-1 items-center gap-3 rounded-[100px] bg-wa-panel px-3 py-1.5">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-wa-text-secondary">
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
        <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat"
          title="New chat"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-wa-text-secondary hover:bg-wa-panel-hover"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M4 20h16v2H4zM17.71 3.29a1 1 0 0 0-1.42 0l-1.5 1.5 3.42 3.42 1.5-1.5a1 1 0 0 0 0-1.42zM3 17.25V21h3.75L18.81 8.94l-3.75-3.75z" />
          </svg>
        </button>
        <ThemeToggle />
      </div>

      <div className="flex gap-2 px-1">
        {[
          { key: 'recent', label: 'All' },
          { key: 'unread', label: 'Unread' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleFilterClick(tab.key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filter === tab.key ? 'bg-wa-green/15 text-wa-green' : 'text-wa-text-secondary hover:bg-wa-panel'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
