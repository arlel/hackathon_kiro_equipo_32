import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import StarterPicker from './StarterPicker'

const mockPlayers = [
  { id: '1', username: 'Alice' },
  { id: '2', username: 'Bob' },
  { id: '3', username: 'Charlie' },
]

describe('StarterPicker', () => {
  it('renders the select button', () => {
    render(
      <StarterPicker players={mockPlayers} selectedId={null} onSelect={() => {}} />
    )
    expect(screen.getByText('Seleccionar Jugador Inicial')).toBeDefined()
  })

  it('disables button when fewer than 2 players', () => {
    render(
      <StarterPicker players={[{ id: '1', username: 'Alice' }]} selectedId={null} onSelect={() => {}} />
    )
    const button = screen.getByText('Seleccionar Jugador Inicial') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('enables button when 2 or more players are present', () => {
    render(
      <StarterPicker players={mockPlayers} selectedId={null} onSelect={() => {}} />
    )
    const button = screen.getByText('Seleccionar Jugador Inicial') as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it('calls onSelect when button is clicked', () => {
    const onSelect = vi.fn()
    render(
      <StarterPicker players={mockPlayers} selectedId={null} onSelect={onSelect} />
    )
    fireEvent.click(screen.getByText('Seleccionar Jugador Inicial'))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('shows placeholder text when no selection and no animation', () => {
    render(
      <StarterPicker players={mockPlayers} selectedId={null} onSelect={() => {}} />
    )
    expect(screen.getByText('¿Quién empieza?')).toBeDefined()
  })

  it('shows message when fewer than 2 players', () => {
    render(
      <StarterPicker players={[{ id: '1', username: 'Solo' }]} selectedId={null} onSelect={() => {}} />
    )
    expect(screen.getByText('Se necesitan al menos 2 jugadores')).toBeDefined()
  })

  it('shows golden border styling when animation completes', () => {
    vi.useFakeTimers()

    const { container } = render(
      <StarterPicker players={mockPlayers} selectedId="2" onSelect={() => {}} />
    )

    // Fast-forward through the animation (max 4s + buffer)
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // After animation, should show the golden border
    const rouletteBox = container.querySelector('.border-yellow-400')
    expect(rouletteBox).not.toBeNull()

    vi.useRealTimers()
  })
})
