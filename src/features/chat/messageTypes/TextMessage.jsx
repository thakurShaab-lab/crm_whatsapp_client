import { Linkified } from '../../../utils/linkify.jsx'

export function TextMessage({ message }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[14.5px] leading-5 text-wa-text-primary">
      <Linkified text={message.text} />
    </p>
  )
}
