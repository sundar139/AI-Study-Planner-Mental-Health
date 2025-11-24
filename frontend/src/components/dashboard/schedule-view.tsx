"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"

interface BlockItem {
  id: number
  title: string
  start_at?: string
  end_at?: string
  type?: string
  status?: string
  importance_level?: string
}

interface AssignmentItem {
  id: number
  title: string
  due_at?: string
  importance_level?: string
  course_id?: number
}

interface ScheduleViewProps {
  date: Date
  blocks: BlockItem[]
  assignments: AssignmentItem[]
}

export function ScheduleView({ date, blocks, assignments }: ScheduleViewProps) {
  const blocksForDate = useMemo(() => {
    return blocks.filter(b => {
      const base = b.start_at
      if (!base) return false
      const d = new Date(base)
      return d.toDateString() === date.toDateString()
    })
  }, [blocks, date])

  const assignmentsForDate = useMemo(() => {
    return assignments.filter(a => {
      const base = a.due_at
      if (!base) return false
      const d = new Date(base)
      return d.toDateString() === date.toDateString()
    })
  }, [assignments, date])

  const getBlockPosition = (block: BlockItem) => {
    const d = new Date(block.start_at || date)
    const h = d.getHours()
    const m = d.getMinutes()
    return h + m / 60
  }

  const getBlockDuration = (block: BlockItem) => {
    const start = new Date(block.start_at || date).getTime()
    const end = new Date(block.end_at || block.start_at || date).getTime()
    return Math.max(0, (end - start) / (1000 * 60))
  }

  

  const getColorForBlock = (block: BlockItem) => {
    const t = String(block.type || "").toUpperCase()
    switch (t) {
      case "EVENT": return "bg-emerald-500"
      case "STUDY": return "bg-blue-500"
      case "BREAK": return "bg-gray-400"
      case "EXAM": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const getPriorityColor = (level?: string) => {
    switch (String(level || "").toLowerCase()) {
      case "high": return "bg-orange-600"
      case "medium": return "bg-amber-500"
      case "low": return "bg-yellow-500"
      default: return "bg-yellow-400"
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="mb-3 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Schedule</h2>
        <p className="text-xs text-gray-600">
          {date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="flex border-b border-gray-100 h-12">
            <div className="w-24 flex-shrink-0 text-xs text-gray-600 pr-2 pt-1">
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </div>
            <div className="flex-1 relative">
              {blocksForDate
                .filter(b => Math.floor(getBlockPosition(b)) === hour)
                .map((block) => {
                  const position = getBlockPosition(block)
                  const duration = getBlockDuration(block)
                  return (
                    <div
                      key={`block-${block.id}`}
                      className={cn("absolute left-0 right-0 mx-1 group")}
                      style={{ top: `${((position % 1) * 48)}px`, height: `6px` }}
                    >
                      <div className={cn("h-[6px] w-[70%] mx-auto rounded-full", getColorForBlock(block))} />
                      <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 mx-auto w-max max-w-[260px] rounded-md border bg-white px-2 py-1 text-[11px] shadow-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0">
                        <div className="font-medium truncate">{block.title || "Event"}</div>
                        <div className="flex items-center gap-1 mt-0.5 text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(block.start_at || date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {" - "}
                            {new Date(block.end_at || block.start_at || date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {" • "}{Math.round(duration)}m
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              {assignmentsForDate
                .filter(a => {
                  const d = new Date(a.due_at || date)
                  return d.getHours() === hour
                })
                .map((a) => {
                  const d = new Date(a.due_at || date)
                  const position = d.getMinutes() / 60
                  return (
                    <div
                      key={`asg-${a.id}`}
                      className={cn("absolute left-0 right-0 mx-1 group")}
                      style={{ top: `${position * 48}px`, height: `6px` }}
                    >
                      <div className={cn("h-[6px] w-[70%] mx-auto rounded-full", getPriorityColor(a.importance_level))} />
                      <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 mx-auto w-max max-w-[260px] rounded-md border bg-white px-2 py-1 text-[11px] shadow-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0">
                        <div className="font-medium truncate">{a.title}</div>
                        <div className="flex items-center gap-1 mt-0.5 text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>Due {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
        {blocksForDate.length + assignmentsForDate.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">No tasks scheduled</p>
          </div>
        )}
      </div>
    </div>
  )
}