"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Wind, Timer, Droplet, Footprints } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import type { ComponentType } from "react"

type TileId = "study" | "walk" | "meditate" | "relax"
type IconType = ComponentType<{ className?: string }>

const activityTiles: { id: TileId; label: string; color: string; icon: IconType; durations: number[] }[] = [
  { id: "study", label: "Focus Study", color: "bg-blue-600", icon: Timer, durations: [30, 60, 90, 120, 180] },
  { id: "walk", label: "Go for a Walk", color: "bg-purple-600", icon: Footprints, durations: [30, 60, 90, 120] },
  { id: "meditate", label: "Meditate", color: "bg-green-600", icon: Wind, durations: [30, 60] },
  { id: "relax", label: "Relax", color: "bg-rose-600", icon: Droplet, durations: [30, 60, 90, 120, 180] },
]

export function ActivitySection() {
  const { toast } = useToast()
  const [activeTile, setActiveTile] = useState<TileId | null>(null)
  const [selectorTile, setSelectorTile] = useState<TileId | null>(null)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [totalMinutes, setTotalMinutes] = useState<number>(0)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0)
  const [phase, setPhase] = useState<"study" | "break" | null>(null)
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0)
  const [logs, setLogs] = useState<{ action: string; at: string; details?: unknown }[]>([])
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const notify = (title: string, body?: string) => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, body ? { body } : undefined)
      }
    } catch {}
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }

  const appendLog = useCallback(async (action: string, details?: unknown, flush: boolean = false) => {
    const entry = { action, at: new Date().toISOString(), details }
    const next = [...logs, entry]
    setLogs(next)
    if (sessionId && flush) {
      try {
        await api.put(`/activity/${sessionId}`, { log: JSON.stringify(next) })
      } catch {}
    }
  }, [logs, sessionId])

  interface ActivityPayload {
    activity_type: string
    selected_duration_minutes: number
    started_at: string
    status: string
    study_minutes?: number
    break_minutes?: number
    cycles_completed?: number
  }
  interface ActivityResponse { id: number }
  const startSession = async (tile: TileId, minutes: number) => {
    if (activeTile) return
    setActiveTile(tile)
    setSelectorTile(null)
    setTotalMinutes(minutes)
    setRemainingSeconds(minutes * 60)
    const startPayload: ActivityPayload = {
      activity_type: tile === "study" ? "study" : tile,
      selected_duration_minutes: minutes,
      started_at: new Date().toISOString(),
      status: "in_progress",
    }
    if (tile === "study") {
      setPhase("study")
      setCyclesCompleted(0)
      startPayload.study_minutes = 25
      startPayload.break_minutes = 5
      startPayload.cycles_completed = 0
    } else {
      setPhase(null)
    }
    try {
      const res = await api.post<ActivityResponse>("/activity/", startPayload)
      setSessionId((res?.data?.id as number) ?? null)
    } catch {}
    await appendLog("started", { tile, minutes }, true)
  }

  const cancelSession = useCallback(async () => {
    if (!activeTile) return
    const elapsed = totalMinutes * 60 - remainingSeconds
    try {
      if (sessionId) {
        await api.put(`/activity/${sessionId}`, {
          status: "canceled",
          ended_at: new Date().toISOString(),
          actual_runtime_seconds: elapsed,
          cycles_completed: cyclesCompleted,
          log: JSON.stringify([...logs, { action: "canceled", at: new Date().toISOString() }]),
        })
      }
    } catch {}
    setActiveTile(null)
    setSelectorTile(null)
    setSessionId(null)
    setTotalMinutes(0)
    setRemainingSeconds(0)
    setPhase(null)
    setCyclesCompleted(0)
    setLogs([])
  }, [activeTile, totalMinutes, remainingSeconds, sessionId, cyclesCompleted, logs])

  const completeSession = useCallback(async () => {
    if (!activeTile) return
    const tile = activeTile
    const elapsed = totalMinutes * 60
    try {
      if (sessionId) {
        await api.put(`/activity/${sessionId}`, {
          status: "completed",
          ended_at: new Date().toISOString(),
          actual_runtime_seconds: elapsed,
          cycles_completed: cyclesCompleted,
          log: JSON.stringify([...logs, { action: "completed", at: new Date().toISOString() }]),
        })
      }
    } catch {}
    if (tile === "study") {
      toast({ title: "Focus Study complete" })
      notify("Focus Study complete")
    } else if (tile === "walk") {
      toast({ title: "Walk activity finished" })
      notify("Walk activity finished")
    } else if (tile === "meditate") {
      toast({ title: "Meditation session complete" })
      notify("Meditation session complete")
    } else {
      toast({ title: "Relaxation session complete" })
      notify("Relaxation session complete")
    }
    setActiveTile(null)
    setSelectorTile(null)
    setSessionId(null)
    setTotalMinutes(0)
    setRemainingSeconds(0)
    setPhase(null)
    setCyclesCompleted(0)
    setLogs([])
  }, [activeTile, totalMinutes, sessionId, cyclesCompleted, logs, toast])

  useEffect(() => {
    if (!activeTile) return
    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        const nextTotal = Math.max(prev - 1, 0)
        if (activeTile === "study") {
          const totalElapsed = totalMinutes * 60 - nextTotal
          const cycleLen = 30 * 60
          const pos = totalElapsed % cycleLen
          const newPhase: "study" | "break" = pos < (25 * 60) ? "study" : "break"
          if (newPhase !== phase) {
            if (newPhase === "break") {
              toast({ title: "Take a 5-min break." })
              notify("Take a 5-min break.")
              appendLog("phase_study_end", undefined, true)
            } else {
              toast({ title: "Resume studying." })
              notify("Resume studying.")
              appendLog("phase_break_end", undefined, true)
              setCyclesCompleted(c => c + 1)
            }
            setPhase(newPhase)
          }
        }
        if (nextTotal <= 0) {
          clearInterval(interval)
          completeSession()
          return 0
        }
        return nextTotal
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTile, phase, completeSession, appendLog, toast, totalMinutes])

  

  const renderTile = (tile: typeof activityTiles[number]) => {
    const Icon = tile.icon
    const isActive = activeTile === tile.id
    const color = tile.color
    const progressPct = totalMinutes > 0 ? Math.min(100, Math.max(0, ((totalMinutes * 60 - remainingSeconds) / (totalMinutes * 60)) * 100)) : 0
    return (
      <div className="relative">
        <div className={cn("relative rounded-2xl p-3 h-16", isActive ? "bg-white" : "bg-gray-50")}
             onClick={() => { if (!activeTile) setSelectorTile(selectorTile === tile.id ? null : tile.id) }}>
          {isActive && (
            <div
              className={cn("absolute left-0 top-0 h-full z-20 pointer-events-none", color)}
              style={{ width: `${progressPct}%`, opacity: 0.2 }}
            />
          )}
          <div className="relative z-10">
          {!isActive && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <Icon className={cn("h-5 w-5", color.replace("bg-", "text-") )} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800">{tile.label}</div>
              </div>
            </div>
          )}
          {isActive && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-gray-900" />
                </div>
                <div>
                  <div className="text-gray-900 text-sm font-semibold">{tile.label}</div>
                  <div className="text-gray-900 text-lg font-bold">{fmt(remainingSeconds)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="destructive" onClick={cancelSession}>Cancel</Button>
              </div>
            </div>
          )}
          </div>
        </div>
        {selectorTile === tile.id && !isActive && (
          <div
            ref={overlayRef}
            className="absolute -top-28 left-0 right-0 z-50 w-full rounded-xl bg-gray-900 text-white p-4 shadow-lg border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-sm font-semibold">{tile.label}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectorTile(null)} className="text-white">Close</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {tile.durations.map((m) => (
                <Button key={`float-${tile.id}-${m}`} size="sm" variant="secondary" onClick={() => startSession(tile.id, m)} className="bg-white/10 text-white hover:bg-white/20">
                  {m} min
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!selectorTile || activeTile) return
      const el = overlayRef.current
      if (el && !el.contains(e.target as Node)) {
        setSelectorTile(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [selectorTile, activeTile])

  return (
    <div className="relative h-full">
      <div className="bg-white rounded-2xl p-4 shadow-sm h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-900 mb-3">Activity</h2>
      

      <div className="flex flex-col gap-3">
        {activityTiles.map(t => (
          <div key={t.id}>{renderTile(t)}</div>
        ))}
      </div>
      </div>
    </div>
  )
}