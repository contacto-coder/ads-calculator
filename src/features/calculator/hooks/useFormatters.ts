import { useMemo } from 'react'
import { createFormatters, resolveDisplayLocale } from '../format'
import type { Formatters } from '../format'

/** Formateadores con el formato regional en español del dispositivo. */
export function useFormatters(): Formatters {
  return useMemo(() => {
    const language = typeof navigator === 'undefined' ? undefined : navigator.language
    return createFormatters(resolveDisplayLocale(language))
  }, [])
}
