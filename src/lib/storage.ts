import { useEffect, useState } from 'react'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** localStorage ile senkron tutulan state. Nesne ise varsayılanlarla birleştirilir. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return initial
      const parsed: unknown = JSON.parse(raw)
      if (isPlainObject(initial) && isPlainObject(parsed)) {
        return { ...initial, ...parsed } as T
      }
      return parsed as T
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (err) {
      console.warn(`"${key}" kaydedilemedi (depolama dolu olabilir)`, err)
    }
  }, [key, value])

  return [value, setValue] as const
}
