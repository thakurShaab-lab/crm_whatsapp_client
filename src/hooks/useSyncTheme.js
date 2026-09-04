import { useEffect } from 'react'
import { useSelector } from 'react-redux'

/** Reflects the Redux theme onto <html data-theme="..."> so index.css's token overrides apply. */
export function useSyncTheme() {
  const theme = useSelector((state) => state.ui.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
}