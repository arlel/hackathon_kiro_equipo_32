import { useTranslation } from '@/i18n/I18nContext'
import { LANGUAGES } from '@/i18n/translations'

interface LanguageSwitcherProps {
  /** 'buttons' renders a compact flag toggle; 'menu' renders a labelled row for dropdowns. */
  variant?: 'buttons' | 'menu'
}

export default function LanguageSwitcher({ variant = 'buttons' }: LanguageSwitcherProps) {
  const { lang, setLang, t } = useTranslation()

  if (variant === 'menu') {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-200">🌐 {t('language.label')}</span>
        <div className="flex gap-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLang(l.value)}
              className={`px-2 py-1 rounded-md text-sm transition-colors ${
                lang === l.value ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              aria-pressed={lang === l.value}
              title={l.label}
            >
              {l.flag}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-1" role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => setLang(l.value)}
          className={`px-2.5 py-1 rounded-lg text-sm transition-colors ${
            lang === l.value
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          aria-pressed={lang === l.value}
          title={l.label}
        >
          {l.flag} {l.value.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
