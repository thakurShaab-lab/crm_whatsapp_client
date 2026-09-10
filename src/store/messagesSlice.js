import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as api from '../lib/api'

// `context` carries the legacy chat route's query params (ctrId, refid, for, cname,
// useradminid, wabano, wanum, ...) through to the API — see lib/api.js. Pagination
// itself is by 3-calendar-day window, not message count — see the server's
// utils/dateWindow.js — so no `limit` is passed; the server decides the page size.
export const fetchThreadMessages = createAsyncThunk('messages/fetch', async ({ mobile, ...context }) => {
  const result = await api.getThreadMessages(mobile, context)
  return { mobile, ...result }
})

/**
 * "Load more chats" — walks one more 3-day window into the past using the cursor
 * the previous response returned. `condition` blocks a second concurrent call for
 * the same conversation outright (the thunk never even dispatches `pending`), so a
 * user rapidly clicking the button — or any other double-trigger — can't fire two
 * overlapping requests; the UI additionally disables the button while loading as a
 * second line of defense.
 */
export const fetchMoreThreadMessages = createAsyncThunk(
  'messages/fetchMore',
  async ({ mobile, ...context }, { getState }) => {
    const thread = getState().messages.byMobile[mobile]
    const result = await api.getThreadMessages(mobile, { ...context, cursor: thread?.nextCursor })
    return { mobile, ...result }
  },
  {
    condition: ({ mobile }, { getState }) => {
      const thread = getState().messages.byMobile[mobile]
      if (!thread?.hasMore) return false
      if (thread.loadMoreStatus === 'loading') return false
      return true
    },
  },
)

export const sendMessage = createAsyncThunk('messages/send', async ({ mobile, text, files }) => {
  const result = await api.sendMessage(mobile, { text, files })
  return { mobile, messages: result.messages }
})

/** "Send Approved Template" popup's send — see lib/api.js.sendTemplateMessage for what manualValues/file mean. */
export const sendTemplateMessage = createAsyncThunk(
  'messages/sendTemplate',
  async ({ mobile, templateId, manualValues, file, ctrId }) => {
    const result = await api.sendTemplateMessage(mobile, { templateId, manualValues, file, ctrId })
    return { mobile, messages: [result.message] }
  },
)

function threadFor(state, mobile) {
  if (!state.byMobile[mobile]) {
    state.byMobile[mobile] = {
      items: [],
      nextCursor: null,
      status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' — the initial page
      contact: null,
      // Pagination bookkeeping, matching the shape a "load more" UI needs directly:
      hasMore: true, // optimistic until the first page resolves and says otherwise
      oldestLoadedDate: null,
      newestLoadedDate: null,
      loadMoreStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
      loadMoreError: null,
    }
  }
  return state.byMobile[mobile]
}

/** Appends `incoming` messages not already present (by id) — used for both the live-send/socket path and the load-more prepend, since either overlap in principle if a request is retried. */
function mergeUnique(existing, incoming) {
  const existingIds = new Set(existing.map((m) => m.id))
  return incoming.filter((m) => !existingIds.has(m.id))
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
        thread.hasMore = action.payload.hasMore
        thread.oldestLoadedDate = action.payload.oldestLoadedDate
        thread.newestLoadedDate = action.payload.newestLoadedDate
        thread.contact = action.payload.contact ?? thread.contact ?? null
      })
      .addCase(fetchThreadMessages.rejected, (state, action) => {
        threadFor(state, action.meta.arg.mobile).status = 'failed'
      })
      .addCase(fetchMoreThreadMessages.pending, (state, action) => {
        const thread = threadFor(state, action.meta.arg.mobile)
        thread.loadMoreStatus = 'loading'
        thread.loadMoreError = null
      })
      .addCase(fetchMoreThreadMessages.fulfilled, (state, action) => {
        // Keyed by mobile, so a response that resolves after the user has switched to
        // a different conversation still lands on the right (now-backgrounded) thread
        // entry rather than corrupting whatever's currently on screen.
        const thread = threadFor(state, action.payload.mobile)
        thread.loadMoreStatus = 'succeeded'
        thread.items = [...mergeUnique(thread.items, action.payload.items), ...thread.items]
        thread.nextCursor = action.payload.nextCursor
        thread.hasMore = action.payload.hasMore
        thread.oldestLoadedDate = action.payload.oldestLoadedDate
        // A failed request must never move these — condition already blocks a
        // concurrent call, and a rejected thunk never reaches this reducer, so
        // hasMore/oldestLoadedDate only ever change here, on genuine success.
      })
      .addCase(fetchMoreThreadMessages.rejected, (state, action) => {
        // Nothing else changes: existing messages, hasMore, and oldestLoadedDate are
        // all left exactly as they were, so a retry (dispatching this same thunk
        // again) resumes from the identical window.
        const thread = threadFor(state, action.meta.arg.mobile)
        thread.loadMoreStatus = 'failed'
        thread.loadMoreError = action.error.message
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const thread = threadFor(state, action.payload.mobile)
        thread.items.push(...mergeUnique(thread.items, action.payload.messages))
      })
      .addCase(sendTemplateMessage.fulfilled, (state, action) => {
        const thread = threadFor(state, action.payload.mobile)
        thread.items.push(...mergeUnique(thread.items, action.payload.messages))
      })
  },
})

export const { addMessage, patchMessageStatus } = messagesSlice.actions
export default messagesSlice.reducer
