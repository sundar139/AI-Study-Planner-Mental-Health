"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MessageSquare, Send, Bot, User } from "lucide-react"
import api from "@/lib/api"

interface Message {
    role: "user" | "assistant"
    content: string
}

export function ChatDrawer() {
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hi. I’m here with you. What’s been weighing on you?" },
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim()) return
        const userMessage = { role: "user" as const, content: input }
        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)
        const controller = new AbortController()
        const timer = setTimeout(() => {
            const fallbacks = [
                "I’m here. It sounds difficult—what part feels the heaviest?",
                "You’re doing your best even if it doesn’t feel like it. Want to share more?",
                "It’s okay to take a breath. If you’d like, tell me what’s been weighing on you.",
                "I’m listening. What’s been happening today?"
            ]
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: fallbacks[Math.floor(Math.random() * fallbacks.length)] },
            ])
            try { controller.abort() } catch {}
            setIsLoading(false)
        }, 2200)

        try {
            const response = await api.post("/chat/ask", { role: "user", content: input }, { signal: controller.signal })
            clearTimeout(timer)
            const aiMessage = { role: "assistant" as const, content: response.data.content }
            setMessages((prev) => [...prev, aiMessage])
        } catch (error: unknown) {
            clearTimeout(timer)
            const err = error as { code?: string }
            if (err?.code !== "ERR_CANCELED") {
                console.error("Failed to send message", error)
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    aria-label="Open AI Chat"
                    variant="outline"
                    size="icon"
                    className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 z-50"
                >
                    <MessageSquare className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        AssignWell Companion
                    </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`flex max-w-[80%] items-start gap-2 rounded-lg px-4 py-2 ${msg.role === "user" ? "bg-amber-500 text-white" : "bg-rose-50 text-rose-900"
                                    }`}
                            >
                                {msg.role === "assistant" && <Bot className="mt-1 h-4 w-4 shrink-0" />}
                                <p className="text-sm">{msg.content}</p>
                                {msg.role === "user" && <User className="mt-1 h-4 w-4 shrink-0" />}
                            </div>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
                <div className="flex items-center gap-2 pt-4 border-t">
                    <Input
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        disabled={isLoading}
                    />
                    <Button size="icon" onClick={handleSend} disabled={isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
