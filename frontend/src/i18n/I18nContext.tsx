import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { translations, type Lang } from './translations'

const STORAGE_KEY = 'lang'
const DEFAULT_LANG: Lang = 'es'

type TParams = Record<string, string | number>

interface I18nContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, params?: TParams) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

function getInitialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'es' || saved === 'en') return saved
  return DEFAULT_LANG
}

// Resolve a dot-path key ('home.createRoom') against a translation object.
function resolve(obj: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part]
    return undefined
  }, obj)
  return typeof value === 'string' ? value : undefined
}

// Replace {{param}} placeholders.
function interpolate(template: string, params?: TParams): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{{${name}}}`
  )
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const t = useCallback(
    (key: string, params?: TParams): string => {
      const str = resolve(translations[lang], key) ?? resolve(translations[DEFAULT_LANG], key)
      if (str === undefined) {
        console.warn(`[i18n] missing translation key: ${key}`)
        return key
      }
      return interpolate(str, params)
    },
    [lang]
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// Fallback used when a component is rendered outside a provider (e.g. isolated
// unit tests). Translates against the default language; setLang is a no-op.
const fallbackContext: I18nContextType = {
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key, params) => {
    const str = resolve(translations[DEFAULT_LANG], key)
    if (str === undefined) return key
    return interpolate(str, params)
  },
}

export function useTranslation() {
  return useContext(I18nContext) ?? fallbackContext
}
