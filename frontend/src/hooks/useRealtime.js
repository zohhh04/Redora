import { useEffect, useRef } from 'react'
import { onSocket } from '../api/socket'

// Subscribe to real-time server pushes and fire the callback whenever anything
// the current user cares about changes (request status / journey updates).
// Using a ref keeps the latest callback without re-subscribing every render.
export function useRealtimeRequest(callback) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    return onSocket('request:update', () => cbRef.current())
  }, [])
}