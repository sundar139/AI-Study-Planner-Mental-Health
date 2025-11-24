import { useEffect, useState, useCallback } from "react"
import api from "@/lib/api"

interface ChatMessageOut {
  id: number
  session_id: number
  role: "user" | "assistant"
  content: string
  created_at: string
}

interface ChatSessionDetail {
  id: number
  user_id: number
  started_at: string
  ended_at?: string | null
  messages: ChatMessageOut[]
}

export function useChatSession() {
  const [session, setSession] = useState<ChatSessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCurrent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get("/chat/session/current")
      setSession(res.data as ChatSessionDetail)
    } catch {
      setError("Failed to load chat session")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrent()
  }, [fetchCurrent])

  return { session, loading, error, refresh: fetchCurrent }
}