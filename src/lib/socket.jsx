import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { API_ORIGIN, API_BASE_PATH } from './apiConfig'

// A real network connection is a side effect, so it must live outside the render
// cycle as a true module-level singleton — creating it via useMemo/useState is not
// safe, since React (StrictMode in particular) can invoke that factory more than
// once per mount, producing two competing connections where only one ends up wired
// to the component tree's listeners.
// The socket.io handshake lives under the same `/crm-whatsapp` prefix as the REST API.
const socket = io(API_ORIGIN, { path: `${API_BASE_PATH}/socket.io`, autoConnect: true })

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(socket.connected)

  useEffect(() => {
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      // Never disconnect here — the socket is a shared singleton for the app's
      // lifetime, not owned by this component instance.
    }
  }, [])

  const value = useMemo(() => ({ socket, connected }), [connected])
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider/context
export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider')
  return ctx
}