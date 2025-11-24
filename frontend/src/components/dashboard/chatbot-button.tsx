"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import api from "@/lib/api"

interface Message {
    role: "user" | "assistant"
    content: string
}

export function ChatbotButton() {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const toggleBtnRef = useRef<HTMLButtonElement>(null)
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hi. I’m here to listen. Tell me more about what’s been happening." }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState<number | null>(null)

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!isOpen) return
            const target = e.target as Node
            const inside = containerRef.current?.contains(target)
            const onToggle = toggleBtnRef.current?.contains(target)
            if (!inside && !onToggle) {
                setIsOpen(false)
                // End session when closing
                try { api.post("/chat/session/end") } catch {}
                setSessionId(null)
            }
        }
        document.addEventListener("mousedown", onDocClick)
        return () => document.removeEventListener("mousedown", onDocClick)
    }, [isOpen])

    const handleToggle = async () => {
        if (isOpen) {
            setIsOpen(false)
            try { await api.post("/chat/session/end") } catch {}
            setSessionId(null)
        } else {
            try {
                const res = await api.post("/chat/session/new")
                setSessionId(res.data.id)
            } catch {
                setSessionId(null)
            }
            setMessages([{ role: "assistant", content: "Hi. I’m here to listen. Tell me more about what’s been happening." }])
            setIsOpen(true)
        }
    }

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: "user", content: input }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        const controller = new AbortController()
        const timer = setTimeout(() => {
            const fallbacks = [
                "That sounds a lot. I’m here—what part feels most intense?",
                "You’re not alone right now. If it helps, tell me more.",
                "It’s okay to take a breath. What’s been weighing on you today?",
                "I’m listening. What feels hardest in this moment?"
            ]
            setMessages(prev => [...prev, { role: "assistant", content: fallbacks[Math.floor(Math.random() * fallbacks.length)] }])
            try { controller.abort() } catch {}
            setIsLoading(false)
        }, 2200)

        try {
            const response = await api.post("/chat/ask", { role: "user", content: input, context: { session_id: sessionId } }, { signal: controller.signal })
            clearTimeout(timer)
            const aiMessage: Message = { role: "assistant", content: response.data.content }
            setMessages(prev => [...prev, aiMessage])
        } catch (error: unknown) {
            clearTimeout(timer)
            const err = error as { code?: string }
            if (err?.code !== "ERR_CANCELED") {
                console.error("Chat error:", error)
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Chatbot Popup */}
            {isOpen && (
                <div ref={containerRef} className="fixed bottom-24 right-8 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-t-2xl">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <MessageCircle className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="font-semibold">AssignWell Companion</h3>
                            </div>
                        </div>
                        <div className="flex gap-1" />
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex gap-2",
                                        message.role === "user" && "flex-row-reverse"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                        message.role === "assistant" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                                    )}>
                                        {message.role === "assistant" ? "🤖" : "👤"}
                                    </div>
                                    <div className={cn(
                                        "max-w-[70%] rounded-2xl px-4 py-2",
                                        message.role === "assistant" ? "bg-rose-50 text-rose-900" : "bg-amber-500 text-white"
                                    )}>
                                        <p className="text-sm">{message.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">🤖</div>
                                    <div className="bg-gray-100 rounded-2xl px-4 py-2">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-4 border-t">
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Type a message..."
                                className="flex-1"
                                disabled={isLoading}
                            />
                            <Button aria-label="Send" onClick={handleSend} disabled={!input.trim() || isLoading} className="bg-amber-500 hover:bg-amber-600">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={handleToggle}
                ref={toggleBtnRef}
                className="fixed bottom-8 right-8 w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
                aria-label="Message Square"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
            </button>
        </>
    )
}
