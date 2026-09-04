import { createSlice } from '@reduxjs/toolkit'

const THEME_STORAGE_KEY = 'wa-theme'

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'dark'
  } catch {
    return 'dark'
  }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    activeMobile: null,
    mobileView: 'list', // 'list' | 'chat' — which pane shows on narrow screens
    composerDrafts: {}, // mobile -> draft text, kept so switching chats doesn't lose input
    attachmentMenuOpen: false,
    emojiPickerOpen: false,
    theme: getInitialTheme(), // 'dark' | 'light'
  },
  reducers: {
    openConversation(state, action) {
      state.activeMobile = action.payload
      state.mobileView = 'chat'
      state.attachmentMenuOpen = false
      state.emojiPickerOpen = false
    },
    backToList(state) {
      state.mobileView = 'list'
    },
    setDraft(state, action) {
      const { mobile, text } = action.payload
      state.composerDrafts[mobile] = text
    },
    clearDraft(state, action) {
      delete state.composerDrafts[action.payload]
    },
    toggleAttachmentMenu(state) {
      state.attachmentMenuOpen = !state.attachmentMenuOpen
      state.emojiPickerOpen = false
    },
    toggleEmojiPicker(state) {
      state.emojiPickerOpen = !state.emojiPickerOpen
      state.attachmentMenuOpen = false
    },
    closeMenus(state) {
      state.attachmentMenuOpen = false
      state.emojiPickerOpen = false
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, state.theme)
      } catch {
        // localStorage unavailable (e.g. private mode) — theme just won't persist
      }
    },
  },
})

export const {
  openConversation,
  backToList,
  setDraft,
  clearDraft,
  toggleAttachmentMenu,
  toggleEmojiPicker,
  closeMenus,
  toggleTheme,
} = uiSlice.actions
export default uiSlice.reducer