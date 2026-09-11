import { describe, test, expect, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import messagesReducer, { fetchThreadMessages, fetchMoreThreadMessages, addMessage, sendMessage, retryMessage } from './messagesSlice'
import * as api from '../lib/api'

vi.mock('../lib/api')

const MOBILE = '911111199999'

function msg(id, day) {
  return { id, mobile: MOBILE, direction: 'inbound', type: 'text', text: `msg ${id}`, media: null, status: 'delivered', createdAt: `2026-01-${day}T10:00:00.000Z` }
}

function buildStore() {
  return configureStore({ reducer: { messages: messagesReducer } })
}

describe('fetchThreadMessages (initial page)', () => {
  test('stores items and the pagination bookkeeping fields from the response', async () => {
    api.getThreadMessages.mockResolvedValue({
      items: [msg(3, 10), msg(4, 11), msg(5, 12)],
      nextCursor: 'cursor-abc',
      hasMore: true,
      oldestLoadedDate: '2026-01-10T00:00:00.000Z',
      newestLoadedDate: '2026-01-13T00:00:00.000Z',
      contact: { mobile: MOBILE, name: 'Test' },
    })

    const store = buildStore()
    await store.dispatch(fetchThreadMessages({ mobile: MOBILE }))

    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items.map((m) => m.id)).toEqual([3, 4, 5])
    expect(thread.hasMore).toBe(true)
    expect(thread.oldestLoadedDate).toBe('2026-01-10T00:00:00.000Z')
    expect(thread.newestLoadedDate).toBe('2026-01-13T00:00:00.000Z')
    expect(thread.status).toBe('succeeded')
  })

  test('conversation with no history at all: hasMore is false, no "load more" is offered', async () => {
    api.getThreadMessages.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
      oldestLoadedDate: '2026-01-10T00:00:00.000Z',
      newestLoadedDate: '2026-01-13T00:00:00.000Z',
      contact: null,
    })

    const store = buildStore()
    await store.dispatch(fetchThreadMessages({ mobile: MOBILE }))

    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items).toEqual([])
    expect(thread.hasMore).toBe(false)
  })
})

describe('fetchMoreThreadMessages (load more)', () => {
  beforeEach(() => vi.clearAllMocks())

  test('prepends the older page before the existing messages, oldest-first overall', async () => {
    const store = buildStore()
    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(3, 10), msg(4, 11), msg(5, 12)],
      nextCursor: 'cursor-page1',
      hasMore: true,
      oldestLoadedDate: '2026-01-10T00:00:00.000Z',
      newestLoadedDate: '2026-01-13T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchThreadMessages({ mobile: MOBILE }))

    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(0, 7), msg(1, 8), msg(2, 9)],
      nextCursor: 'cursor-page2',
      hasMore: true,
      oldestLoadedDate: '2026-01-07T00:00:00.000Z',
      newestLoadedDate: '2026-01-10T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchMoreThreadMessages({ mobile: MOBILE }))

    const thread = store.getState().messages.byMobile[MOBILE]
    // Existing messages (3,4,5) must remain intact and in order, with the older page
    // (0,1,2) inserted strictly before them — the exact ordering the spec's example shows.
    expect(thread.items.map((m) => m.id)).toEqual([0, 1, 2, 3, 4, 5])
    expect(thread.oldestLoadedDate).toBe('2026-01-07T00:00:00.000Z')
    // The already-loaded upper edge must not move just because we loaded older history.
    expect(thread.newestLoadedDate).toBe('2026-01-13T00:00:00.000Z')

    // The second call must have used the cursor the first page returned.
    expect(api.getThreadMessages).toHaveBeenLastCalledWith(MOBILE, expect.objectContaining({ cursor: 'cursor-page1' }))
  })

  test('a third "load more" click uses the second page cursor, walking further back in 3-day steps', async () => {
    const store = buildStore()
    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(5, 12)],
      nextCursor: 'cursor-page1',
      hasMore: true,
      oldestLoadedDate: '2026-01-10T00:00:00.000Z',
      newestLoadedDate: '2026-01-13T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchThreadMessages({ mobile: MOBILE }))

    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(4, 9)],
      nextCursor: 'cursor-page2',
      hasMore: true,
      oldestLoadedDate: '2026-01-07T00:00:00.000Z',
      newestLoadedDate: '2026-01-10T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchMoreThreadMessages({ mobile: MOBILE }))

    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(3, 6)],
      nextCursor: null,
      hasMore: false,
      oldestLoadedDate: '2026-01-04T00:00:00.000Z',
      newestLoadedDate: '2026-01-07T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchMoreThreadMessages({ mobile: MOBILE }))

    expect(api.getThreadMessages).toHaveBeenLastCalledWith(MOBILE, expect.objectContaining({ cursor: 'cursor-page2' }))
    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items.map((m) => m.id)).toEqual([3, 4, 5])
    expect(thread.hasMore).toBe(false)
  })

  test('duplicate messages across an overlapping page never appear twice', async () => {
    const store = buildStore()
    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(2, 11), msg(3, 12)],
      nextCursor: 'cursor-page1',
      hasMore: true,
      oldestLoadedDate: '2026-01-10T00:00:00.000Z',
      newestLoadedDate: '2026-01-13T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchThreadMessages({ mobile: MOBILE }))

    // A pathological/overlapping response that re-sends message id 2 as well as new ones.
    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(0, 8), msg(1, 9), msg(2, 11)],
      nextCursor: null,
      hasMore: false,
      oldestLoadedDate: '2026-01-07T00:00:00.000Z',
      newestLoadedDate: '2026-01-10T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchMoreThreadMessages({ mobile: MOBILE }))

    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items.map((m) => m.id)).toEqual([0, 1, 2, 3])
  })

  test('on API failure, existing messages/hasMore/oldestLoadedDate are left completely untouched, and an error is recorded', async () => {
    const store = buildStore()
    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(3, 10)],
      nextCursor: 'cursor-page1',
      hasMore: true,
      oldestLoadedDate: '2026-01-10T00:00:00.000Z',
      newestLoadedDate: '2026-01-13T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchThreadMessages({ mobile: MOBILE }))

    api.getThreadMessages.mockRejectedValueOnce(new Error('network down'))
    await store.dispatch(fetchMoreThreadMessages({ mobile: MOBILE }))

    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items.map((m) => m.id)).toEqual([3])
    expect(thread.hasMore).toBe(true)
    expect(thread.oldestLoadedDate).toBe('2026-01-10T00:00:00.000Z')
    expect(thread.loadMoreStatus).toBe('failed')
    expect(thread.loadMoreError).toBe('network down')

    // Retrying (dispatching the same thunk again) must be possible and resume from the same cursor.
    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(2, 9)],
      nextCursor: null,
      hasMore: false,
      oldestLoadedDate: '2026-01-07T00:00:00.000Z',
      newestLoadedDate: '2026-01-10T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchMoreThreadMessages({ mobile: MOBILE }))
    const retried = store.getState().messages.byMobile[MOBILE]
    expect(retried.items.map((m) => m.id)).toEqual([2, 3])
    expect(retried.loadMoreStatus).toBe('succeeded')
    expect(api.getThreadMessages).toHaveBeenLastCalledWith(MOBILE, expect.objectContaining({ cursor: 'cursor-page1' }))
  })

  test('does not fire a second request while one is already in flight (rapid double-click)', async () => {
    const store = buildStore()
    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(3, 10)],
      nextCursor: 'cursor-page1',
      hasMore: true,
      oldestLoadedDate: '2026-01-10T00:00:00.000Z',
      newestLoadedDate: '2026-01-13T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchThreadMessages({ mobile: MOBILE }))

    let resolveSecondCall
    api.getThreadMessages.mockImplementationOnce(
      () => new Promise((resolve) => { resolveSecondCall = resolve }),
    )

    // Fire two "load more" dispatches back-to-back, as a rapid double-click would. RTK's
    // `condition` option runs synchronously (up to the thunk's first internal `await`)
    // before `dispatch()` returns, so the second call's condition check already sees
    // `loadMoreStatus: 'loading'` from the first and is blocked before it ever calls the API.
    const first = store.dispatch(fetchMoreThreadMessages({ mobile: MOBILE }))
    const second = store.dispatch(fetchMoreThreadMessages({ mobile: MOBILE }))
    await second // the condition-blocked dispatch resolves immediately either way

    // 1 call for the initial fetchThreadMessages page + 1 for the single load-more
    // request that actually went through — the second, blocked dispatch adds none.
    expect(api.getThreadMessages).toHaveBeenCalledTimes(2)

    resolveSecondCall({
      items: [msg(2, 9)],
      nextCursor: null,
      hasMore: false,
      oldestLoadedDate: '2026-01-07T00:00:00.000Z',
      newestLoadedDate: '2026-01-10T00:00:00.000Z',
      contact: null,
    })
    await first
  })

  test('does nothing when hasMore is already false', async () => {
    const store = buildStore()
    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(3, 10)],
      nextCursor: null,
      hasMore: false,
      oldestLoadedDate: '2026-01-10T00:00:00.000Z',
      newestLoadedDate: '2026-01-13T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchThreadMessages({ mobile: MOBILE }))

    await store.dispatch(fetchMoreThreadMessages({ mobile: MOBILE }))
    expect(api.getThreadMessages).toHaveBeenCalledTimes(1) // only the initial fetch
  })
})

describe('a new message arriving while older history loads', () => {
  test('a socket-delivered message and a prepended older page do not clobber each other', async () => {
    const store = buildStore()
    api.getThreadMessages.mockResolvedValueOnce({
      items: [msg(3, 10)],
      nextCursor: 'cursor-page1',
      hasMore: true,
      oldestLoadedDate: '2026-01-10T00:00:00.000Z',
      newestLoadedDate: '2026-01-13T00:00:00.000Z',
      contact: null,
    })
    await store.dispatch(fetchThreadMessages({ mobile: MOBILE }))

    let resolveLoadMore
    api.getThreadMessages.mockImplementationOnce(() => new Promise((resolve) => { resolveLoadMore = resolve }))
    const loadMorePromise = store.dispatch(fetchMoreThreadMessages({ mobile: MOBILE }))

    // A brand-new inbound message arrives via the socket while that request is still in flight.
    store.dispatch(addMessage({ mobile: MOBILE, message: msg(6, 14) }))

    resolveLoadMore({
      items: [msg(2, 9)],
      nextCursor: null,
      hasMore: false,
      oldestLoadedDate: '2026-01-07T00:00:00.000Z',
      newestLoadedDate: '2026-01-10T00:00:00.000Z',
      contact: null,
    })
    await loadMorePromise

    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items.map((m) => m.id)).toEqual([2, 3, 6])
  })
})

function optimistic(id, text) {
  return { id, mobile: MOBILE, direction: 'outbound', type: 'text', text, media: null, status: 'sending', failedReason: null, vendorMessageId: null, createdAt: '2026-01-10T10:00:00.000Z' }
}

describe('sendMessage (optimistic send)', () => {
  beforeEach(() => vi.clearAllMocks())

  test('the optimistic message appears in the thread immediately (pending) — before the API call resolves', async () => {
    let resolveSend
    api.sendMessage.mockImplementationOnce(() => new Promise((resolve) => { resolveSend = resolve }))
    const store = buildStore()

    const sendPromise = store.dispatch(
      sendMessage({ mobile: MOBILE, text: 'Hi', files: [], optimisticMessages: [optimistic('temp-1', 'Hi')] }),
    )

    // Never hidden while sending — visible the instant Send is pressed, not after the request resolves.
    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items).toHaveLength(1)
    expect(thread.items[0]).toMatchObject({ id: 'temp-1', status: 'sending', text: 'Hi' })

    resolveSend({ messages: [{ id: 42, mobile: MOBILE, direction: 'outbound', type: 'text', text: 'Hi', media: null, status: 'sent', createdAt: '2026-01-10T10:00:01.000Z' }] })
    await sendPromise
  })

  test('on success, the optimistic message is replaced by the real server message (real id, real status)', async () => {
    api.sendMessage.mockResolvedValueOnce({
      messages: [{ id: 42, mobile: MOBILE, direction: 'outbound', type: 'text', text: 'Hi', media: null, status: 'sent', createdAt: '2026-01-10T10:00:01.000Z' }],
    })
    const store = buildStore()
    await store.dispatch(sendMessage({ mobile: MOBILE, text: 'Hi', files: [], optimisticMessages: [optimistic('temp-1', 'Hi')] }))

    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items).toHaveLength(1)
    expect(thread.items[0]).toMatchObject({ id: 42, status: 'sent' })
  })

  test('on failure, the optimistic message stays in the thread as "failed" with the error — it is never removed', async () => {
    api.sendMessage.mockRejectedValueOnce(new Error('network down'))
    const store = buildStore()
    await store.dispatch(sendMessage({ mobile: MOBILE, text: 'Hi', files: [], optimisticMessages: [optimistic('temp-1', 'Hi')] }))

    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items).toHaveLength(1)
    expect(thread.items[0]).toMatchObject({ id: 'temp-1', status: 'failed', failedReason: 'network down' })
  })

  test('each message has independent status: one send failing does not affect a different, concurrently in-flight send', async () => {
    let rejectFirst
    api.sendMessage.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject }))
    const store = buildStore()
    const first = store.dispatch(
      sendMessage({ mobile: MOBILE, text: 'First', files: [], optimisticMessages: [optimistic('temp-1', 'First')] }),
    )

    api.sendMessage.mockResolvedValueOnce({
      messages: [{ id: 99, mobile: MOBILE, direction: 'outbound', type: 'text', text: 'Second', media: null, status: 'sent', createdAt: '2026-01-10T10:00:02.000Z' }],
    })
    await store.dispatch(
      sendMessage({ mobile: MOBILE, text: 'Second', files: [], optimisticMessages: [optimistic('temp-2', 'Second')] }),
    )

    let thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items.find((m) => m.id === 'temp-1').status).toBe('sending')
    expect(thread.items.find((m) => m.id === 99).status).toBe('sent')

    rejectFirst(new Error('boom'))
    await first

    thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items.find((m) => m.id === 'temp-1').status).toBe('failed')
    expect(thread.items.find((m) => m.id === 99).status).toBe('sent') // untouched by the other message's failure
  })
})

describe('retryMessage', () => {
  beforeEach(() => vi.clearAllMocks())

  test('re-sends a failed message and replaces it with the real server message on success', async () => {
    const store = buildStore()
    api.sendMessage.mockRejectedValueOnce(new Error('network down'))
    await store.dispatch(sendMessage({ mobile: MOBILE, text: 'Retry me', files: [], optimisticMessages: [optimistic('temp-9', 'Retry me')] }))
    expect(store.getState().messages.byMobile[MOBILE].items[0].status).toBe('failed')

    api.sendMessage.mockResolvedValueOnce({
      messages: [{ id: 55, mobile: MOBILE, direction: 'outbound', type: 'text', text: 'Retry me', media: null, status: 'sent', createdAt: '2026-01-10T10:00:05.000Z' }],
    })
    await store.dispatch(retryMessage({ mobile: MOBILE, id: 'temp-9', text: 'Retry me', mediaUrl: null, mediaFilename: null }))

    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items).toHaveLength(1)
    expect(thread.items[0]).toMatchObject({ id: 55, status: 'sent' })
  })

  test('a failed retry leaves the same message visible with status "failed" again, not removed', async () => {
    const store = buildStore()
    api.sendMessage.mockRejectedValueOnce(new Error('first failure'))
    await store.dispatch(sendMessage({ mobile: MOBILE, text: 'Retry me', files: [], optimisticMessages: [optimistic('temp-9', 'Retry me')] }))

    api.sendMessage.mockRejectedValueOnce(new Error('still down'))
    await store.dispatch(retryMessage({ mobile: MOBILE, id: 'temp-9', text: 'Retry me', mediaUrl: null, mediaFilename: null }))

    const thread = store.getState().messages.byMobile[MOBILE]
    expect(thread.items).toHaveLength(1)
    expect(thread.items[0]).toMatchObject({ id: 'temp-9', status: 'failed', failedReason: 'still down' })
  })
})
