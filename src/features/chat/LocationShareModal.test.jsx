import '@testing-library/jest-dom'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import messagesReducer from '../../store/messagesSlice'
import * as api from '../../lib/api'
import { LocationShareModal } from './LocationShareModal.jsx'

vi.mock('../../lib/api')

const MOBILE = '919999900000'

function renderModal(onClose = vi.fn()) {
  const store = configureStore({ reducer: { messages: messagesReducer } })
  render(
    <Provider store={store}>
      <LocationShareModal mobile={MOBILE} onClose={onClose} />
    </Provider>,
  )
  return { store, onClose }
}

describe('LocationShareModal', () => {
  let originalGeolocation
  let originalFetch

  beforeEach(() => {
    vi.clearAllMocks()
    originalGeolocation = navigator.geolocation
    originalFetch = globalThis.fetch
    api.sendMessage.mockResolvedValue({
      messages: [{ id: 1, mobile: MOBILE, direction: 'outbound', type: 'text', text: 'x', media: null, status: 'sending', createdAt: new Date().toISOString() }],
    })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', { value: originalGeolocation, configurable: true })
    globalThis.fetch = originalFetch
    vi.useRealTimers()
  })

  test('shows both choices and sends nothing until one is picked', () => {
    renderModal()
    expect(screen.getByText('Send current location')).toBeInTheDocument()
    expect(screen.getByText('Search location')).toBeInTheDocument()
    expect(api.sendMessage).not.toHaveBeenCalled()
  })

  test('"Send current location" uses the real geolocation result and sends it', async () => {
    const getCurrentPosition = vi.fn((success) => success({ coords: { latitude: 12.34, longitude: 56.78 } }))
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
    const { onClose } = renderModal()

    fireEvent.click(screen.getByText('Send current location'))

    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(1))
    expect(api.sendMessage).toHaveBeenCalledWith(MOBILE, expect.objectContaining({ text: expect.stringContaining('12.34') }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  test('a permission-denied error is human-readable, not the raw browser error, and nothing is sent', async () => {
    const getCurrentPosition = vi.fn((_success, error) => error({ code: 1, PERMISSION_DENIED: 1 }))
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
    renderModal()

    fireEvent.click(screen.getByText('Send current location'))

    expect(await screen.findByText('Location permission denied')).toBeInTheDocument()
    expect(api.sendMessage).not.toHaveBeenCalled()
  })

  test('selecting a search result sends its own coordinates, not the current position', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ place_id: 1, display_name: 'Eiffel Tower, Paris', lat: '48.8584', lon: '2.2945' }],
    })
    const { onClose } = renderModal()

    fireEvent.click(screen.getByText('Search location'))
    fireEvent.change(screen.getByPlaceholderText('Search for a place or address'), { target: { value: 'Eiffel' } })
    await vi.advanceTimersByTimeAsync(500)

    const result = await screen.findByText('Eiffel Tower, Paris')
    fireEvent.click(result)

    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(1))
    expect(api.sendMessage).toHaveBeenCalledWith(MOBILE, expect.objectContaining({ text: expect.stringContaining('48.8584') }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  test('a search network failure shows a graceful error instead of crashing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    renderModal()

    fireEvent.click(screen.getByText('Search location'))
    fireEvent.change(screen.getByPlaceholderText('Search for a place or address'), { target: { value: 'Eiffel' } })
    await vi.advanceTimersByTimeAsync(500)

    expect(await screen.findByText(/could not search/i)).toBeInTheDocument()
    expect(api.sendMessage).not.toHaveBeenCalled()
  })

  test('clearing the search box clears any previous results', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ place_id: 1, display_name: 'Eiffel Tower, Paris', lat: '48.8584', lon: '2.2945' }],
    })
    renderModal()

    fireEvent.click(screen.getByText('Search location'))
    const input = screen.getByPlaceholderText('Search for a place or address')
    fireEvent.change(input, { target: { value: 'Eiffel' } })
    await vi.advanceTimersByTimeAsync(500)
    await screen.findByText('Eiffel Tower, Paris')

    fireEvent.change(input, { target: { value: '' } })
    expect(screen.queryByText('Eiffel Tower, Paris')).not.toBeInTheDocument()
  })
})
