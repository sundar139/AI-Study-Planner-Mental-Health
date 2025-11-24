"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { useChatSession } from "@/hooks/useChatSession"
import { cn } from "@/lib/utils"

interface Message {
    role: "user" | "assistant"
    content: string
    timestamp?: Date
}

interface AssistantPanelProps {
    compact?: boolean
}

export function AssistantPanel({ compact = false }: AssistantPanelProps) {
    const { session } = useChatSession()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    useEffect(() => {
        if (session && Array.isArray(session.messages)) {
            const history: Message[] = session.messages.map(m => ({ role: m.role, content: m.content, timestamp: new Date(m.created_at) }))
            if (history.length === 0) {
                setMessages([
                    { role: "assistant", content: "Hi. I’m here with you. What’s been weighing on you?", timestamp: new Date() }
                ])
            } else {
                setMessages(history)
            }
        }
    }, [session])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            role: "user",
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        const controller = new AbortController()
        const timer = setTimeout(() => {
            const fallbacks = [
                "That sounds really heavy. I’m here with you. What part feels most intense right now?",
                "It makes sense to feel overwhelmed. Would a short pause and a deep breath help?",
                "You’re not alone while we’re talking. Tell me more about what’s been happening.",
                "I’m listening. If it feels okay, what’s the biggest stressor at the moment?"
            ]
            const errorResponse: Message = {
                role: "assistant",
                content: fallbacks[Math.floor(Math.random() * fallbacks.length)],
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorResponse])
            try { controller.abort() } catch {}
            setIsLoading(false)
        }, 2200)

        try {
            const response = await api.post("/chat/ask", { role: "user", content: userMessage.content, context: { session_id: session?.id } }, { signal: controller.signal })
            clearTimeout(timer)
            const aiResponse: Message = {
                role: "assistant",
                content: response.data.content,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, aiResponse])
        } catch (error: unknown) {
            clearTimeout(timer)
            const err = error as { code?: string }
            if (err?.code === "ERR_CANCELED") {
                return
            }
            console.error("Failed to get AI response", error)
            const fallbacks = [
                "That sounds really heavy. I’m here with you. What part feels most intense right now?",
                "It makes sense to feel overwhelmed. Would a short pause and a deep breath help?",
                "You’re not alone while we’re talking. Tell me more about what’s been happening.",
                "I’m listening. If it feels okay, what’s the biggest stressor at the moment?"
            ]
            const errorResponse: Message = {
                role: "assistant",
                content: fallbacks[Math.floor(Math.random() * fallbacks.length)],
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorResponse])
        } finally {
            setIsLoading(false)
        }
    }

    const suggestedPrompts = [
        "I'm feeling overwhelmed",
        "It's been a rough week",
        "I feel anxious",
        "Can we try a grounding exercise?",
        "I can't focus and it's stressing me"
    ]

    return (
        <Card className={cn("flex flex-col shadow-sm hover:shadow-md transition-shadow", compact ? "h-full" : "h-[600px]")}>
            <CardHeader className="pb-2 border-b">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 text-white">
                        <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <CardTitle className="text-base font-bold">AssignWell Companion</CardTitle>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            
                        </div>
                    </div>
                    {!compact && (
                        <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0 text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                {/* Messages */}
                <ScrollArea className={cn("flex-1", compact ? "p-2" : "p-4")} ref={scrollRef}>
                    <div className={cn("space-y-2", compact && "space-y-1.5")}>
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "flex gap-2 animate-fade-in",
                                    message.role === "user" && "flex-row-reverse"
                                )}
                            >
                                {/* Avatar */}
                                <div className={cn(
                                    "rounded-full flex items-center justify-center flex-shrink-0",
                                    compact ? "w-6 h-6" : "w-8 h-8",
                                    message.role === "assistant"
                                        ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                                        : "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                                )}>
                                    {message.role === "assistant" ? (
                                        <Bot className={compact ? "h-3 w-3" : "h-4 w-4"} />
                                    ) : (
                                        <User className={compact ? "h-3 w-3" : "h-4 w-4"} />
                                    )}
                                </div>

                                {/* Message Bubble */}
                                <div className={cn(
                                    "flex flex-col gap-0.5 max-w-[80%]",
                                    message.role === "user" && "items-end"
                                )}>
                                    <div className={cn(
                                        "rounded-2xl",
                                        compact ? "px-2 py-1.5" : "px-4 py-2",
                                    message.role === "assistant"
                                        ? "bg-rose-50 text-rose-900"
                                        : "bg-amber-500 text-white"
                                    )}>
                                        <p className={cn("leading-relaxed", compact ? "text-xs" : "text-sm")}>{message.content}</p>
                                    </div>
                                    {!compact && message.timestamp && (
                                        <span className="text-xs text-muted-foreground px-2">
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-2 animate-fade-in">
                                <div className={cn(
                                    "rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center",
                                    compact ? "w-6 h-6" : "w-8 h-8"
                                )}>
                                    <Bot className={compact ? "h-3 w-3" : "h-4 w-4"} />
                                </div>
                                <div className={cn("rounded-2xl bg-muted flex items-center gap-2", compact ? "px-2 py-1.5" : "px-4 py-2")}>
                                    <Loader2 className={cn("animate-spin", compact ? "h-3 w-3" : "h-4 w-4")} />
                                    <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>Thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Inline suggestions near input */}
                {!compact && (
                        <div className="px-4 pb-2">
                            <div className="flex flex-wrap gap-2">
                                {suggestedPrompts.map((prompt, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setInput(prompt)}
                                        className="text-xs hover:bg-primary-50"
                                    >
                                        {prompt}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                {/* Input */}
                <div className={cn("border-t bg-muted/30", compact ? "p-2" : "p-4")}>
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Type your message... If you’d like, tell me more"
                            disabled={isLoading}
                            className={cn("flex-1", compact && "h-8 text-xs")}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={cn("bg-amber-500 hover:bg-amber-600", compact && "h-8 w-8 p-0")}
                            size={compact ? "icon" : "default"}
                        >
                            <Send className={compact ? "h-3 w-3" : "h-4 w-4"} />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
