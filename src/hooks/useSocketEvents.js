import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useSocket } from '../lib/socket.jsx'
import { upsertConversation, patchUnreadCount, patchLastMessageStatus } from '../store/conversationsSlice'
import { addMessage, patchMessageStatus } from '../store/messagesSlice'

/** Wires the three server-pushed events into the Redux store — no polling, no refetching. */
export function useSocketEvents() {
  const { socket } = useSocket()
  const dispatch = useDispatch()

  useEffect(() => {
    function onNewMessage({ mobile, message, conversation }) {
      dispatch(addMessage({ mobile, message }))
      dispatch(upsertConversation(conversation))
    }

    function onStatusUpdate({ mobile, messageId, status }) {
      dispatch(patchMessageStatus({ mobile, messageId, status }))
      dispatch(patchLastMessageStatus({ mobile, status }))
    }

    function onConversationRead({ mobile }) {
      dispatch(patchUnreadCount({ mobile }))
    }

    socket.on('conversation:new_message', onNewMessage)
    socket.on('message:status_update', onStatusUpdate)
    socket.on('conversation:read', onConversationRead)

    return () => {
      socket.off('conversation:new_message', onNewMessage)
      socket.off('message:status_update', onStatusUpdate)
      socket.off('conversation:read', onConversationRead)
    }
  }, [socket, dispatch])
}

/** Tells the server which thread this client currently has open (drives auto-read-on-open). */
export function useConversationSubscription(mobile) {
  const { socket } = useSocket()

  useEffect(() => {
    if (mobile == null) return undefined
    socket.emit('conversation:subscribe', { mobile })
    return () => socket.emit('conversation:unsubscribe', { mobile })
  }, [socket, mobile])
}