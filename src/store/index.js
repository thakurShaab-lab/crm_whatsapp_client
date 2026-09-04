import { configureStore } from '@reduxjs/toolkit'
import conversationsReducer from './conversationsSlice'
import messagesReducer from './messagesSlice'
import uiReducer from './uiSlice'

export const store = configureStore({
  reducer: {
    conversations: conversationsReducer,
    messages: messagesReducer,
    ui: uiReducer,
  },
})