"use client"

import { useState, useEffect, useCallback } from "react"
import { Wind, Timer, Droplet, Footprints, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import api from "@/lib/api"

const breaks = [
    { id: 1, name: "Breathe", icon: Wind, color: "text-blue-500", defaultMinutes: 1, allowCustom: true },
    { id: 2, name: "Focus", icon: Timer, color: "text-green-500", defaultMinutes: 20, allowCustom: true },
    { id: 3, name: "Hydrate", icon: Droplet, color: "text-yellow-500", defaultMinutes: 0, allowCustom: false },
    { id: 4, name: "Walk", icon: Footprints, color: "text-purple-500", defaultMinutes: 0, allowCustom: true },
]

export function QuickBreaks() {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const [selectedBreak, setSelectedBreak] = useState<typeof breaks[0] | null>(null)
  const [customMinutes, setCustomMinutes] = useState("")
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [activeBreakId, setActiveBreakId] = useState<number | null>(null)
  const { toast } = useToast()

  const handleBreakClick = (breakItem: typeof breaks[0]) => {
    if (breakItem.defaultMinutes === 0 || breakItem.allowCustom) {
      setSelectedBreak(breakItem)
      setCustomMinutes(breakItem.defaultMinutes > 0 ? breakItem.defaultMinutes.toString() : "")
      setDialogOpen(true)
    } else {
      startBreak(breakItem, breakItem.defaultMinutes)
    }
  }

  const startBreak = async (breakItem: typeof breaks[0], minutes: number) => {
    const now = new Date()
    const tz = now.getTimezoneOffset()
    const sign = tz <= 0 ? "+" : "-"
    const abs = Math.abs(tz)
    const offH = String(Math.floor(abs / 60)).padStart(2, "0")
    const offM = String(abs % 60).padStart(2, "0")
    const pad = (n: number) => String(n).padStart(2, "0")
    const localISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${sign}${offH}:${offM}`
    if (minutes > 0) {
      setTimeRemaining(minutes * 60)
      setTimerOpen(true)

      try {
        const res = await api.post("/assignments/", {
          title: `${breakItem.name} Break`,
          due_at: localISO,
          importance_level: "low",
          status: "IN_PROGRESS",
          estimated_minutes: minutes
        })
        setActiveBreakId(res?.data?.id ?? null)
        window.dispatchEvent(new CustomEvent('breakStarted', { detail: { id: res?.data?.id, title: `${breakItem.name} Break` } }))
      } catch (error) {
        console.error("Failed to add break to calendar", error)
        const resp = (error as { response?: { data?: unknown; status?: number } })?.response
        if (resp) {
          console.error("Error response:", resp.data)
          console.error("Error status:", resp.status)
        }
      }
    } else {
      try {
        const res = await api.post("/assignments/", {
          title: `${breakItem.name} Break`,
          due_at: localISO,
          importance_level: "low",
          status: "COMPLETED",
          estimated_minutes: 0
        })
        const newId = (res?.data as { id?: number })?.id
        if (newId) {
          window.dispatchEvent(new CustomEvent('assignmentUpdated', { detail: { id: newId, status: 'COMPLETED' } }))
        }
      } catch (error) {
        console.error("Failed to add instant break to calendar", error)
      }
    }

    toast({
      title: `${breakItem.name} Started`,
      description: minutes > 0 ? `${minutes} minute break` : `Time to ${breakItem.name.toLowerCase()}!`,
    })
    setDialogOpen(false)
  }

  const handleTimerComplete = useCallback(async () => {
    toast({
      title: "Break Complete!",
      description: "Great job taking care of yourself!",
    })
    setTimerOpen(false)
    if (activeBreakId) {
      try {
        await api.put(`/assignments/${activeBreakId}`, { status: "COMPLETED" })
        window.dispatchEvent(new CustomEvent('assignmentUpdated', { detail: { id: activeBreakId, status: 'COMPLETED' } }))
      } catch (error) {
        console.error("Failed to mark break as completed", error)
      } finally {
        setActiveBreakId(null)
      }
    }
    window.dispatchEvent(new CustomEvent('breakCompleted', {
      detail: {
        type: selectedBreak?.name,
        timestamp: new Date().toISOString()
      }
    }))
  }, [toast, selectedBreak, activeBreakId])

  const handleStartCustom = () => {
    if (selectedBreak) {
      const parsed = parseInt(customMinutes)
      const minutes = Number.isFinite(parsed) ? parsed : selectedBreak.defaultMinutes
      const clamped = Math.min(Math.max(minutes, 1), 60)
      if (!Number.isFinite(clamped) || clamped <= 0) {
        return
      }
      startBreak(selectedBreak, clamped)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (timerOpen && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [timerOpen, timeRemaining, handleTimerComplete])

    return (
        <>
            <div className="bg-white rounded-2xl p-4 shadow-sm h-full flex flex-col">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Break</h2>

                <div className="grid grid-cols-2 gap-3 flex-1">
                    {breaks.map((breakItem) => {
                        const Icon = breakItem.icon
                        const isHovered = hoveredId === breakItem.id

                        return (
                            <div
                                key={breakItem.id}
                                className="relative"
                                onMouseEnter={() => setHoveredId(breakItem.id)}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                <button
                                    onClick={() => handleBreakClick(breakItem)}
                                    className={cn(
                                        "w-full h-full rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300",
                                        "bg-gray-50 hover:bg-gray-100 hover:shadow-md p-4"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                                        isHovered ? "bg-white shadow-lg scale-110" : "bg-white"
                                    )}>
                                        <Icon className={cn("h-6 w-6", breakItem.color)} />
                                    </div>

                                    <span className="text-sm font-medium text-gray-700">{breakItem.name}</span>
                                    {breakItem.defaultMinutes > 0 && (
                                        <span className="text-xs text-gray-500">{breakItem.defaultMinutes} min</span>
                                    )}

                                    <div className={cn(
                                        "absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-2xl transition-all duration-300",
                                        isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
                                    )}>
                                        <div className="flex flex-col items-center gap-2 text-white">
                                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                                <Play className="h-5 w-5 fill-white" />
                                            </div>
                                            <span className="text-sm font-medium">Start</span>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Set Timer Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set {selectedBreak?.name} Timer</DialogTitle>
                        <DialogDescription>
                            {selectedBreak?.defaultMinutes === 0
                                ? "How many minutes would you like?"
                                : `Default is ${selectedBreak?.defaultMinutes} minutes. Customize if needed.`
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Input
                            type="number"
                            placeholder="Minutes"
                            value={customMinutes}
                            onChange={(e) => setCustomMinutes(e.target.value)}
                            min="1"
                            max="60"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleStartCustom}>
                            Start Break
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Timer Popup */}
            <Dialog open={timerOpen} onOpenChange={setTimerOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedBreak?.name} Break</DialogTitle>
                        <DialogDescription>
                            Take your time and relax
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="text-6xl font-bold text-blue-600 mb-4">
                            {formatTime(timeRemaining)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                                style={{
                                    width: (() => {
                                        const parsed = parseInt(customMinutes, 10)
                                        const baseMin = Number.isFinite(parsed) ? parsed : (selectedBreak?.defaultMinutes || 1)
                                        const denom = Math.max(baseMin, 1) * 60
                                        const pct = denom > 0 ? (timeRemaining / denom) * 100 : 0
                                        const clamped = Math.max(0, Math.min(100, pct))
                                        return `${clamped}%`
                                    })()
                                }}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTimerOpen(false)}>
                            End Early
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
