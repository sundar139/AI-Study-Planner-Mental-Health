"use client"

import { useEffect, useMemo, useState } from "react"

interface ScheduleBlock {
    id: number
    title: string
    start_at: string
    end_at: string
    status?: string
}

export function InsightsCard({ schedule = [] }: { schedule?: ScheduleBlock[] }) {
    const [loginAt] = useState<number>(() => {
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("loginAt") : null
        return stored ? parseInt(stored) : Date.now()
    })
    const [elapsedMs, setElapsedMs] = useState<number>(0)
    const [snapshot, setSnapshot] = useState<{ total: number; completed: number } | null>(null)

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedMs(Date.now() - loginAt)
        }, 1000)
        return () => clearInterval(interval)
    }, [loginAt])

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { totalIds?: number[]; completedIds?: number[] } | undefined
            if (detail && Array.isArray(detail.totalIds) && Array.isArray(detail.completedIds)) {
                setSnapshot({ total: detail.totalIds.length, completed: detail.completedIds.length })
            }
        }
        window.addEventListener("upcomingTasksSnapshot", handler as EventListener)
        return () => window.removeEventListener("upcomingTasksSnapshot", handler as EventListener)
    }, [])

    const isSameDay = (d: Date, e: Date) => d.toDateString() === e.toDateString()

    const [scheduleOverrides, setScheduleOverrides] = useState<Record<number, string>>({})

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { id?: number; status?: string } | undefined
            if (detail?.id) {
                setScheduleOverrides(prev => ({ ...prev, [detail.id!]: detail.status || "COMPLETED" }))
            }
        }
        window.addEventListener("taskCompleted", handler as EventListener)
        return () => window.removeEventListener("taskCompleted", handler as EventListener)
    }, [])

    const { completionPct } = useMemo(() => {
        try {
            const safeSchedule = Array.isArray(schedule) ? schedule : []
            if (snapshot) {
                if (snapshot.total === 0) return { completionPct: 100 }
                const pct = Math.round((snapshot.completed / snapshot.total) * 100)
                return { completionPct: pct }
            }
            const now = new Date()
            const todaysSchedule = safeSchedule.filter(b => {
                const dt = new Date(b.start_at)
                return isSameDay(dt, now)
            })
            const total = todaysSchedule.length
            const completedSchedule = todaysSchedule.filter(b => {
                const ov = scheduleOverrides[b.id]
                const s = (ov ?? b.status ?? "").toLowerCase()
                return s === "completed"
            }).length
            const pct = total === 0 ? 0 : Math.round((completedSchedule / total) * 100)
            return { completionPct: pct }
        } catch {
            return { completionPct: 0 }
        }
    }, [schedule, scheduleOverrides, snapshot])

    const focusHours = Math.floor(elapsedMs / 3600000)
    const focusMinutes = Math.floor((elapsedMs % 3600000) / 60000)
    const focusPct = Math.min(100, Math.round((elapsedMs / (8 * 3600000)) * 100))

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm h-full flex flex-col overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Insights</h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-600 mb-1">Task Completion</p>
                    <p className="text-2xl font-bold text-rose-600">{completionPct}%</p>
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: `${completionPct}%` }}></div>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-600 mb-1">Focus Time</p>
                    <p className="text-2xl font-bold text-orange-600">{focusHours}<span className="text-sm"> hrs</span>{focusMinutes > 0 ? ` ${focusMinutes}m` : ""}</p>
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: `${focusPct}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-600 mb-1">Mood Correlation</p>
                <div className="flex items-center gap-2">
                    <span className="text-rose-600">📈</span>
                    <p className="text-xs text-gray-700">Productivity is higher on sunny days.</p>
                </div>
            </div>
        </div>
    )
}
