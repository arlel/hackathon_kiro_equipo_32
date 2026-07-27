import { useRef, useCallback } from 'react'

interface UseLongPressOptions {
  onShortPress: () => void
  onLongPress: () => void
  threshold?: number
  /** Interval in ms to repeat onLongPress while held. 0 = no repeat. */
  repeatInterval?: number
}

export function useLongPress({
  onShortPress,
  onLongPress,
  threshold = 500,
  repeatInterval = 200,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isLongPressRef = useRef(false)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const onPointerDown = useCallback(() => {
    isLongPressRef.current = false
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress()
      // Start repeating if repeatInterval is set
      if (repeatInterval > 0) {
        intervalRef.current = setInterval(() => {
          onLongPress()
        }, repeatInterval)
      }
    }, threshold)
  }, [onLongPress, threshold, repeatInterval])

  const onPointerUp = useCallback(() => {
    cleanup()
    if (!isLongPressRef.current) {
      onShortPress()
    }
    isLongPressRef.current = false
  }, [onShortPress, cleanup])

  const onPointerLeave = useCallback(() => {
    cleanup()
    isLongPressRef.current = false
  }, [cleanup])

  return { onPointerDown, onPointerUp, onPointerLeave }
}
