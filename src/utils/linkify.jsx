const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/gi

/**
 * Renders message text as plain React nodes with URLs turned into real <a> elements —
 * never dangerouslySetInnerHTML, since message text can originate from a customer's
 * inbound WhatsApp message and must never be interpreted as markup.
 */
export function Linkified({ text }) {
  if (!text) return null
  // A single capture group makes String.split alternate [text, url, text, url, ...],
  // so odd indices are always the captured URLs — no need to re-test each segment
  // against the (stateful, global-flagged) regex.
  const parts = text.split(URL_PATTERN)

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noreferrer noopener"
        className="text-wa-tick-read underline underline-offset-2 break-all"
      >
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}