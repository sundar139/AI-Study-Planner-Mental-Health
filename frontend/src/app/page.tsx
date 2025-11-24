"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { ModernCalendar } from "@/components/dashboard/modern-calendar"
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks"
import { ActivitySection } from "@/components/dashboard/activity-section"
import { ScheduleView } from "@/components/dashboard/schedule-view"
import { InsightsCard } from "@/components/dashboard/insights-card"
import { CheckInCard } from "@/components/dashboard/check-in-card"
import { ChatbotButton } from "@/components/dashboard/chatbot-button"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Assignment {
  id: number
  title: string
  due_at: string
  importance_level: string
  status?: string
  estimated_minutes?: number
  course_id?: number
  subtasks?: Array<{ id: number }>
}

interface ScheduleBlock {
  id: number
  title: string
  start_at: string
  end_at: string
  type: string
  status: string
  source: string
}

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

export default function DashboardPage() {
  const router = useRouter()
  const token = useAuthStore(state => state.token)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([])
  const [courses, setCourses] = useState<Array<{ id: number; name: string; code?: string }>>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // Today by default
  const [userName, setUserName] = useState("Student")
  const [greeting, setGreeting] = useState("Good Morning")
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskStart, setNewTaskStart] = useState("")
  const [newTaskDuration, setNewTaskDuration] = useState<number>(60)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalSessionsByGoal, setGoalSessionsByGoal] = useState<Record<number, GoalSession[]>>({})

  const updateGreeting = useCallback(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good Morning")
    else if (hour < 18) setGreeting("Good Afternoon")
    else setGreeting("Good Evening")
  }, [])

  const fetchAssignments = useCallback(async () => {
    try {
      const response = await api.get("/assignments/")
      setAssignments(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      const status = (error as unknown as { response?: { status?: number } })?.response?.status
      const code = (error as unknown as { code?: string }).code
      const msg = String((error as unknown as { message?: string }).message || '').toLowerCase()
      if (status === 401 || code === 'ERR_CANCELED' || msg.includes('aborted')) return
      console.error("Failed to fetch assignments", error)
    }
  }, [])

  const fetchScheduleBlocks = useCallback(async () => {
    try {
      const response = await api.get("/schedule/")
      const items = Array.isArray(response.data) ? (response.data as ScheduleBlock[]) : []
      setScheduleBlocks(items)
    } catch (error) {
      const status = (error as unknown as { response?: { status?: number } })?.response?.status
      const code = (error as unknown as { code?: string }).code
      const msg = String((error as unknown as { message?: string }).message || '').toLowerCase()
      if (status === 401 || code === 'ERR_CANCELED' || msg.includes('aborted')) return
      console.error("Failed to fetch schedule", error)
    }
  }, [])

  const fetchCourses = useCallback(async () => {
    try {
      const response = await api.get("/courses/")
      setCourses(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      const status = (error as unknown as { response?: { status?: number } })?.response?.status
      const code = (error as unknown as { code?: string }).code
      const msg = String((error as unknown as { message?: string }).message || '').toLowerCase()
      if (status === 401 || code === 'ERR_CANCELED' || msg.includes('aborted')) return
      console.error("Failed to fetch courses", error)
    }
  }, [])

  const fetchGoals = useCallback(async () => {
    try {
      const response = await api.get("/goals/")
      const list = Array.isArray(response.data) ? (response.data as Goal[]) : []
      setGoals(list)
    } catch (error) {
      const status = (error as unknown as { response?: { status?: number } })?.response?.status
      const code = (error as unknown as { code?: string }).code
      const msg = String((error as unknown as { message?: string }).message || '').toLowerCase()
      if (status === 401 || code === 'ERR_CANCELED' || msg.includes('aborted')) return
      console.error("Failed to fetch goals", error)
    }
  }, [])

  const fetchGoalSessions = useCallback(async (goalId: number) => {
    try {
      const response = await api.get(`/goals/${goalId}/sessions`)
      setGoalSessionsByGoal(prev => ({ ...prev, [goalId]: Array.isArray(response.data) ? response.data as GoalSession[] : [] }))
    } catch (error) {
      const status = (error as unknown as { response?: { status?: number } })?.response?.status
      const code = (error as unknown as { code?: string }).code
      const msg = String((error as unknown as { message?: string }).message || '').toLowerCase()
      if (status === 401 || code === 'ERR_CANCELED' || msg.includes('aborted')) return
      setGoalSessionsByGoal(prev => ({ ...prev, [goalId]: [] }))
    }
  }, [])

  const fetchUserName = useCallback(async () => {
    try {
      const response = await api.get("/users/me")
      if (response.data?.full_name) {
        const firstName = response.data.full_name.split(" ")[0]
        setUserName(firstName)
      } else {
        setUserName("Student")
      }
    } catch (error) {
      const status = (error as unknown as { response?: { status?: number } })?.response?.status
      const code = (error as unknown as { code?: string }).code
      const msg = String((error as unknown as { message?: string }).message || '').toLowerCase()
      if (status === 401 || code === 'ERR_CANCELED' || msg.includes('aborted')) return
      setUserName("Student")
    }
  }, [])

  useEffect(() => {
    let asked = false
    const request = async () => {
      if (typeof window === 'undefined') return
      if (!('Notification' in window)) return
      if (Notification.permission === 'default' && !asked) {
        asked = true
        try { await Notification.requestPermission() } catch {}
      }
    }
    request()
  }, [])

  useEffect(() => {
    const keyName = 'assignwell.notified'
    const readNotified = (): Record<string, boolean> => {
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(keyName) : null
        return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
      } catch {
        return {}
      }
    }
    const writeNotified = (obj: Record<string, boolean>) => {
      try { if (typeof window !== 'undefined') window.localStorage.setItem(keyName, JSON.stringify(obj)) } catch {}
    }
    const canNotify = () => typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
    const getList = (): Array<{ id: string; title: string; body: string; ts: number; read: boolean }> => {
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('assignwell.notifications') : null
        return raw ? (JSON.parse(raw) as Array<{ id: string; title: string; body: string; ts: number; read: boolean }>) : []
      } catch {
        return []
      }
    }
    const setList = (list: Array<{ id: string; title: string; body: string; ts: number; read: boolean }>) => {
      try { if (typeof window !== 'undefined') window.localStorage.setItem('assignwell.notifications', JSON.stringify(list)) } catch {}
    }
    const fire = (title: string, body: string, idKey: string) => {
      if (canNotify()) new Notification(title, { body })
      const list = getList()
      if (!list.find(n => n.id === idKey)) {
        const item = { id: idKey, title, body, ts: Date.now(), read: false }
        const next = [item, ...list].slice(0, 50)
        setList(next)
        try { window.dispatchEvent(new CustomEvent('assignwell.notification', { detail: item })) } catch {}
      }
    }
    const check = () => {
      const notified = readNotified()
      const now = new Date().getTime()
      const limit = 30 * 60 * 1000
      for (const a of assignments) {
        const dueIso = a.due_at
        if (!dueIso) continue
        const due = new Date(dueIso).getTime()
        const diff = due - now
        if (diff <= 0) continue
        const key = `asg_${a.id}_${dueIso}`
        if (!notified[key] && diff <= limit) {
          fire('Assignment due soon', `${a.title} is due in 30 minutes`, key)
          notified[key] = true
        }
      }
      for (const b of scheduleBlocks) {
        const startIso = b.start_at
        if (!startIso) continue
        const start = new Date(startIso).getTime()
        const diff = start - now
        if (diff <= 0) continue
        const key = `blk_${b.id}_${startIso}`
        if (!notified[key] && diff <= limit) {
          fire('Task starting soon', `${b.title} starts in 30 minutes`, key)
          notified[key] = true
        }
      }
      writeNotified(notified)
    }
    const id = setInterval(check, 60000)
    check()
    return () => clearInterval(id)
  }, [assignments, scheduleBlocks])

  useEffect(() => {
    const stateToken = useAuthStore.getState().token
    let persistedToken: string | null = null
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('auth-storage') : null
      if (raw) {
        const parsed = (() => { try { return JSON.parse(raw) } catch { return null } })()
        persistedToken = parsed?.state?.token ?? null
      }
    } catch {}
    let cookieToken: string | null = null
    try {
      if (typeof document !== 'undefined') {
        const m = document.cookie.split('; ').find((c) => c.startsWith('assignwell_token='))
        cookieToken = m ? decodeURIComponent(m.split('=')[1]) : null
      }
    } catch {}
    const currentToken = stateToken || persistedToken || cookieToken
    if (!currentToken) {
      router.replace('/login')
      return
    }

    const id = setTimeout(() => {
      fetchAssignments()
      fetchScheduleBlocks()
      fetchUserName()
      updateGreeting()
      fetchCourses()
      fetchGoals()
    }, 0)

    const handleBreakComplete = () => { fetchAssignments(); fetchScheduleBlocks(); fetchCourses() }
    const handleBreakStarted = () => { fetchAssignments(); fetchScheduleBlocks(); fetchCourses() }
    const handleAssignmentUpdated = () => { fetchAssignments(); fetchScheduleBlocks(); fetchCourses() }
    const handleAssignmentAdded = () => { fetchAssignments(); fetchScheduleBlocks(); fetchCourses() }
    const handleScheduleUpdated = () => {
      fetchScheduleBlocks()
      try {
        goals.forEach(g => { fetchGoalSessions(g.id) })
      } catch {}
    }
    const handleGoalSessionScheduled = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as Partial<ScheduleBlock>
        if (!detail) return
        setScheduleBlocks(prev => {
          const key = `${detail.start_at}|${detail.end_at}|${detail.title}|${detail.type}`
          const exists = prev.find(b => `${b.start_at}|${b.end_at}|${b.title}|${b.type}` === key)
          if (exists) return prev
          const id = Number(detail.id || Date.now())
          const next: ScheduleBlock = {
            id,
            title: String(detail.title || 'Goal'),
            start_at: String(detail.start_at || new Date().toISOString()),
            end_at: String(detail.end_at || new Date().toISOString()),
            type: String(detail.type || 'EVENT'),
            status: String(detail.status || 'PLANNED'),
            source: String(detail.source || 'MANUAL'),
          }
          return [...prev, next]
        })
      } catch {}
    }
    window.addEventListener('breakCompleted', handleBreakComplete)
    window.addEventListener('breakStarted', handleBreakStarted)
    window.addEventListener('assignmentUpdated', handleAssignmentUpdated)
    window.addEventListener('assignmentAdded', handleAssignmentAdded)
    window.addEventListener('scheduleUpdated', handleScheduleUpdated)
    window.addEventListener('goalSessionScheduled', handleGoalSessionScheduled as EventListener)
    return () => {
      window.removeEventListener('breakCompleted', handleBreakComplete)
      window.removeEventListener('breakStarted', handleBreakStarted)
      window.removeEventListener('assignmentUpdated', handleAssignmentUpdated)
      window.removeEventListener('assignmentAdded', handleAssignmentAdded)
      window.removeEventListener('scheduleUpdated', handleScheduleUpdated)
      window.removeEventListener('goalSessionScheduled', handleGoalSessionScheduled as EventListener)
      clearTimeout(id)
    }
  }, [token, router, fetchAssignments, fetchUserName, updateGreeting, fetchScheduleBlocks, fetchCourses, fetchGoals, fetchGoalSessions, goals])

  useEffect(() => {
    goals.forEach(g => { fetchGoalSessions(g.id) })
  }, [goals, fetchGoalSessions])

  const goalSessionsFlat = useMemo(() => {
    const all: GoalSession[] = []
    for (const g of goals) {
      for (const s of (goalSessionsByGoal[g.id] || [])) {
        all.push(s)
      }
    }
    return all
  }, [goals, goalSessionsByGoal])

  const mergedTasks = useMemo(() => {
    const scheduleItems = scheduleBlocks.map(b => ({ id: b.id, title: b.title, start_at: b.start_at, due_at: undefined, importance_level: undefined, status: b.status }))
    const assignmentItems = assignments.map(a => ({ id: a.id, title: a.title, start_at: undefined, due_at: a.due_at, importance_level: a.importance_level, status: a.status }))
    const goalItems = goalSessionsFlat.map((s, idx) => ({ id: Number(`9${s.goal_id}${s.id}${idx}`), title: (goals.find(g => g.id === s.goal_id)?.name || 'Goal'), start_at: s.start_time, due_at: undefined, importance_level: undefined, status: s.status }))
    return [...scheduleItems, ...assignmentItems, ...goalItems]
  }, [scheduleBlocks, assignments, goalSessionsFlat, goals])

  const mergedBlocks = useMemo(() => {
    const existing = new Set<string>()
    const blocks: ScheduleBlock[] = []
    for (const b of scheduleBlocks) {
      const key = `${b.start_at}|${b.end_at}|${b.title}|${b.type}`
      existing.add(key)
      blocks.push(b)
    }
    for (const s of goalSessionsFlat) {
      const title = goals.find(g => g.id === s.goal_id)?.name || 'Goal'
      const key = `${s.start_time}|${s.end_time}|${title}|EVENT`
      if (!existing.has(key)) {
        blocks.push({ id: Number(`8${s.goal_id}${s.id}`), title, start_at: s.start_time, end_at: s.end_time, type: 'EVENT', status: 'PLANNED', source: 'IMPORTED' })
      }
    }
    return blocks
  }, [scheduleBlocks, goalSessionsFlat, goals])

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-hidden">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h2>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          {greeting}, {userName}!
        </h1>
        <p className="text-sm text-gray-600">
          Here&apos;s your dashboard for today. Stay focused and take care of yourself.
        </p>
      </div>

      {/* 2x3 Grid Layout */}
      <div className="grid grid-cols-[1fr_1fr_1.3fr] grid-rows-2 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Row 1, Col 1: Calendar */}
        <div className="overflow-hidden">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Calendar</div>
            <Button variant="outline" size="sm" onClick={() => setIsAddTaskOpen(true)}>Add Task</Button>
          </div>
          <ModernCalendar
            tasks={mergedTasks}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        {/* Row 1, Col 2: Schedule */}
        <div className="overflow-hidden">
          <ScheduleView
            date={selectedDate}
            blocks={mergedBlocks}
            assignments={assignments}
          />
        </div>

        {/* Row 1, Col 3: Insights */}
        <div className="overflow-hidden h-full">
          <div className="max-w-[100%] ml-auto h-[300px]">
            <InsightsCard schedule={scheduleBlocks} />
          </div>
        </div>

        {/* Row 2, Col 1: Upcoming Tasks */}
        <div className="overflow-hidden">
          <UpcomingTasks
            tasks={scheduleBlocks}
            selectedDate={selectedDate}
            assignmentsIndex={useMemo(() => Object.fromEntries(assignments.map(a => [a.id, a])), [assignments])}
            subtaskIndex={useMemo(() => {
              const entries: Array<[number, { assignment_id: number; title: string; course_id?: number }]> = []
              for (const a of assignments) {
                for (const s of (a.subtasks || [])) {
                  entries.push([s.id, { assignment_id: a.id, title: a.title, course_id: a.course_id ?? undefined }])
                }
              }
              return Object.fromEntries(entries)
            }, [assignments])}
            coursesIndex={useMemo(() => Object.fromEntries(courses.map(c => [c.id, c])), [courses])}
          />
        </div>

        {/* Row 2, Col 2: Check-In */}
        <div className="overflow-hidden">
          <CheckInCard />
        </div>

        {/* Row 2, Col 3: Activity */}
        <div className="overflow-visible h-[calc(100%+1rem)] -mt-4">
          <ActivitySection />
        </div>
      </div>

      {/* AI Assistant Chatbot */}
      <ChatbotButton />

      {/* Add Task Modal */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Title</Label>
              <Input className="col-span-3" placeholder="e.g., Read Chapter 3" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Start</Label>
              <Input type="datetime-local" className="col-span-3" value={newTaskStart} onChange={(e) => setNewTaskStart(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Duration (minutes)</Label>
              <Input type="number" min="15" step="15" className="col-span-3" value={newTaskDuration} onChange={(e) => {
                const n = parseInt(e.target.value || '60', 10)
                if (Number.isFinite(n)) setNewTaskDuration(Math.max(15, n))
              }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                const start = newTaskStart
                const startDate = new Date(start)
                const endDate = new Date(startDate.getTime() + newTaskDuration * 60000)
                const payload = {
                  title: newTaskTitle || 'Task',
                  start_at: startDate.toISOString(),
                  end_at: endDate.toISOString(),
                  type: 'STUDY',
                  status: 'PLANNED'
                }
                await api.post('/schedule/', payload)
                setIsAddTaskOpen(false)
                setNewTaskTitle('')
                setNewTaskStart('')
                setNewTaskDuration(60)
                fetchScheduleBlocks()
                try { window.dispatchEvent(new CustomEvent('scheduleUpdated')) } catch {}
              } catch (error) {
                console.error('Failed to create task', error)
                alert('Failed to create task. Please check the inputs.')
              }
            }}>Save Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
