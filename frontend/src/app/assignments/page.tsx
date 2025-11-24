"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { Plus, Search, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
//
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
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
//
import api from "@/lib/api"

interface Assignment {
    id: number
    title: string
    description?: string
    due_at: string
    status: string
    difficulty: string
    source_type: string
    user_confidence: number
    importance_level: string
    course_id?: number
    created_at?: string
}

export default function AssignmentsPage() {
    const router = useRouter()
    const token = useAuthStore(state => state.token)
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [courses, setCourses] = useState<Array<{ id: number; name: string; code?: string }>>([])
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    
    const [importText, setImportText] = useState("")
    const [importFileName, setImportFileName] = useState("")
    const [plannerTitle, setPlannerTitle] = useState("")
    const [plannerDeadline, setPlannerDeadline] = useState("")
    const [plannerCourseText, setPlannerCourseText] = useState<string>("")
    const [hoursPerDay, setHoursPerDay] = useState<number>(2)
    const [hoursPerDayText, setHoursPerDayText] = useState<string>('2')
    useEffect(() => { setHoursPerDayText(String(hoursPerDay)) }, [hoursPerDay])
    const [allowWeekends, setAllowWeekends] = useState<boolean>(true)
    const [plannedSubtasks, setPlannedSubtasks] = useState<Array<{ id: number; title: string; estimated_minutes: number; order_index?: number; start_at?: string; end_at?: string }>>([])
    const [isPlanning, setIsPlanning] = useState(false)
    const [isExtracting, setIsExtracting] = useState(false)
    const [suggestionOpen, setSuggestionOpen] = useState(false)
    const [suggestedHoursPerDay, setSuggestedHoursPerDay] = useState<number | null>(null)
    const [workSummary, setWorkSummary] = useState<{ totalHours: number; daysAvailable: number } | null>(null)
    const [plannerAssignmentId, setPlannerAssignmentId] = useState<number | null>(null)
    const [plannerAssignmentTitle, setPlannerAssignmentTitle] = useState<string>("")
    const [planningChoice, setPlanningChoice] = useState<"subtasks" | "one_go" | null>(null)
    const [caseOneChoice, setCaseOneChoice] = useState<"ai" | "manual" | null>(null)
    const [aiOptions, setAiOptions] = useState<Array<{ start: string; duration: number }>>([])
    const [selectedAi, setSelectedAi] = useState<number | null>(null)
    const [manualStart, setManualStart] = useState<string>("")
    const [manualDuration, setManualDuration] = useState<number>(60)
    const [allTasksQuery, setAllTasksQuery] = useState<string>("")
    const [allAssignmentsQuery, setAllAssignmentsQuery] = useState<string>("")
    const [assignmentsSortBy] = useState<"due" | "importance">("due")
    const [assignmentsCourseFilter, setAssignmentsCourseFilter] = useState<string>("")
    const [tasks, setTasks] = useState<Array<{ id: number; title: string; start_at?: string; end_at?: string; importance_level?: string; status?: string; assignment_id?: number; subtask_id?: number; type?: string }>>([])
    const toTitleCase = (s: string | undefined | null) => {
        const t = String(s || "").toLowerCase()
        return t.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
    }
    const downloadAssignments = (format: "json" | "csv", items: Assignment[]) => {
        if (format === "json") {
            const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "assignments.json"
            a.click()
            URL.revokeObjectURL(url)
            return
        }
        const headers = ["id","title","course_id","due_at","importance_level","status","user_confidence"]
        const rows = items.map(a => [a.id, a.title, a.course_id ?? "", a.due_at, a.importance_level, a.status, a.user_confidence])
        const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "assignments.csv"
        a.click()
        URL.revokeObjectURL(url)
    }
    const courseLabel = (id?: number) => {
        if (!id) return "N/A"
        const c = courses.find(x => x.id === id)
        if (!c) return String(id)
        return c.code ? `${c.code} - ${c.name}` : c.name
    }

    const resolveCourseId = async (courseText: string): Promise<number | undefined> => {
        const text = (courseText || "").trim()
        if (!text) return undefined
        const match = courses.find(c => c.name.toLowerCase() === text.toLowerCase() || (c.code || "").toLowerCase() === text.toLowerCase() || `${c.code ? c.code + " - " : ""}${c.name}`.toLowerCase() === text.toLowerCase())
        if (match) return match.id
        try {
            const parts = text.split("-")
            const code = parts.length > 1 ? parts[0].trim() : undefined
            const name = parts.length > 1 ? parts.slice(1).join("-").trim() : text
            const res = await api.post("/courses/", { name, code })
            const created = res?.data as { id: number }
            await fetchCourses()
            return created?.id
        } catch {
            return undefined
        }
    }
    const getAllAssignmentsList = () => {
        const filtered = assignments
            .filter(a => (String(a.importance_level || '').toLowerCase() !== 'low'))
            .filter(a => !(/break|study/i.test(String(a.title || ''))))
            .filter(a => {
                if (!allAssignmentsQuery.trim()) return true
                const q = allAssignmentsQuery.toLowerCase()
                return a.title?.toLowerCase().includes(q)
            })
            .filter(a => {
                if (!assignmentsCourseFilter.trim()) return true
                const lbl = courseLabel(a.course_id).toLowerCase()
                return lbl.includes(assignmentsCourseFilter.toLowerCase())
            })
        const sorted = filtered.slice().sort((a, b) => {
            if (assignmentsSortBy === "importance") {
                const rank = { critical: 3, high: 2, medium: 1, low: 0 } as Record<string, number>
                const ai = rank[String(a.importance_level || '').toLowerCase()] ?? 0
                const bi = rank[String(b.importance_level || '').toLowerCase()] ?? 0
                return bi - ai
            }
            return new Date(b.due_at).getTime() - new Date(a.due_at).getTime()
        })
        return sorted
    }
    

    const fetchAssignments = async () => {
        try {
            const response = await api.get("/assignments/")
            setAssignments(response.data)
        } catch (error) {
            console.error("Failed to fetch assignments", error)
        }
    }

    const fetchScheduleBlocks = async () => {
        try {
            const response = await api.get("/schedule/")
            const items = Array.isArray(response.data) ? response.data : []
            setTasks(items.filter((b) => !(/break|event/i.test(String(b.type || '')))))
        } catch (error) {
            console.error("Failed to fetch schedule blocks", error)
        }
    }

    const fetchCourses = async () => {
        try {
            const response = await api.get("/courses/")
            setCourses(response.data || [])
        } catch (error) {
            console.error("Failed to fetch courses", error)
        }
    }

    useEffect(() => {
        if (!token) {
            return
        }
        const id = setTimeout(() => {
            fetchAssignments()
            fetchCourses()
            fetchScheduleBlocks()
        }, 0)

        const refresh = () => { fetchAssignments(); fetchScheduleBlocks() }
        window.addEventListener('assignmentAdded', refresh as EventListener)
        window.addEventListener('assignmentUpdated', refresh as EventListener)

        return () => {
            clearTimeout(id)
            window.removeEventListener('assignmentAdded', refresh as EventListener)
            window.removeEventListener('assignmentUpdated', refresh as EventListener)
        }
    }, [token, router])

    const handleCreateAssignment = async () => {
        try {
            const resolvedCourseId = await resolveCourseId(plannerCourseText)
            const dueIso = plannerDeadline ? isoWithTZ(new Date(plannerDeadline)) : undefined
            await api.post("/assignments/", {
                title: toTitleCase(plannerTitle || "Untitled Assignment"),
                course_id: resolvedCourseId ?? null,
                due_at: dueIso,
                status: "NOT_STARTED",
                source_type: "manual",
                user_confidence: 3,
                importance_level: "medium",
            })
            setIsAddDialogOpen(false)
            fetchAssignments()
        } catch (error) {
            console.error("Failed to create assignment", error)
        }
    }

    

    const handleImportFile = async (file: File | null) => {
        try {
            if (!file) return
            setImportFileName(file.name)
            const name = file.name.toLowerCase()
            const type = (file.type || "").toLowerCase()
            const setTitleIfEmpty = () => {
                if (!plannerTitle) setPlannerTitle(file.name.replace(/\.[^/.]+$/, ""))
            }

            // .txt / .md
            if (type.startsWith("text/") || name.endsWith(".md") || name.endsWith(".txt")) {
                const text = await file.text()
                setImportText(text)
                setTitleIfEmpty()
                return
            }

            // .docx via mammoth
            if (name.endsWith(".docx") || type.includes("openxmlformats-officedocument.wordprocessingml.document")) {
                try {
                    const { default: mammoth } = await import("mammoth")
                    const buffer = await file.arrayBuffer()
                    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
                    const text = String(result?.value || "").replace(/\s+/g, " ").trim()
                    setImportText(text)
                    setTitleIfEmpty()
                    return
                } catch {
                    const text = await file.text().catch(() => "")
                    setImportText(text || "")
                    setTitleIfEmpty()
                    return
                }
            }

            // .pdf via pdfjs-dist
            if (name.endsWith(".pdf") || type.includes("pdf")) {
                try {
                    const pdfjsLib = await import("pdfjs-dist")
                    // @ts-expect-error set worker to empty; Next.js build includes default worker
                    pdfjsLib.GlobalWorkerOptions.workerSrc = undefined
                    const buffer = await file.arrayBuffer()
                    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
                    let full = ""
                    const getStr = (it: unknown): string => {
                        const obj = it as { str?: unknown }
                        return typeof obj.str === "string" ? obj.str : ""
                    }
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i)
                        const content = await page.getTextContent()
                        const strings = (Array.isArray(content?.items) ? content.items : [])
                            .map(getStr)
                            .filter((s) => s !== "")
                        full += strings.join(" ") + "\n"
                    }
                    const text = full.replace(/\s+/g, " ").trim()
                    setImportText(text)
                    setTitleIfEmpty()
                    return
                } catch {
                    const text = await file.text().catch(() => "")
                    setImportText(text || "")
                    setTitleIfEmpty()
                    return
                }
            }

            // Fallback for unknown types
            const fallback = await file.text().catch(() => "")
            setImportText(fallback || "")
            setTitleIfEmpty()
        } catch {}
    }

    const isoWithTZ = (d: Date) => {
        const tz = d.getTimezoneOffset()
        const sign = tz <= 0 ? "+" : "-"
        const abs = Math.abs(tz)
        const offH = String(Math.floor(abs / 60)).padStart(2, "0")
        const offM = String(abs % 60).padStart(2, "0")
        const pad = (n: number) => String(n).padStart(2, "0")
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${offH}:${offM}`
    }

    const generatePlanner = async () => {
        try {
            setIsPlanning(true)
            const title = plannerTitle || (importFileName ? importFileName.replace(/\.[^/.]+$/, "") : "Untitled Assignment")
            const dueIso = (() => {
                if (!plannerDeadline) return undefined
                const d = new Date(plannerDeadline)
                return isoWithTZ(d)
            })()
            const createRes = await api.post("/assignments/", {
                title,
                description: importText || "",
                due_at: dueIso,
                status: "NOT_STARTED",
                importance_level: "medium",
                course_id: await resolveCourseId(plannerCourseText),
            }, { timeout: 20000 })
            const created = createRes?.data as { id: number }
            setPlannerAssignmentId(created?.id ?? null)
            setPlannerAssignmentTitle(title)
            const planRes = await api.post(`/assignments/${created.id}/plan`, undefined, { timeout: 60000 })
            const subtasks = (planRes?.data as Array<{ id: number; title: string; estimated_minutes: number; order_index?: number }>) || []
            const moodRes = await api.get("/mood/", { params: { limit: 1 }, timeout: 10000 })
            type MoodItem = { additional_metrics?: { burnout_indicator?: string } }
            const latestMood: MoodItem | null = (Array.isArray(moodRes?.data) && moodRes.data.length > 0) ? (moodRes.data[0] as MoodItem) : null
            const burnout = latestMood?.additional_metrics?.burnout_indicator
            const burnoutHeavy = burnout === "noticeable" || burnout === "a_lot"

            const scheduleRes = await api.get("/schedule/", { timeout: 20000 })
            const existing = (scheduleRes?.data as Array<{ start_at: string; end_at: string }>) || []
            const deadline = plannerDeadline ? new Date(plannerDeadline) : new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
            const baseCapacityMin = Math.max(30, Math.min(8 * 60, Math.round(hoursPerDay * 60)))
            const dayCapacityMin = burnoutHeavy ? Math.round(baseCapacityMin * 0.7) : baseCapacityMin

            const byDay = new Map<string, Array<{ start: Date; end: Date }>>()
            for (const b of existing) {
                const s = new Date(b.start_at)
                const e = new Date(b.end_at)
                const key = s.toDateString()
                const arr = byDay.get(key) || []
                arr.push({ start: s, end: e })
                byDay.set(key, arr)
            }

            const startHour = 9
            const breakMin = burnoutHeavy ? 25 : 15
            const now = new Date()
            let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0, 0)

            const withinDeadline = (d: Date) => d <= deadline
            const isWeekend = (d: Date) => {
                const day = d.getDay()
                return day === 0 || day === 6
            }

            let dayUsedMin = 0
            const toLocalInput = (d: Date) => {
                const pad = (n: number) => String(n).padStart(2, "0")
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
            }
            const advanceToNextDay = () => {
                const next = new Date(cursor)
                next.setDate(cursor.getDate() + 1)
                next.setHours(startHour, 0, 0, 0)
                cursor = next
                dayUsedMin = 0
            }

            const scheduled: Array<{ id: number; title: string; estimated_minutes: number; order_index?: number; start_at?: string; end_at?: string }> = []
            for (const s of subtasks) {
                let remaining = Math.max(15, Math.round(s.estimated_minutes || 30))
                while (remaining > 0) {
                    if (!withinDeadline(cursor)) break
                    if (!allowWeekends && isWeekend(cursor)) {
                        advanceToNextDay()
                        continue
                    }
                    const availableToday = dayCapacityMin - dayUsedMin
                    if (availableToday <= 0) {
                        advanceToNextDay()
                        continue
                    }
                    const baseMin = burnoutHeavy ? 20 : 30
                    const cap = burnoutHeavy ? Math.min(60, remaining) : remaining
                    const slotMin = Math.min(cap, Math.max(baseMin, availableToday))

                    const dayKey = cursor.toDateString()
                    const occupied = (byDay.get(dayKey) || []).slice().sort((a, b) => a.start.getTime() - b.start.getTime())
                    let start = new Date(cursor)
                    for (const block of occupied) {
                        if (start < block.end && (start >= block.start)) {
                            start = new Date(block.end.getTime() + breakMin * 60 * 1000)
                        }
                    }
                    const end = new Date(start.getTime() + slotMin * 60 * 1000)
                    occupied.push({ start, end })
                    byDay.set(dayKey, occupied)

                    scheduled.push({ id: s.id, title: s.title, estimated_minutes: s.estimated_minutes, order_index: s.order_index, start_at: toLocalInput(start), end_at: toLocalInput(end) })

                    dayUsedMin += slotMin
                    remaining -= slotMin
                    cursor = new Date(end.getTime() + breakMin * 60 * 1000)
                }
            }

            setPlannedSubtasks(scheduled)

            const totalMin = Math.max(0, scheduled.reduce((acc, s) => acc + Math.max(15, Math.round(s.estimated_minutes || 30)), 0))
            const countDays = (start: Date, finish: Date, includeWeekends: boolean) => {
                const d = new Date(start.getFullYear(), start.getMonth(), start.getDate())
                const last = new Date(finish.getFullYear(), finish.getMonth(), finish.getDate())
                let count = 0
                while (d <= last) {
                    const wd = d.getDay()
                    if (includeWeekends || (wd !== 0 && wd !== 6)) count++
                    d.setDate(d.getDate() + 1)
                }
                return Math.max(1, count)
            }
            const daysAvail = countDays(now, deadline, allowWeekends)
            const capacityMin = Math.max(30, Math.round(hoursPerDay * 60)) * daysAvail
            if (capacityMin < totalMin) {
                const neededPerDayMin = Math.ceil(totalMin / daysAvail)
                const suggested = Math.max(0.5, Math.round(neededPerDayMin / 60 * 2) / 2)
                setSuggestedHoursPerDay(suggested)
                setWorkSummary({ totalHours: Math.round(totalMin / 60 * 10) / 10, daysAvailable: daysAvail })
                setSuggestionOpen(true)
            }
        } catch (e) {
            console.error("Failed to generate planner", e)
            alert("Failed to generate planner. Please check inputs and try again.")
        } finally {
            setIsPlanning(false)
        }
    }

    const extractUsingAI = async () => {
        try {
            setIsExtracting(true)
            if (!importText || importText.trim().length < 10) {
                alert("Please upload or paste assignment details first")
                return
            }
            const res = await api.post("/ai/extract-assignment-text", { text: importText })
            const data = res?.data as { clean_text?: string; suggested_title?: string }
            if (data?.clean_text) setImportText(data.clean_text)
            if (data?.suggested_title && !plannerTitle) setPlannerTitle(data.suggested_title)
        } catch (e) {
            console.error("AI extraction failed", e)
            alert("AI extraction failed. Please try again or edit manually.")
        } finally {
            setIsExtracting(false)
        }
    }

    const addPlanToCalendar = async () => {
        try {
            if (!plannedSubtasks.length) return
            const moodRes = await api.get("/mood/", { params: { limit: 1 }, timeout: 10000 })
            type MoodItem = { additional_metrics?: { burnout_indicator?: string } }
            const latestMood: MoodItem | null = (Array.isArray(moodRes?.data) && moodRes.data.length > 0) ? (moodRes.data[0] as MoodItem) : null
            const burnout = latestMood?.additional_metrics?.burnout_indicator
            const burnoutHeavy = burnout === "noticeable" || burnout === "a_lot"

            const scheduleRes = await api.get("/schedule/")
            const existing = (scheduleRes?.data as Array<{ start_at: string; end_at: string }>) || []
            const deadline = plannerDeadline ? new Date(plannerDeadline) : new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
            const baseCapacityMin = Math.max(30, Math.min(8 * 60, Math.round(hoursPerDay * 60)))
            const dayCapacityMin = burnoutHeavy ? Math.round(baseCapacityMin * 0.7) : baseCapacityMin

            const byDay = new Map<string, Array<{ start: Date; end: Date }>>()
            for (const b of existing) {
                const s = new Date(b.start_at)
                const e = new Date(b.end_at)
                const key = s.toDateString()
                const arr = byDay.get(key) || []
                arr.push({ start: s, end: e })
                byDay.set(key, arr)
            }

            const startHour = 9
            const breakMin = burnoutHeavy ? 25 : 15
            const now = new Date()
            let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0, 0)

            const withinDeadline = (d: Date) => d <= deadline
            const isWeekend = (d: Date) => {
                const day = d.getDay()
                return day === 0 || day === 6
            }

            let dayUsedMin = 0
            const createdBlocks: Array<{ id?: number }> = []

            const advanceToNextDay = () => {
                const next = new Date(cursor)
                next.setDate(cursor.getDate() + 1)
                next.setHours(startHour, 0, 0, 0)
                cursor = next
                dayUsedMin = 0
            }

            for (const s of plannedSubtasks) {
                if (s.start_at && s.end_at) {
                    const start = new Date(s.start_at)
                    const end = new Date(s.end_at)
                    const payload = {
                        start_at: start.toISOString(),
                        end_at: end.toISOString(),
                        type: "STUDY",
                        status: "PLANNED",
                        title: toTitleCase(plannerAssignmentTitle ? `${plannerAssignmentTitle} - ${s.title}` : s.title),
                        assignment_id: plannerAssignmentId ?? undefined,
                        subtask_id: s.id,
                        source: "AI_SUGGESTED",
                    }
                    try {
                        const created = await api.post("/schedule/", payload)
                        createdBlocks.push(created?.data || {})
                    } catch {}
                    continue
                }
                let remaining = Math.max(15, Math.round(s.estimated_minutes || 30))
                while (remaining > 0) {
                    if (!withinDeadline(cursor)) break
                    if (!allowWeekends && isWeekend(cursor)) {
                        advanceToNextDay()
                        continue
                    }
                    // Ensure we don't exceed daily capacity
                    const availableToday = dayCapacityMin - dayUsedMin
                    if (availableToday <= 0) {
                        advanceToNextDay()
                        continue
                    }
                    const baseMin = burnoutHeavy ? 20 : 30
                    const cap = burnoutHeavy ? Math.min(60, remaining) : remaining
                    const slotMin = Math.min(cap, Math.max(baseMin, availableToday))

                    const dayKey = cursor.toDateString()
                    const occupied = (byDay.get(dayKey) || []).slice().sort((a, b) => a.start.getTime() - b.start.getTime())
                    // Find next non-overlapping start time
                    let start = new Date(cursor)
                    for (const block of occupied) {
                        if (start < block.end && (start >= block.start)) {
                            start = new Date(block.end.getTime() + breakMin * 60 * 1000)
                        }
                    }
                    const end = new Date(start.getTime() + slotMin * 60 * 1000)
                    // Record occupancy for rest of planning loop
                    occupied.push({ start, end })
                    byDay.set(dayKey, occupied)

                    const payload = {
                        start_at: end < deadline ? start.toISOString() : deadline.toISOString(),
                        end_at: end < deadline ? end.toISOString() : deadline.toISOString(),
                        type: "STUDY",
                        status: "PLANNED",
                        title: toTitleCase(plannerAssignmentTitle ? `${plannerAssignmentTitle} - ${s.title}` : s.title),
                        assignment_id: plannerAssignmentId ?? undefined,
                        subtask_id: s.id,
                        source: "AI_SUGGESTED",
                    }
                    try {
                        const created = await api.post("/schedule/", payload)
                        createdBlocks.push(created?.data || {})
                    } catch {}

                    dayUsedMin += slotMin
                    remaining -= slotMin
                    // Move cursor forward for next block
                    cursor = new Date(end.getTime() + breakMin * 60 * 1000)
                }
            }

            window.dispatchEvent(new CustomEvent('assignmentUpdated'))
            alert(`Added ${createdBlocks.length} study blocks to your calendar`)
        } catch (e) {
            console.error("Failed to add plan to calendar", e)
            alert("Failed to add plan to calendar. Please try again.")
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Assignments</h2>
                <div className="flex items-center space-x-2">
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Assignment
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[1000px] max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Assignment Planner</DialogTitle>
                                <DialogDescription>Upload or describe the assignment, then plan your work.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label>Assignment Title</Label>
                                    <Input className="w-full" placeholder="e.g., Final Paper" value={plannerTitle} onChange={(e) => setPlannerTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Course</Label>
                                    <Input className="w-full" placeholder="Type course" value={plannerCourseText} onChange={(e) => setPlannerCourseText(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Deadline</Label>
                                    <Input type="datetime-local" className="w-full" value={plannerDeadline} onChange={(e) => setPlannerDeadline(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Hours per Day</Label>
                                    <Input type="number" min="0.5" step="0.5" className="w-full" value={hoursPerDayText} onChange={(e) => {
                                        const v = e.target.value
                                        setHoursPerDayText(v)
                                        const parsed = parseFloat(v)
                                        if (!Number.isNaN(parsed)) setHoursPerDay(Math.max(0.5, Math.min(12, parsed)))
                                    }} onBlur={(e) => {
                                        const parsed = parseFloat(e.target.value)
                                        const safe = Number.isNaN(parsed) ? hoursPerDay : Math.max(0.5, Math.min(12, parsed))
                                        setHoursPerDay(safe)
                                        setHoursPerDayText(String(safe))
                                    }} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Allow Weekends</Label>
                                    <Switch checked={allowWeekends} onCheckedChange={setAllowWeekends} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Upload Document</Label>
                                    <Input type="file" accept=".txt,.md,.docx,.pdf" onChange={(e) => handleImportFile(e.target.files?.[0] || null)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Extract / Parsed Details</Label>
                                    <textarea className="w-full h-40 rounded-md border p-2" placeholder="Please describe the assignment details manually if no document." value={importText} onChange={(e) => setImportText(e.target.value)} />
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button variant="secondary" onClick={extractUsingAI} disabled={isExtracting}>{isExtracting ? "Summarizing..." : "Summarize Assignment"}</Button>
                                    <Button onClick={() => {
                                        const noDetails = !importText.trim()
                                        setPlanningChoice(null)
                                        setCaseOneChoice(null)
                                        setSelectedAi(null)
                                        setAiOptions([])
                                        if (noDetails) {
                                            const base = new Date()
                                            const mk = (offsetH: number) => new Date(base.getTime() + offsetH * 3600000).toISOString()
                                            setAiOptions([
                                                { start: mk(1), duration: 30 },
                                                { start: mk(2), duration: 60 },
                                                { start: mk(3), duration: 90 },
                                                { start: mk(4), duration: 120 },
                                                { start: mk(6), duration: 60 },
                                            ])
                                        }
                                    }} disabled={isPlanning}>{isPlanning ? "Generating..." : "Generate Plan"}</Button>
                                    {plannedSubtasks.length > 0 && (
                                        <Button variant="outline" onClick={addPlanToCalendar}>Confirm & Save</Button>
                                    )}
                                </div>
                                <div className="space-y-5">
                                    {aiOptions.length > 0 && planningChoice === null && (
                                        <div className="space-y-3">
                                            <div className="text-sm font-medium">Choose one scheduling method:</div>
                                            <div className="flex gap-2">
                                                <Button variant={caseOneChoice === 'ai' ? 'default' : 'outline'} onClick={() => setCaseOneChoice('ai')}>AI-suggested times (5 options)</Button>
                                                <Button variant={caseOneChoice === 'manual' ? 'default' : 'outline'} onClick={() => setCaseOneChoice('manual')}>Manual time + duration</Button>
                                            </div>
                                            {caseOneChoice === 'ai' && (
                                                <div className="space-y-2">
                                                    {aiOptions.map((opt, idx) => (
                                                        <label key={idx} className="flex items-center gap-2 text-xs">
                                                            <input type="radio" name="aiOpt" checked={selectedAi === idx} onChange={() => setSelectedAi(idx)} />
                                                            <span>{new Date(opt.start).toLocaleString()} • {opt.duration} min</span>
                                                        </label>
                                                    ))}
                                                    <Button onClick={async () => {
                                                        if (selectedAi == null) return alert('Pick an option')
                                                        await handleCreateAssignment()
                                                        setIsAddDialogOpen(false)
                                                    }}>Save Assignment</Button>
                                                </div>
                                            )}
                                            {caseOneChoice === 'manual' && (
                                                <div className="grid grid-cols-12 gap-2 items-center">
                                                    <div className="col-span-7">
                                                        <Input type="datetime-local" value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <Input type="number" min="15" step="15" value={manualDuration} onChange={(e) => {
                                                            const n = parseInt(e.target.value || '60', 10)
                                                            if (Number.isFinite(n)) setManualDuration(Math.max(15, n))
                                                        }} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Button onClick={async () => { await handleCreateAssignment(); setIsAddDialogOpen(false) }}>Save Assignment</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {importText.trim() && planningChoice === null && (
                                        <div className="space-y-3">
                                            <div className="text-sm font-medium">Do you want to break the assignment into subtasks or complete it in one go?</div>
                                            <div className="flex gap-2">
                                                <Button variant={planningChoice === 'subtasks' ? 'default' : 'outline'} onClick={async () => { setPlanningChoice('subtasks'); await generatePlanner() }}>Subtasks</Button>
                                                <Button variant={planningChoice === 'one_go' ? 'default' : 'outline'} onClick={() => {
                                                    setPlanningChoice('one_go')
                                                    const base = new Date()
                                                    const mk = (offsetH: number) => new Date(base.getTime() + offsetH * 3600000).toISOString()
                                                    setAiOptions([
                                                        { start: mk(1), duration: 60 },
                                                        { start: mk(2), duration: 90 },
                                                        { start: mk(3), duration: 120 },
                                                        { start: mk(4), duration: 60 },
                                                        { start: mk(6), duration: 180 },
                                                    ])
                                                    setCaseOneChoice(null)
                                                    setSelectedAi(null)
                                                }}>One-Go</Button>
                                            </div>
                                        </div>
                                    )}
                                    {plannedSubtasks.length > 0 && planningChoice === "subtasks" && (
                                        <div className="space-y-2">
                                            <div className="text-xs text-muted-foreground">AI suggested times for each subtask. Is this okay? Edit any start/end below, then click Confirm & Save.</div>
                                            {plannedSubtasks.map((s, idx) => (
                                                <div key={`${s.id}-${idx}`} className="grid grid-cols-12 gap-2 items-center">
                                                    <div className="col-span-6">
                                                        <Input value={s.title} onChange={(e) => setPlannedSubtasks(prev => prev.map((p, i) => i === idx ? { ...p, title: e.target.value } : p))} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Input type="number" min="15" step="5" value={s.estimated_minutes} onChange={(e) => setPlannedSubtasks(prev => prev.map((p, i) => i === idx ? { ...p, estimated_minutes: Math.max(15, parseInt(e.target.value || '30', 10)) } : p))} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Input type="datetime-local" placeholder="Start" value={s.start_at || ''} onChange={(e) => setPlannedSubtasks(prev => prev.map((p, i) => i === idx ? { ...p, start_at: e.target.value } : p))} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Input type="datetime-local" placeholder="End" value={s.end_at || ''} onChange={(e) => setPlannedSubtasks(prev => prev.map((p, i) => i === idx ? { ...p, end_at: e.target.value } : p))} />
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-end pt-2">
                                                <Button variant="outline" onClick={addPlanToCalendar}>Confirm & Save</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Close</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ height: 'calc(100vh - 200px)' }}>
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>All Tasks</CardTitle>
                            <CardDescription>Includes subtasks and standalone tasks.</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search tasks..." className="pl-8 w-[280px]" value={allTasksQuery} onChange={(e) => setAllTasksQuery(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[540px] w-full p-2">
                            {(() => {
                                const draftSubtasks = plannedSubtasks.map(ps => ({
                                    id: ps.id,
                                    title: ps.title,
                                    start_at: ps.start_at,
                                    end_at: ps.end_at,
                                    status: 'DRAFT',
                                    type: 'STUDY'
                                }))
                                const filtered = [...draftSubtasks, ...tasks].filter(t => {
                                    if (!allTasksQuery.trim()) return true
                                    const q = allTasksQuery.toLowerCase()
                                    return (String(t.title || '').toLowerCase().includes(q))
                                }).sort((a, b) => {
                                    const ad = new Date(a.start_at || a.end_at || '').getTime()
                                    const bd = new Date(b.start_at || b.end_at || '').getTime()
                                    return ad - bd
                                })
                                return filtered.length === 0 ? (
                                    <div className="p-4 text-sm text-muted-foreground">No tasks found.</div>
                                ) : (
                                    filtered.map((t, i) => (
                                        <div key={t.status === 'DRAFT' ? `draft-${t.id}-${t.start_at || ''}-${t.end_at || ''}-${i}` : `task-${t.id}`} className="flex flex-col gap-1 p-3 rounded-md border mb-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{toTitleCase(t.title)}</span>
                                                {t.status === 'DRAFT' ? (
                                                    <Badge variant="outline">{t.status}</Badge>
                                                ) : null}
                                        </div>
                                            <div className="text-xs text-muted-foreground flex justify-between">
                                                <span>{t.start_at ? `Start: ${new Date(t.start_at).toLocaleString()}` : ''}</span>
                                                <span>{t.end_at ? `End: ${new Date(t.end_at).toLocaleString()}` : ''}</span>
                                            </div>
                                        </div>
                                    ))
                                )
                            })()}
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
                <CardHeader>
                    <div className="flex flex-col gap-3">
                        <div>
                            <CardTitle>All Assignments</CardTitle>
                            <CardDescription>Every assignment entry.</CardDescription>
                        </div>
                        <div className="flex items-center flex-wrap gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search assignments..." className="pl-8 w-[240px]" value={allAssignmentsQuery} onChange={(e) => setAllAssignmentsQuery(e.target.value)} />
                            </div>
                            <Input placeholder="Filter by course" className="w-[220px]" value={assignmentsCourseFilter} onChange={(e) => setAssignmentsCourseFilter(e.target.value)} />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Download className="mr-2 h-4 w-4" /> Download
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" sideOffset={4}>
                                    <DropdownMenuItem onClick={() => downloadAssignments("json", getAllAssignmentsList())}>JSON</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => downloadAssignments("csv", getAllAssignmentsList())}>CSV</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[540px] w-full p-2">
                        {(() => {
                            const filtered = getAllAssignmentsList()
                            return filtered.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground">No assignments found.</div>
                            ) : (
                                filtered.map((assignment) => (
                                    <div key={assignment.id} className="flex flex-col gap-1 p-3 rounded-md border mb-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{toTitleCase(assignment.title)}</span>
                                            <Badge variant={assignment.importance_level === 'high' || assignment.importance_level === 'critical' ? 'destructive' : assignment.importance_level === 'medium' ? 'default' : 'secondary'}>
                                                {assignment.importance_level}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground flex justify-between">
                                            <span>Course: {courseLabel(assignment.course_id)}</span>
                                            <span>Due: {new Date(assignment.due_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))
                            )
                        })()}
                    </ScrollArea>
                </CardContent>
            </Card>
            </div>

            {/* Removed old AI Planner card; planner now lives in Add Assignment modal */}

            {suggestionOpen && (
                <Dialog open={suggestionOpen} onOpenChange={setSuggestionOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Increase Hours Per Day?</DialogTitle>
                            <DialogDescription>
                                {workSummary ? `Estimated work ~${workSummary.totalHours}h over ${workSummary.daysAvailable} day(s).` : ''}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div className="text-sm">Your current daily limit may be too low to finish before the deadline.</div>
                            {suggestedHoursPerDay !== null && (
                                <div className="text-sm">Suggested daily hours: <span className="font-semibold">{suggestedHoursPerDay}h/day</span></div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSuggestionOpen(false)}>Keep Current</Button>
                            <Button onClick={() => { if (suggestedHoursPerDay) setHoursPerDay(suggestedHoursPerDay); setSuggestionOpen(false) }}>Apply Suggestion</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
