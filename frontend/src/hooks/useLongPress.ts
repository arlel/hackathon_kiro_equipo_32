import { useRef, useCallback } from 'react'

interface UseLongPressOptions {
  onShortPress: () => void
  onLongPress: () => void
  threshold?: number
}

export function useLongPress({ onShortPress, onLongPress, threshold = 500 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)

  const onPointerDown = useCallback(() => {
    isLongPressRef.current = false
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress()
    }, threshold)
  }, [onLongPress, threshold])

  const onPointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!isLongPressRef.current) {
      onShortPress()
    }
    isLongPressRef.current = false
  }, [onShortPress])

  const onPointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    isLongPressRef.current = false
  }, [])

  return { onPointerDown, onPointerUp, onPointerLeave }
}
