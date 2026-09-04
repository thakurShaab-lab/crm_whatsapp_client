import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as api from '../lib/api'

// `context` carries the legacy chat route's query params (ctrId, refid, for, cname,
// useradminid, wabano, wanum, ...) through to the API — see lib/api.js.
export const fetchThreadMessages = createAsyncThunk('messages/fetch', async ({ mobile, ...context }) => {
  const result = await api.getThreadMessages(mobile, { ...context, limit: 50 })
  return { mobile, ...result }
})

export const fetchMoreThreadMessages = createAsyncThunk(
  'messages/fetchMore',
  async ({ mobile, ...context }, { getState }) => {
    const cursor = getState().messages.byMobile[mobile]?.nextCursor
    const result = await api.getThreadMessages(mobile, { ...context, cursor, limit: 50 })
    return { mobile, ...result }
  },
)

export const sendMessage = createAsyncThunk('messages/send', async ({ mobile, text, files }) => {
  const result = await api.sendMessage(mobile, { text, files })
  return { mobile, messages: result.messages }
})

function threadFor(state, mobile) {
  if (!state.byMobile[mobile]) state.byMobile[mobile] = { items: [], nextCursor: null, status: 'idle', contact: null }
  return state.byMobile[mobile]
}

const messagesSlice = createSlice({
  name: 'messages',
  initialState: { byMobile: {} },
  reducers: {
    /** Applied on the `conversation:new_message` socket event. Dedupes by id since the sender's own tab also gets this via the send thunk's response. */
    addMessage(state, action) {
      const { mobile, message } = action.payload
      const thread = threadFor(state, mobile)
      if (!thread.items.some((m) => m.id === message.id)) thread.items.push(message)
    },
    /** Applied on `message:status_update`. */
    patchMessageStatus(state, action) {
      const { mobile, messageId, status } = action.payload
      const thread = state.byMobile[mobile]
      const message = thread?.items.find((m) => m.id === messageId)
      if (message) message.status = status
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThreadMessages.pending, (state, action) => {
        threadFor(state, action.meta.arg.mobile).status = 'loading'
      })
      .addCase(fetchThreadMessages.fulfilled, (state, action) => {
        const thread = threadFor(state, action.payload.mobile)
        thread.status = 'succeeded'
        thread.items = action.payload.items
        thread.nextCursor = action.payload.nextCursor
        thread.contact = action.payload.contact ?? thread.contact ?? null
      })
      .addCase(fetchThreadMessages.rejected, (state, action) => {
        threadFor(state, action.meta.arg.mobile).status = 'failed'
      })
      .addCase(fetchMoreThreadMessages.pending, (state, action) => {
        threadFor(state, action.meta.arg.mobile).status = 'loadingMore'
      })
      .addCase(fetchMoreThreadMessages.fulfilled, (state, action) => {
        const thread = threadFor(state, action.payload.mobile)
        thread.status = 'succeeded'
        thread.items = [...action.payload.items, ...thread.items]
        thread.nextCursor = action.payload.nextCursor
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const thread = threadFor(state, action.payload.mobile)
        for (const message of action.payload.messages) {
          if (!thread.items.some((m) => m.id === message.id)) thread.items.push(message)
        }
      })
  },
})

export const { addMessage, patchMessageStatus } = messagesSlice.actions
export default messagesSlice.reducer