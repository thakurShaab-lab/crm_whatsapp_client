import '@testing-library/jest-dom'
import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationMessage } from './LocationMessage.jsx'

describe('LocationMessage', () => {
  test('the map preview and the "open in maps" link both use the exact sent coordinates', () => {
    render(<LocationMessage message={{ location: { latitude: 28.66027, longitude: 77.15193 } }} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps?q=28.66027,77.15193')

    const img = screen.getByAltText('Shared location')
    expect(img.src).toContain('28.66027,77.15193')

    expect(screen.getByText('28.66027, 77.15193')).toBeInTheDocument()
  })

  test('falls back to a plain pin card, not a broken image, if the map preview fails to load', () => {
    render(<LocationMessage message={{ location: { latitude: 1, longitude: 2 } }} />)
    const img = screen.getByAltText('Shared location')

    fireEvent.error(img)

    expect(screen.queryByAltText('Shared location')).not.toBeInTheDocument()
    expect(screen.getByText('Map preview unavailable')).toBeInTheDocument()
  })
})
