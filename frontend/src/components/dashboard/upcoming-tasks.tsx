"use client"

import { useState, useEffect } from "react"
import { Circle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"

interface Item {
  id: number
  title: string
  due_at?: string
  start_at?: string
  end_at?: string
  importance_level?: string
  status?: string
  assignment_id?: number
  subtask_id?: number
}

interface UpcomingTasksProps {
  tasks: Item[]
  selectedDate?: Date
  assignmentsIndex?: Record<number, { id: number; title: string; course_id?: number }>
  coursesIndex?: Record<number, { id: number; name: string; code?: string }>
  subtaskIndex?: Record<number, { assignment_id: number; title: string; course_id?: number }>
}

export function UpcomingTasks({ tasks, selectedDate, assignmentsIndex, coursesIndex, subtaskIndex }: UpcomingTasksProps) {
  const today = selectedDate || new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const [completedIds, setCompletedIds] = useState<number[]>([])
  const [excludedBreakTitles] = useState<string[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('assignwell.excludedBreakTitles') : null
      const parsed = raw ? JSON.parse(raw) as string[] : null
      if (Array.isArray(parsed) && parsed.length) return parsed
    } catch {}
    return ["Quick Break"]
  })
  const threeDaysOut = new Date(today)
  threeDaysOut.setDate(threeDaysOut.getDate() + 3)

  

  const priorityRank = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 4
      case 'high': return 3
      case 'medium': return 2
      case 'low': return 1
      default: return 0
    }
  }

  const upcomingTasks = tasks
    .filter(task => {
      const base = task.start_at || task.due_at
      if (!base) return false
      const dueDate = new Date(base)
      const titleNorm = (task.title || '').trim().toLowerCase()
      const isExcluded = excludedBreakTitles.some(t => titleNorm === t.trim().toLowerCase())
      const notCompleted = task.status?.toLowerCase() !== 'completed'
      const notLocallyCompleted = !completedIds.includes(task.id)
      return dueDate >= today && dueDate <= threeDaysOut && !isExcluded && notCompleted && notLocallyCompleted
    })
    .sort((a, b) => {
      const prDiff = priorityRank((b.importance_level || '')) - priorityRank((a.importance_level || ''))
      if (prDiff !== 0) return prDiff
      const ad = new Date(a.start_at || a.due_at || '').getTime()
      const bd = new Date(b.start_at || b.due_at || '').getTime()
      return ad - bd
    })
    .slice(0, 5)

  const todayKey = (today instanceof Date) ? today.toDateString() : String(today)
  const threeDaysOutKey = (() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 3)
    return d.toDateString()
  })()

  useEffect(() => {
    try {
      const baseWindowTasks = tasks.filter(task => {
        const base = task.start_at || task.due_at
        if (!base) return false
        const dueDate = new Date(base)
        const titleNorm = (task.title || '').trim().toLowerCase()
        const isExcluded = excludedBreakTitles.some(t => titleNorm === t.trim().toLowerCase())
        const notCompletedServer = (task.status || '').toLowerCase() !== 'completed'
        const baseToday = new Date(todayKey)
        const threeDaysOutLocal = new Date(baseToday)
        threeDaysOutLocal.setDate(threeDaysOutLocal.getDate() + 3)
        return dueDate >= baseToday && dueDate <= threeDaysOutLocal && !isExcluded && notCompletedServer
      })
      const totalIds = baseWindowTasks.map(t => t.id)
      const completedIdsList = baseWindowTasks.filter(t => completedIds.includes(t.id) || (t.status || '').toLowerCase() === 'completed').map(t => t.id)
      window.dispatchEvent(new CustomEvent('upcomingTasksSnapshot', { detail: { totalIds, completedIds: completedIdsList } }))
    } catch {}
  }, [tasks, completedIds, todayKey, threeDaysOutKey, excludedBreakTitles])

  const getPriorityColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'low': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getDueText = (dueDate: string) => {
    const due = new Date(dueDate)
    const timeWithTz = due.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' })
    if (due.toDateString() === today.toDateString()) return `Due Today • ${timeWithTz}`
    if (due.toDateString() === tomorrow.toDateString()) return `Due Tomorrow • ${timeWithTz}`
    return `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${timeWithTz}`
  }

  const toTitleCase = (s: string | undefined | null) => {
    const t = String(s || "").toLowerCase()
    return t.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
  }

  const splitTitle = (title: string) => {
    const parts = String(title || "").split(" - ")
    if (parts.length > 1) {
      return { assignment: parts[0], task: parts.slice(1).join(" - ") }
    }
    return { assignment: "", task: title }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-900 mb-3">Upcoming Tasks</h2>

      <div className="space-y-2 flex-1 overflow-y-auto">
        {upcomingTasks.map((task) => {
          const isCompleted = task.status?.toLowerCase() === 'completed'
          const { assignment } = splitTitle(task.title || '')
          const assignmentInfo = (task.assignment_id && assignmentsIndex)
            ? assignmentsIndex[task.assignment_id]
            : (task.subtask_id && subtaskIndex)
            ? subtaskIndex[task.subtask_id]
            : undefined
          const assignmentName = assignmentInfo?.title || assignment
          const courseId = (assignmentInfo && 'course_id' in assignmentInfo) ? assignmentInfo.course_id : assignmentInfo?.course_id
          const course = (typeof courseId === 'number' && coursesIndex) ? coursesIndex[courseId] : undefined
          const courseLabel = course ? (course.code ? `${course.code} - ${course.name}` : course.name) : undefined

          const handleComplete = async () => {
            setCompletedIds(prev => (prev.includes(task.id) ? prev : [...prev, task.id]))
            const assignmentIdToMark = (() => {
              if (task.assignment_id && assignmentsIndex?.[task.assignment_id]) return task.assignment_id
              if (task.subtask_id && subtaskIndex?.[task.subtask_id]) return subtaskIndex![task.subtask_id!].assignment_id
              return null
            })()
            try {
              if (assignmentIdToMark) {
                const assignmentTitle = (() => {
                  if (assignmentsIndex?.[assignmentIdToMark]) return assignmentsIndex![assignmentIdToMark]!.title
                  if (task.subtask_id && subtaskIndex?.[task.subtask_id]) return subtaskIndex![task.subtask_id]!.title
                  return "Assignment"
                })()
                await api.put(`/assignments/${assignmentIdToMark}`, { title: assignmentTitle, status: "COMPLETED" })
                window.dispatchEvent(new CustomEvent('assignmentUpdated', { detail: { id: assignmentIdToMark, status: 'COMPLETED' } }))
              } else {
                window.dispatchEvent(new CustomEvent('taskCompleted', { detail: { id: task.id, status: 'COMPLETED' } }))
              }
            } catch (error) {
              console.error('Failed to mark completed', error)
            }
          }

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm",
                isCompleted ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"
              )}
            >
              <button className="mt-0.5" onClick={handleComplete}>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-medium text-sm",
                  isCompleted ? "line-through text-gray-500" : "text-gray-900"
                )}>
                  {toTitleCase(task.title)}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {(assignmentName || courseLabel) && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                      {toTitleCase(assignmentName || '')}{courseLabel ? ` • ${courseLabel}` : ''}
                    </span>
                  )}
                  
                  {task.importance_level && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full border",
                      getPriorityColor(task.importance_level)
                    )}>
                      {task.importance_level}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {getDueText(task.start_at || task.due_at || new Date().toISOString())}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {upcomingTasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No upcoming tasks</p>
            <p className="text-xs mt-1">Add a task to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
