import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as api from '../lib/api'

export const fetchConversations = createAsyncThunk(
  'conversations/fetch',
  async ({ search, filter, fromDate, toDate } = {}) => api.getConversations({ search, filter, fromDate, toDate, limit: 30 }),
)

export const fetchMoreConversations = createAsyncThunk(
  'conversations/fetchMore',
  async (_, { getState }) => {
    const { search, filter, fromDate, toDate, nextCursor } = getState().conversations
    return api.getConversations({ search, filter, fromDate, toDate, cursor: nextCursor, limit: 30 })
  },
)

export const markConversationRead = createAsyncThunk('conversations/markRead', async (mobile) => {
  await api.markConversationRead(mobile)
  return mobile
})

/** Hard delete — permanently removes the conversation server-side. No undo. */
export const deleteConversation = createAsyncThunk('conversations/delete', async (mobile) => {
  await api.deleteConversation(mobile)
  return mobile
})

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState: {
    items: [],
    nextCursor: null,
    status: 'idle', // 'idle' | 'loading' | 'loadingMore' | 'succeeded' | 'failed'
    error: null,
    search: '',
    filter: 'recent',
    fromDate: null,
    toDate: null,
  },
  reducers: {
    setSearch(state, action) {
      state.search = action.payload
    },
    setFilter(state, action) {
      state.filter = action.payload
    },
    /** Applied on the `conversation:new_message` socket event — moves the contact to the top with fresh data. */
    upsertConversation(state, action) {
      const conversation = action.payload
      if (!conversation) return
      const index = state.items.findIndex((item) => item.mobile === conversation.mobile)
      if (index !== -1) state.items.splice(index, 1)
      const matchesUnread = state.filter !== 'unread' || conversation.unreadCount > 0
      // A live message can arrive while an active date range is showing a past
      // window — without this it would otherwise always jump to the top of what's
      // supposed to be a historical, bounded view.
      const updatedAt = new Date(conversation.updatedAt).getTime()
      const matchesDateRange =
        state.filter !== 'dateRange' ||
        ((!state.fromDate || updatedAt >= new Date(state.fromDate).getTime()) &&
          (!state.toDate || updatedAt < new Date(state.toDate).getTime() + 24 * 3_600_000))
      if (matchesUnread && matchesDateRange) {
        state.items.unshift(conversation)
      }
    },
    /** Applied on the `conversation:read` socket event, possibly from another tab. */
    patchUnreadCount(state, action) {
      const { mobile } = action.payload
      const item = state.items.find((c) => c.mobile === mobile)
      if (item) item.unreadCount = 0
      if (state.filter === 'unread') state.items = state.items.filter((c) => c.mobile !== mobile || c.unreadCount > 0)
    },
    /** Applied on `message:status_update` so the sidebar's tick icon stays in sync. */
    patchLastMessageStatus(state, action) {
      const { mobile, status } = action.payload
      const item = state.items.find((c) => c.mobile === mobile)
      if (item?.lastMessage) item.lastMessage.status = status
    },
    /** Applied on the `conversation:deleted` socket event (this tab's own delete, or another tab's/device's). */
    removeConversation(state, action) {
      const mobile = action.payload
      state.items = state.items.filter((item) => item.mobile !== mobile)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state, action) => {
        state.status = 'loading'
        state.search = action.meta.arg?.search ?? state.search
        state.filter = action.meta.arg?.filter ?? state.filter
        state.fromDate = action.meta.arg?.fromDate ?? null
        state.toDate = action.meta.arg?.toDate ?? null
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload.items
        state.nextCursor = action.payload.nextCursor
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(fetchMoreConversations.pending, (state) => {
        state.status = 'loadingMore'
      })
      .addCase(fetchMoreConversations.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items.push(...action.payload.items)
        state.nextCursor = action.payload.nextCursor
      })
      .addCase(markConversationRead.fulfilled, (state, action) => {
        const item = state.items.find((c) => c.mobile === action.payload)
        if (item) item.unreadCount = 0
      })
      .addCase(deleteConversation.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.mobile !== action.payload)
      })
  },
})

export const { setSearch, setFilter, upsertConversation, patchUnreadCount, patchLastMessageStatus, removeConversation } =
  conversationsSlice.actions
export default conversationsSlice.reducer