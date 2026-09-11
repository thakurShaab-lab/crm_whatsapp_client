import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import uiReducer from '../../store/uiSlice'
import messagesReducer from '../../store/messagesSlice'
import * as api from '../../lib/api'
import { MessageComposer } from './MessageComposer.jsx'

vi.mock('../../lib/api')

const MOBILE = '919999900000'

function renderComposer() {
  const store = configureStore({ reducer: { ui: uiReducer, messages: messagesReducer } })
  render(
    <Provider store={store}>
      <MessageComposer mobile={MOBILE} />
    </Provider>,
  )
  return store
}

/** A controllable "backend took 2-3 seconds" stand-in — resolves only when the test calls `resolve()`. */
function deferredSend() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  api.sendMessage.mockReturnValueOnce(promise.then(() => ({ messages: [{ id: 1, mobile: MOBILE, direction: 'outbound', type: 'text', text: 'Hello', media: null, status: 'sending', createdAt: new Date().toISOString() }] })))
  return { resolve }
}

describe('MessageComposer send behavior', () => {
  beforeEach(() => vi.clearAllMocks())

  test('the input box clears immediately, before the (slow) send request ever resolves', async () => {
    const { resolve } = deferredSend()
    renderComposer()

    const textarea = screen.getByPlaceholderText('Type a message')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    expect(textarea.value).toBe('Hello')

    fireEvent.click(screen.getByLabelText('Send message'))

    // Cleared synchronously — does not wait for the pending API call.
    expect(textarea.value).toBe('')
    expect(api.sendMessage).toHaveBeenCalledTimes(1)

    resolve()
    await new Promise((r) => setTimeout(r, 0))
  })

  test('rapid double Enter with no gap between keydowns sends the message only once', async () => {
    const { resolve } = deferredSend()
    renderComposer()

    const textarea = screen.getByPlaceholderText('Type a message')
    fireEvent.change(textarea, { target: { value: 'Hello' } })

    // Two Enter keydowns fired back-to-back, exactly like OS key-repeat or an
    // impatient double-press — no `await`/tick between them.
    fireEvent.keyDown(textarea, { key: 'Enter' })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    expect(api.sendMessage).toHaveBeenCalledTimes(1)
    expect(textarea.value).toBe('')

    resolve()
    await new Promise((r) => setTimeout(r, 0))
  })

  test('rapid double click on Send sends the message only once', async () => {
    const { resolve } = deferredSend()
    renderComposer()

    const textarea = screen.getByPlaceholderText('Type a message')
    fireEvent.change(textarea, { target: { value: 'Hello' } })

    const sendButton = screen.getByLabelText('Send message')
    fireEvent.click(sendButton)
    fireEvent.click(sendButton)

    expect(api.sendMessage).toHaveBeenCalledTimes(1)

    resolve()
    await new Promise((r) => setTimeout(r, 0))
  })

  test('Shift+Enter does not send (only inserts a newline via the default textarea behavior)', () => {
    renderComposer()
    const textarea = screen.getByPlaceholderText('Type a message')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(api.sendMessage).not.toHaveBeenCalled()
  })

  test('pressing Enter on an empty composer does nothing', () => {
    renderComposer()
    const textarea = screen.getByPlaceholderText('Type a message')
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(api.sendMessage).not.toHaveBeenCalled()
  })

  test('a second message typed while the first is still in flight can be sent once the first clears', async () => {
    const { resolve } = deferredSend()
    renderComposer()
    const textarea = screen.getByPlaceholderText('Type a message')

    fireEvent.change(textarea, { target: { value: 'First' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(textarea.value).toBe('') // cleared immediately, free to type the next one

    resolve()
    await new Promise((r) => setTimeout(r, 0))

    deferredSend()
    fireEvent.change(textarea, { target: { value: 'Second' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    expect(api.sendMessage).toHaveBeenCalledTimes(2)
    expect(api.sendMessage).toHaveBeenNthCalledWith(1, MOBILE, { text: 'First', files: [] })
    expect(api.sendMessage).toHaveBeenNthCalledWith(2, MOBILE, { text: 'Second', files: [] })
  })
})
