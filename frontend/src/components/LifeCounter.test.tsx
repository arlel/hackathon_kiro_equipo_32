import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import LifeCounter from './LifeCounter'

describe('LifeCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('displays the current life value', () => {
    render(<LifeCounter life={40} onAdjust={vi.fn()} />)
    expect(screen.getByText('40')).toBeDefined()
  })

  it('calls onAdjust with -1 on short press of decrease button', () => {
    const onAdjust = vi.fn()
    render(<LifeCounter life={40} onAdjust={onAdjust} />)

    const decreaseBtn = screen.getByLabelText('Decrease life')
    fireEvent.pointerDown(decreaseBtn)
    fireEvent.pointerUp(decreaseBtn)

    expect(onAdjust).toHaveBeenCalledWith(-1)
  })

  it('calls onAdjust with +1 on short press of increase button', () => {
    const onAdjust = vi.fn()
    render(<LifeCounter life={20} onAdjust={onAdjust} />)

    const increaseBtn = screen.getByLabelText('Increase life')
    fireEvent.pointerDown(increaseBtn)
    fireEvent.pointerUp(increaseBtn)

    expect(onAdjust).toHaveBeenCalledWith(1)
  })

  it('calls onAdjust with -10 on long press of decrease button', () => {
    const onAdjust = vi.fn()
    render(<LifeCounter life={40} onAdjust={onAdjust} />)

    const decreaseBtn = screen.getByLabelText('Decrease life')
    fireEvent.pointerDown(decreaseBtn)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    fireEvent.pointerUp(decreaseBtn)

    expect(onAdjust).toHaveBeenCalledWith(-10)
    expect(onAdjust).not.toHaveBeenCalledWith(-1)
  })

  it('calls onAdjust with +10 on long press of increase button', () => {
    const onAdjust = vi.fn()
    render(<LifeCounter life={20} onAdjust={onAdjust} />)

    const increaseBtn = screen.getByLabelText('Increase life')
    fireEvent.pointerDown(increaseBtn)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    fireEvent.pointerUp(increaseBtn)

    expect(onAdjust).toHaveBeenCalledWith(10)
    expect(onAdjust).not.toHaveBeenCalledWith(1)
  })

  it('renders life text with minimum 48px font size', () => {
    render(<LifeCounter life={40} onAdjust={vi.fn()} />)
    const lifeDisplay = screen.getByText('40')
    expect(lifeDisplay.style.fontSize).toBe('48px')
  })

  it('renders buttons with minimum 44x44px touch area', () => {
    render(<LifeCounter life={40} onAdjust={vi.fn()} />)
    const decreaseBtn = screen.getByLabelText('Decrease life')
    const increaseBtn = screen.getByLabelText('Increase life')

    expect(decreaseBtn.className).toContain('min-w-[44px]')
    expect(decreaseBtn.className).toContain('min-h-[44px]')
    expect(increaseBtn.className).toContain('min-w-[44px]')
    expect(increaseBtn.className).toContain('min-h-[44px]')
  })

  it('does not trigger short press if pointer leaves before release', () => {
    const onAdjust = vi.fn()
    render(<LifeCounter life={40} onAdjust={onAdjust} />)

    const increaseBtn = screen.getByLabelText('Increase life')
    fireEvent.pointerDown(increaseBtn)
    fireEvent.pointerLeave(increaseBtn)

    expect(onAdjust).not.toHaveBeenCalled()
  })
})
