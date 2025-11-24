"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { Plus, Loader2, CheckCircle2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import api from "@/lib/api"

interface Goal {
    id: number
    user_id: number
    name: string
    duration_minutes: number
    preferred_time_window?: string | null
    sessions_per_week: number
    created_at: string
    updated_at?: string | null
}

interface GoalSession {
    id: number
    goal_id: number
    start_time: string
    end_time: string
    status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "SKIPPED"
}

interface TimeSuggestion {
    start_time: string
    end_time: string
    reason?: string
}


export default function GoalsPage() {
    const router = useRouter()
    const token = useAuthStore(state => state.token)
    const [goals, setGoals] = useState<Goal[]>([])
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newGoal, setNewGoal] = useState({
        name: "",
        duration_minutes: 30,
        preferred_time_window: "",
        sessions_per_week: 3
    })
    const [sessionsPerWeekInput, setSessionsPerWeekInput] = useState<string>("3")
    const [isLoading, setIsLoading] = useState(false)
    
    
    const [suggestionErrors, setSuggestionErrors] = useState<Record<number, string>>({})
    const [newGoalErrors, setNewGoalErrors] = useState<{ sessionsPerWeek?: string }>({})
    const [schedulingGoal, setSchedulingGoal] = useState<Record<number, boolean>>({}) // For backward compatibility with manual override
    const [schedulingSlot, setSchedulingSlot] = useState<Record<string, boolean>>({}) // Key: `${goalId}-${startTime}`
    const [scheduleConfirmations, setScheduleConfirmations] = useState<Record<number, boolean>>({})
    const [manualTimePickerOpen, setManualTimePickerOpen] = useState<Record<number, boolean>>({})
    const [manualTimes, setManualTimes] = useState<Record<number, { start: string; end: string }>>({})
    const [selectedTimes, setSelectedTimes] = useState<Record<number, { start: string; end: string }>>({})
    const toLocalInput = (iso: string) => new Date(iso).toISOString().slice(0, 16)
    
    const [goalSessions, setGoalSessions] = useState<Record<number, GoalSession[]>>({})
    const [multiDaySuggestions, setMultiDaySuggestions] = useState<Record<number, Array<{ date: string; suggestions: TimeSuggestion[] }>>>({})
    const [loadingMulti, setLoadingMulti] = useState<Record<number, boolean>>({})

    interface ScheduleBlock { id: number; title: string; start_at: string; end_at?: string; type?: string; status?: string }
    const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([])
    const fetchScheduleBlocks = useCallback(async () => {
        try {
            const res = await api.get('/schedule/')
            const items = Array.isArray(res.data) ? (res.data as ScheduleBlock[]) : []
            setScheduleBlocks(items)
        } catch {}
    }, [])

    const fetchGoalSessions = useCallback(async (goalId: number) => {
        try {
            const response = await api.get(`/goals/${goalId}/sessions`)
            setGoalSessions(prev => ({ ...prev, [goalId]: response.data }))
        } catch (error: unknown) {
            const err = error as { code?: string }
            if (err?.code === "ERR_CANCELED") return
            setGoalSessions(prev => ({ ...prev, [goalId]: [] }))
        }
    }, [])

    const fetchGoals = useCallback(async () => {
        try {
            const response = await api.get("/goals/")
            setGoals(response.data)
            for (const goal of response.data as Goal[]) {
                await fetchGoalSessions(goal.id)
            }
        } catch (error: unknown) {
            const err = error as { code?: string }
            if (err?.code === "ERR_CANCELED") return
        }
    }, [fetchGoalSessions])

    

    const calculateStreak = (goalId: number): number => {
        const sessions = goalSessions[goalId] || []
        // Filter for completed sessions
        const completedSessions = sessions.filter(s => s.status === "COMPLETED")
        if (completedSessions.length === 0) return 0

        // Get unique dates when sessions were completed (normalize to date string YYYY-MM-DD)
        const completedDates = new Set<string>()
        completedSessions.forEach(session => {
            const date = new Date(session.start_time)
            date.setHours(0, 0, 0, 0)
            completedDates.add(date.toISOString().split('T')[0])
        })

        // Calculate consecutive days from today backwards
        let streak = 0
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Start from today and count backwards
        const checkDate = new Date(today)
        
        while (true) {
            const dateStr = checkDate.toISOString().split('T')[0]
            if (completedDates.has(dateStr)) {
                streak++
                checkDate.setDate(checkDate.getDate() - 1)
            } else {
                // Stop on first day without a completed session
                break
            }
        }

        return streak
    }

    const calculateWeeklyProgress = (goalId: number): number => {
        const sessions = goalSessions[goalId] || []
        
        // Get start of current week (Sunday)
        const today = new Date()
        const dayOfWeek = today.getDay()
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - dayOfWeek)
        startOfWeek.setHours(0, 0, 0, 0)

        // Count scheduled/completed sessions this week
        const thisWeekSessions = sessions.filter(session => {
            const sessionDate = new Date(session.start_time)
            return sessionDate >= startOfWeek && 
                   (session.status === "SCHEDULED" || session.status === "COMPLETED" || session.status === "IN_PROGRESS")
        })

        return thisWeekSessions.length
    }

    useEffect(() => {
        if (!token) {
            router.replace('/login')
            return
        }
        const id = setTimeout(() => {
            fetchGoals()
            fetchScheduleBlocks()
        }, 0)
        return () => {
            clearTimeout(id)
        }
    }, [token, router, fetchGoals, fetchScheduleBlocks])

    const handleCreateGoal = async () => {
        if (!newGoal.name.trim()) {
            return
        }
        const num = parseInt(sessionsPerWeekInput, 10)
        if (!sessionsPerWeekInput || Number.isNaN(num) || num > 7 || num < 1) {
            setNewGoalErrors({ sessionsPerWeek: "Please enter a number up to 7" })
            return
        }
        setIsLoading(true)
        try {
            await api.post("/goals/", {
                name: newGoal.name,
                duration_minutes: newGoal.duration_minutes,
                preferred_time_window: newGoal.preferred_time_window || null,
                sessions_per_week: Math.max(1, Math.min(7, num))
            })
            // Reset form
            setNewGoal({
                name: "",
                duration_minutes: 30,
                preferred_time_window: "",
                sessions_per_week: 3
            })
            setSessionsPerWeekInput("3")
            setNewGoalErrors({})
            setIsAddDialogOpen(false)
            // Refresh the list
            await fetchGoals()
            // New goal will have its sessions fetched in fetchGoals
        } catch (error) {
            console.error("Failed to create goal", error)
        } finally {
            setIsLoading(false)
        }
    }

    

    

    useEffect(() => {
        (async () => {
            for (const g of goals) {
                if (!(multiDaySuggestions[g.id]?.length) && !loadingMulti[g.id]) {
                    try {
                        setLoadingMulti(prev => ({ ...prev, [g.id]: true }))
                        const controller = new AbortController()
                        try {
                            const nowIso = new Date().toISOString()
                            const response = await api.post(
                                `/goals/${g.id}/suggest-dates-times`,
                                { days: Math.max(1, Math.min(7, g.sessions_per_week || 3)), fast: false, from_ts: nowIso },
                                { signal: controller.signal, timeout: 45000 }
                            )
                            const data = response.data as { groups: Array<{ date: string; suggestions: TimeSuggestion[] }> }
                            let results = data.groups || []
                            // Filter out past dates and occupied times using current schedule
                            const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0)
                            const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
                            const overlaps = (s: TimeSuggestion, b: ScheduleBlock) => {
                                const s1 = new Date(s.start_time).getTime()
                                const e1 = new Date(s.end_time).getTime()
                                const s2 = new Date(b.start_at).getTime()
                                const e2 = new Date(b.end_at || b.start_at).getTime()
                                return s1 < e2 && s2 < e1
                            }
                            results = results
                                .map(group => {
                                    const groupDate = new Date(group.date)
                                    const blocksForDate = scheduleBlocks.filter(b => isSameDay(new Date(b.start_at), groupDate))
                                    const now = new Date()
                                    const filtered = (group.suggestions || []).filter(s => {
                                        const start = new Date(s.start_time)
                                        if (isSameDay(start, now) && start.getTime() < now.getTime()) return false
                                        // avoid overlaps with existing schedule
                                        for (const b of blocksForDate) { if (overlaps(s, b)) return false }
                                        return true
                                    })
                                    return { ...group, suggestions: filtered }
                                })
                                .filter(group => {
                                    const d = new Date(group.date)
                                    return d.getTime() >= todayMidnight.getTime() && (group.suggestions || []).length > 0
                                })
                            const desired = Math.max(1, Math.min(7, g.sessions_per_week || 1))
                            if ((results.length || 0) < desired) {
                                const needed = desired - (results.length || 0)
                                // Try to fill with per-day suggestions using availability-aware endpoint
                                const fills: Array<{ date: string; suggestions: TimeSuggestion[] }> = []
                                for (let offset = 0; offset < 14 && fills.length < needed; offset++) {
                                    const dt = new Date()
                                    dt.setDate(dt.getDate() + offset)
                                    const dateStr = dt.toISOString().slice(0, 10)
                                    // Skip if we already have this date in results
                                    if (results.find(r => r.date === dateStr)) continue
                                    try {
                                        const one = await api.post(`/goals/${g.id}/suggest-times`, { date: dateStr, from_ts: new Date().toISOString() })
                                        const oneData = one.data as { case: string; suggestions?: TimeSuggestion[] }
                                        const suggestions = (oneData.case === 'A' ? (oneData.suggestions || []) : [])
                                        // filter by availability and present time if today
                                        const groupDate = new Date(dateStr)
                                        const blocksForDate = scheduleBlocks.filter(b => isSameDay(new Date(b.start_at), groupDate))
                                        const now = new Date()
                                        const filtered = suggestions.filter(s => {
                                            const start = new Date(s.start_time)
                                            if (isSameDay(start, now) && start.getTime() < now.getTime()) return false
                                            for (const b of blocksForDate) { if (overlaps(s, b)) return false }
                                            return true
                                        })
                                        const first = filtered[0] || null
                                        if (first) fills.push({ date: dateStr, suggestions: [first] })
                                    } catch (err) {
                                        const msg = String((err as { message?: string }).message || '')
                                        if (msg.toLowerCase().includes('abort')) {
                                            continue
                                        }
                                    }
                                }
                                results = [...results, ...fills].slice(0, desired)
                            }
                            setMultiDaySuggestions(prev => ({ ...prev, [g.id]: results }))
                        } catch (err) {
                            const e = err as { code?: string; message?: string }
                            const msg = String(e?.message || '')
                            if (e?.code === "ERR_CANCELED" || msg.toLowerCase().includes('abort')) {
                                continue
                            }
                            try {
                                const fastRes = await api.post(
                                    `/goals/${g.id}/suggest-dates-times`,
                                    { days: Math.max(1, Math.min(7, g.sessions_per_week || 3)), fast: true, from_ts: new Date().toISOString() },
                                    { timeout: 20000 }
                                )
                                const data = fastRes.data as { groups: Array<{ date: string; suggestions: TimeSuggestion[] }> }
                                let results = data.groups || []
                                const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0)
                                const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
                                const overlaps = (s: TimeSuggestion, b: ScheduleBlock) => {
                                    const s1 = new Date(s.start_time).getTime()
                                    const e1 = new Date(s.end_time).getTime()
                                    const s2 = new Date(b.start_at).getTime()
                                    const e2 = new Date(b.end_at || b.start_at).getTime()
                                    return s1 < e2 && s2 < e1
                                }
                                results = results
                                    .map(group => {
                                        const groupDate = new Date(group.date)
                                        const blocksForDate = scheduleBlocks.filter(b => isSameDay(new Date(b.start_at), groupDate))
                                        const now = new Date()
                                        const filtered = (group.suggestions || []).filter(s => {
                                            const start = new Date(s.start_time)
                                            if (isSameDay(start, now) && start.getTime() < now.getTime()) return false
                                            for (const b of blocksForDate) { if (overlaps(s, b)) return false }
                                            return true
                                        })
                                        return { ...group, suggestions: filtered }
                                    })
                                    .filter(group => {
                                        const d = new Date(group.date)
                                        return d.getTime() >= todayMidnight.getTime() && (group.suggestions || []).length > 0
                                    })
                                const desired = Math.max(1, Math.min(7, g.sessions_per_week || 1))
                                if ((results.length || 0) < desired) {
                                    const needed = desired - (results.length || 0)
                                    const fills: Array<{ date: string; suggestions: TimeSuggestion[] }> = []
                                    for (let offset = 0; offset < 14 && fills.length < needed; offset++) {
                                        const dt = new Date()
                                        dt.setDate(dt.getDate() + offset)
                                        const dateStr = dt.toISOString().slice(0, 10)
                                        if (results.find(r => r.date === dateStr)) continue
                                        try {
                                            const one = await api.post(`/goals/${g.id}/suggest-times`, { date: dateStr, from_ts: new Date().toISOString() })
                                            const oneData = one.data as { case: string; suggestions?: TimeSuggestion[] }
                                            const suggestions = (oneData.case === 'A' ? (oneData.suggestions || []) : [])
                                            const groupDate = new Date(dateStr)
                                            const blocksForDate = scheduleBlocks.filter(b => isSameDay(new Date(b.start_at), groupDate))
                                            const now = new Date()
                                            const filtered = suggestions.filter(s => {
                                                const start = new Date(s.start_time)
                                                if (isSameDay(start, now) && start.getTime() < now.getTime()) return false
                                                for (const b of blocksForDate) { if (overlaps(s, b)) return false }
                                                return true
                                            })
                                            const first = filtered[0] || null
                                            if (first) fills.push({ date: dateStr, suggestions: [first] })
                                        } catch {}
                                    }
                                    results = [...results, ...fills].slice(0, desired)
                                }
                                setMultiDaySuggestions(prev => ({ ...prev, [g.id]: results }))
                            } catch (fastErr) {
                                console.error("Failed to get multi-day time suggestions", fastErr)
                            }
                        }
                    } finally {
                        setLoadingMulti(prev => ({ ...prev, [g.id]: false }))
                    }
                }
            }
        })()
    }, [goals, multiDaySuggestions, loadingMulti, scheduleBlocks])

    useEffect(() => {
        for (const g of goals) {
            if (selectedTimes[g.id]) continue
            const groups = multiDaySuggestions[g.id] || []
            const firstGroup = groups[0]
            const firstSuggestion = firstGroup?.suggestions?.[0]
            if (firstSuggestion) {
                const start = toLocalInput(firstSuggestion.start_time)
                const end = toLocalInput(firstSuggestion.end_time)
                setSelectedTimes(prev => ({ ...prev, [g.id]: { start, end } }))
            }
        }
    }, [goals, multiDaySuggestions, selectedTimes])

    const handleScheduleSession = async (goalId: number, startTime: string, endTime: string, slotKey?: string) => {
        // Create a unique key for this specific slot if not provided
        const uniqueSlotKey = slotKey || `${goalId}-${startTime}`
        
        // Prevent duplicate scheduling if already in progress for this specific slot
        if (schedulingSlot[uniqueSlotKey]) {
            return
        }

        // Set loading state for this specific slot
        setSchedulingSlot(prev => ({ ...prev, [uniqueSlotKey]: true }))
        // Also set the general goal loading state for backward compatibility with manual override
        setSchedulingGoal(prev => ({ ...prev, [goalId]: true }))
        setScheduleConfirmations(prev => ({ ...prev, [goalId]: false }))

        try {
            const res = await api.post(`/goals/${goalId}/schedule-session`, {
                start_time: startTime,
                end_time: endTime,
                status: "SCHEDULED"
            })
            try {
                const block = (res.data && (res.data.schedule_block || res.data.scheduleBlock)) || null
                if (block) {
                    window.dispatchEvent(new CustomEvent('goalSessionScheduled', { detail: block }))
                }
            } catch {}
            setScheduleConfirmations(prev => ({ ...prev, [goalId]: true }))
            // Refresh sessions after scheduling
            await fetchGoalSessions(goalId)
            // Notify dashboard to refresh schedule blocks
            window.dispatchEvent(new Event('scheduleUpdated'))
            // Clear confirmation after 3 seconds
            setTimeout(() => {
                setScheduleConfirmations(prev => ({ ...prev, [goalId]: false }))
                
            }, 3000)
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } ; message?: string }
            const errorMessage = err.response?.data?.detail || err.message || "Failed to schedule session"
            setSuggestionErrors(prev => ({ ...prev, [goalId]: errorMessage }))
            console.error("Failed to schedule session", error)
        } finally {
            // Clear loading state for this specific slot and check if we should clear goal-level state
            setSchedulingSlot(prev => {
                const newState = { ...prev }
                delete newState[uniqueSlotKey]
                
                // Check if any other slots for this goal are still scheduling
                const hasOtherSlotsScheduling = Object.keys(newState).some(key => {
                    return key.startsWith(`${goalId}-`) && newState[key]
                })
                
                // Clear goal-level state if no other slots are scheduling
                // Use setTimeout to ensure this happens after state update
                if (!hasOtherSlotsScheduling) {
                    setTimeout(() => {
                        setSchedulingGoal(prevGoal => {
                            const newGoalState = { ...prevGoal }
                            delete newGoalState[goalId]
                            return newGoalState
                        })
                    }, 0)
                }
                
                return newState
            })
        }
    }

    const handleManualSchedule = (goalId: number, times?: { start: string; end: string }) => {
        const t = times || manualTimes[goalId]
        if (!t) return
        const startISO = new Date(t.start).toISOString()
        const endISO = new Date(t.end).toISOString()
        handleScheduleSession(goalId, startISO, endISO)
        setManualTimePickerOpen({ ...manualTimePickerOpen, [goalId]: false })
    }

    const handleDeleteGoal = async (goalId: number) => {
        try {
            await api.delete(`/goals/${goalId}`)
            setGoals(prev => prev.filter(g => g.id !== goalId))
            setGoalSessions(prev => { const copy = { ...prev }; delete copy[goalId]; return copy })
            setScheduleConfirmations(prev => { const copy = { ...prev }; delete copy[goalId]; return copy })
            try { window.dispatchEvent(new Event('scheduleUpdated')) } catch {}
        } catch (error) {
            console.error('Failed to delete goal', error)
            alert('Failed to delete goal')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Goals</h2>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Your Personal Goals</h1>
                        <p className="text-sm text-gray-600">
                            Track and manage your personal goals. Schedule sessions and build consistent habits.
                        </p>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Goal
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Goal</DialogTitle>
                            <DialogDescription>
                                Create a new goal to track your progress.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Goal Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Exercise regularly"
                                    value={newGoal.name}
                                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">Duration (minutes)</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    min="1"
                                    value={newGoal.duration_minutes}
                                    onChange={(e) => setNewGoal({ ...newGoal, duration_minutes: parseInt(e.target.value) || 30 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timeWindow">Preferred Time Window (optional)</Label>
                                <Select
                                    value={newGoal.preferred_time_window || undefined}
                                    onValueChange={(value) => setNewGoal({ ...newGoal, preferred_time_window: value === "none" ? "" : value })}
                                >
                                    <SelectTrigger id="timeWindow">
                                        <SelectValue placeholder="Select a time window" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="Morning">Morning</SelectItem>
                                        <SelectItem value="Afternoon">Afternoon</SelectItem>
                                        <SelectItem value="Evening">Evening</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sessionsPerWeek">Sessions per Week</Label>
                                <Input
                                    id="sessionsPerWeek"
                                    type="number"
                                    min="1"
                                    max="7"
                                    value={sessionsPerWeekInput}
                                    onChange={(e) => {
                                        const raw = e.target.value
                                        setSessionsPerWeekInput(raw)
                                        if (raw === "") {
                                            setNewGoalErrors({ sessionsPerWeek: undefined })
                                            return
                                        }
                                        const num = parseInt(raw, 10)
                                        if (Number.isNaN(num)) {
                                            setNewGoalErrors({ sessionsPerWeek: "Please enter a number up to 7" })
                                            return
                                        }
                                        if (num > 7) {
                                            setNewGoalErrors({ sessionsPerWeek: "Please enter a number up to 7" })
                                            return
                                        }
                                        setNewGoal({ ...newGoal, sessions_per_week: Math.max(1, num) })
                                        setNewGoalErrors({ sessionsPerWeek: undefined })
                                    }}
                                />
                                {newGoalErrors.sessionsPerWeek && (
                                    <p className="text-xs text-red-600">{newGoalErrors.sessionsPerWeek}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateGoal} disabled={isLoading || !newGoal.name.trim() || !!newGoalErrors.sessionsPerWeek || sessionsPerWeekInput === ""}>
                                {isLoading ? "Creating..." : "Create Goal"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {goals.length === 0 ? (
                    <Card className="col-span-full">
                        <CardContent className="pt-6">
                            <p className="text-center text-muted-foreground">
                                No goals yet. Click &quot;Add Goal&quot; to get started.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    goals.map((goal) => (
                        <Card key={goal.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{goal.name}</CardTitle>
                                        <CardDescription>
                                            {goal.duration_minutes} minutes per session
                                        </CardDescription>
                                    </div>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteGoal(goal.id)}>
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Streak and Weekly Progress */}
                                <div className="flex items-center gap-6 pb-4 border-b">
                                    <div>
                                        <span className="font-semibold text-xl">{calculateStreak(goal.id)}</span>
                                        <span className="text-sm text-muted-foreground ml-1">day streak</span>
                                    </div>
                                    <div className="h-8 w-px bg-border" />
                                    <div>
                                        <span className="font-semibold text-xl">{calculateWeeklyProgress(goal.id)}</span>
                                        <span className="text-sm text-muted-foreground"> / </span>
                                        <span className="text-sm text-muted-foreground">{goal.sessions_per_week} this week</span>
                                    </div>
                                </div>

                                {/* Goal Details */}
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="font-medium">Sessions per week:</span> {goal.sessions_per_week}
                                    </div>
                                    {goal.preferred_time_window && (
                                        <div>
                                            <span className="font-medium">Preferred time:</span> {goal.preferred_time_window}
                                        </div>
                                    )}
                                    
                                </div>
                                
                                <div className="space-y-4 pt-4 border-t">
                                    <div>
                                        <h3 className="text-sm font-semibold mb-1">Suggested Timings</h3>
                                    </div>

                                    {scheduleConfirmations[goal.id] && (
                                        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Added to calendar
                                        </div>
                                    )}

                                    {suggestionErrors[goal.id] && (
                                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                            {suggestionErrors[goal.id]}
                                        </div>
                                    )}

                                    {loadingMulti[goal.id] && (
                                        <div className="text-xs text-muted-foreground">Fetching suggestions…</div>
                                    )}

                                    {(multiDaySuggestions[goal.id]?.length ?? 0) > 0 && (
                                        <div className="space-y-2">
                                            {(multiDaySuggestions[goal.id] || []).slice(0, Math.max(1, Math.min(7, goal.sessions_per_week || 1))).map((group, gIdx) => {
                                                const pref = (goal.preferred_time_window || "").toLowerCase()
                                                const matches = (iso: string) => {
                                                    const h = new Date(iso).getHours()
                                                    if (pref.includes("morning")) return h >= 9 && h < 12
                                                    if (pref.includes("afternoon")) return h >= 13 && h < 17
                                                    if (pref.includes("evening")) return h >= 18 && h < 21
                                                    return true
                                                }
                                                const filtered = (group.suggestions || []).filter(s => matches(s.start_time))
                                                const time = filtered[0] || (group.suggestions || [])[0]
                                                if (!time) return null
                                                const openEdit = () => {
                                                    const next = { start: toLocalInput(time.start_time), end: toLocalInput(time.end_time) }
                                                    setManualTimes({ ...manualTimes, [goal.id]: next })
                                                    setSelectedTimes({ ...selectedTimes, [goal.id]: next })
                                                    setManualTimePickerOpen({ ...manualTimePickerOpen, [goal.id]: true })
                                                }
                                                return (
                                                    <div key={`group-${goal.id}-${gIdx}`} className="space-y-1">
                                                        <p className="text-xs font-medium">{new Date(group.date).toLocaleDateString()}</p>
                                                        <button
                                                            type="button"
                                                            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
                                                            onClick={openEdit}
                                                        >
                                                            <span className="font-medium">
                                                                {new Date(time.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {" - "}
                                                            <span className="font-medium">
                                                                {new Date(time.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                            <div className="pt-2">
                                                <Button 
                                                    onClick={() => {
                                                        const times = manualTimes[goal.id] || selectedTimes[goal.id]
                                                        if (!times?.start || !times?.end) {
                                                            setSuggestionErrors(prev => ({ ...prev, [goal.id]: "Please select a time to confirm" }))
                                                            return
                                                        }
                                                        if (manualTimePickerOpen[goal.id]) {
                                                            setManualTimePickerOpen({ ...manualTimePickerOpen, [goal.id]: false })
                                                        }
                                                        handleManualSchedule(goal.id, times)
                                                    }}
                                                    disabled={(!manualTimes[goal.id]?.start && !selectedTimes[goal.id]?.start) || (!manualTimes[goal.id]?.end && !selectedTimes[goal.id]?.end) || schedulingGoal[goal.id]}
                                                >
                                                    {schedulingGoal[goal.id] ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Confirming...
                                                        </>
                                                    ) : (
                                                        "Confirm"
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {(multiDaySuggestions[goal.id]?.length ?? 0) === 0 && !loadingMulti[goal.id] && (
                                        <div className="text-xs text-muted-foreground">No suggestions available</div>
                                    )}
                                </div>

                                {/* Manual Time Picker Dialog */}
                                    <Dialog 
                                        open={manualTimePickerOpen[goal.id] || false} 
                                        onOpenChange={(open) => setManualTimePickerOpen({ ...manualTimePickerOpen, [goal.id]: open })}
                                    >
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Edit Suggested Time</DialogTitle>
                                                <DialogDescription>
                                                    Adjust the start or end and press Save.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor={`manual-start-${goal.id}`}>Start Time</Label>
                                                    <Input
                                                        id={`manual-start-${goal.id}`}
                                                        type="datetime-local"
                                                        value={manualTimes[goal.id]?.start || ""}
                                                        onChange={(e) => {
                                                            const start = e.target.value
                                                            const goalObj = goals.find(g => g.id === goal.id)
                                                            const duration = goalObj?.duration_minutes || 30
                                                            const end = new Date(new Date(start).getTime() + duration * 60000).toISOString().slice(0, 16)
                                                            setManualTimes({ ...manualTimes, [goal.id]: { start, end } })
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor={`manual-end-${goal.id}`}>End Time</Label>
                                                    <Input
                                                        id={`manual-end-${goal.id}`}
                                                        type="datetime-local"
                                                        value={manualTimes[goal.id]?.end || ""}
                                                        onChange={(e) => {
                                                            const start = manualTimes[goal.id]?.start || ""
                                                            setManualTimes({ ...manualTimes, [goal.id]: { start, end: e.target.value } })
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => setManualTimePickerOpen({ ...manualTimePickerOpen, [goal.id]: false })}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button 
                                                    onClick={() => handleManualSchedule(goal.id, manualTimes[goal.id])}
                                                    disabled={!manualTimes[goal.id]?.start || !manualTimes[goal.id]?.end || schedulingGoal[goal.id]}
                                                >
                                                    {schedulingGoal[goal.id] ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        "Save"
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    
                            </CardContent>
                        </Card>
                    ))
                    )}
                </div>
            </div>
        </div>
    )
}
