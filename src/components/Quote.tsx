import { useState } from 'react'
import { pickQuote, quoteText, type QuoteKind } from '../lib/quotes'
import { t } from '../lib/i18n'
import { RefreshIcon } from './icons'

/** Aşama değişince `key` ile yeniden oluşturulur ve yeni bir söz seçer. */
export function Quote({ kind }: { kind: QuoteKind }) {
  const [index, setIndex] = useState(() => pickQuote(kind))
  return (
    <figure className="quote">
      <blockquote>“{quoteText(kind, index)}”</blockquote>
      <button
        className="quote-next"
        title={t('quoteNext')}
        aria-label={t('quoteNext')}
        onClick={() => setIndex((prev) => pickQuote(kind, prev))}
      >
        <RefreshIcon size={15} />
      </button>
    </figure>
  )
}
