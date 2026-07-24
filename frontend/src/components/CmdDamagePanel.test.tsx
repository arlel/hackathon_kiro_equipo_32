import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import CmdDamagePanel from './CmdDamagePanel'

const mockSources = [
  { id: 'cmd-1', name: 'Atraxa, Praetors Voice', damage: 5 },
  { id: 'cmd-2', name: 'Tymna the Weaver', damage: 20, isPartner: true },
  { id: 'cmd-3', name: 'Thrasios, Triton Hero', damage: 21, isPartner: true },
]

describe('CmdDamagePanel', () => {
  it('renders all damage sources with names and values', () => {
    const onAdjust = vi.fn()
    render(<CmdDamagePanel sources={mockSources} onAdjust={onAdjust} />)

    expect(screen.getByText('Atraxa, Praetors Voice')).toBeInTheDocument()
    expect(screen.getByText('Tymna the Weaver')).toBeInTheDocument()
    expect(screen.getByText('Thrasios, Triton Hero')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('21')).toBeInTheDocument()
  })

  it('shows "Partner" label for partner sources', () => {
    const onAdjust = vi.fn()
    render(<CmdDamagePanel sources={mockSources} onAdjust={onAdjust} />)

    const partnerLabels = screen.getAllByText('Partner')
    expect(partnerLabels).toHaveLength(2)
  })

  it('shows visual warning when damage >= 21', () => {
    const onAdjust = vi.fn()
    render(<CmdDamagePanel sources={mockSources} onAdjust={onAdjust} />)

    expect(screen.getByText('☠ 21+')).toBeInTheDocument()
  })

  it('does not show warning when damage < 21', () => {
    const onAdjust = vi.fn()
    const sources = [{ id: 'cmd-1', name: 'Test Commander', damage: 10 }]
    render(<CmdDamagePanel sources={sources} onAdjust={onAdjust} />)

    expect(screen.queryByText('☠ 21+')).not.toBeInTheDocument()
  })

  it('calls onAdjust with +1 on short press of increment button', () => {
    const onAdjust = vi.fn()
    const sources = [{ id: 'cmd-1', name: 'Test Commander', damage: 5 }]
    render(<CmdDamagePanel sources={sources} onAdjust={onAdjust} />)

    const incrementBtn = screen.getByText('+')
    fireEvent.pointerDown(incrementBtn)
    fireEvent.pointerUp(incrementBtn)

    expect(onAdjust).toHaveBeenCalledWith('cmd-1', 1)
  })

  it('calls onAdjust with -1 on short press of decrement button', () => {
    const onAdjust = vi.fn()
    const sources = [{ id: 'cmd-1', name: 'Test Commander', damage: 5 }]
    render(<CmdDamagePanel sources={sources} onAdjust={onAdjust} />)

    const decrementBtn = screen.getByText('−')
    fireEvent.pointerDown(decrementBtn)
    fireEvent.pointerUp(decrementBtn)

    expect(onAdjust).toHaveBeenCalledWith('cmd-1', -1)
  })

  it('calls onAdjust with +10 on long press of increment button', () => {
    vi.useFakeTimers()
    const onAdjust = vi.fn()
    const sources = [{ id: 'cmd-1', name: 'Test Commander', damage: 5 }]
    render(<CmdDamagePanel sources={sources} onAdjust={onAdjust} />)

    const incrementBtn = screen.getByText('+')
    fireEvent.pointerDown(incrementBtn)
    vi.advanceTimersByTime(500)

    expect(onAdjust).toHaveBeenCalledWith('cmd-1', 10)
    vi.useRealTimers()
  })

  it('calls onAdjust with -10 on long press of decrement button', () => {
    vi.useFakeTimers()
    const onAdjust = vi.fn()
    const sources = [{ id: 'cmd-1', name: 'Test Commander', damage: 5 }]
    render(<CmdDamagePanel sources={sources} onAdjust={onAdjust} />)

    const decrementBtn = screen.getByText('−')
    fireEvent.pointerDown(decrementBtn)
    vi.advanceTimersByTime(500)

    expect(onAdjust).toHaveBeenCalledWith('cmd-1', -10)
    vi.useRealTimers()
  })

  it('renders empty state when no sources provided', () => {
    const onAdjust = vi.fn()
    render(<CmdDamagePanel sources={[]} onAdjust={onAdjust} />)

    expect(screen.getByText('No hay fuentes de daño')).toBeInTheDocument()
  })

  it('renders the Commander Damage heading', () => {
    const onAdjust = vi.fn()
    render(<CmdDamagePanel sources={mockSources} onAdjust={onAdjust} />)

    expect(screen.getByText('Commander Damage')).toBeInTheDocument()
  })
})
