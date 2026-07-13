import { useCallback, useRef, useState } from 'react'
import type { Achievement } from '../achievements'
import type { Trophy } from '../trophyCase'

export type ToastUnlock = Achievement | Trophy

export function useAchievementToast() {
  const [toast, setToast] = useState<ToastUnlock | null>(null)
  const queue = useRef<ToastUnlock[]>([])

  const queueUnlocks = useCallback((items: ToastUnlock[]) => {
    if (!items.length) return
    queue.current.push(...items)
    setToast((current) => {
      if (current) return current
      return queue.current.shift() ?? null
    })
  }, [])

  const dismiss = useCallback(() => {
    setToast(queue.current.shift() ?? null)
  }, [])

  return { toast, queueUnlocks, dismiss }
}