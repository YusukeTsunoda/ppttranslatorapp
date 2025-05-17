import { useEffect, useRef, useState } from 'react'

export function useWebSocket(url: string) {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const connect = () => {
      const websocket = new WebSocket(url)

      websocket.onopen = () => {
        console.log('WebSocket接続が確立されました')
        setWs(websocket)
      }

      websocket.onclose = () => {
        console.log('WebSocket接続が切断されました')
        setWs(null)

        // 5秒後に再接続を試みる
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('WebSocket再接続を試みています...')
          connect()
        }, 5000)
      }

      websocket.onerror = (error) => {
        console.error('WebSocketエラー:', error)
      }
    }

    connect()

    return () => {
      if (ws) {
        ws.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [url])

  return ws
} 