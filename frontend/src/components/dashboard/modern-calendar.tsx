"use client"

import { useState, useRef } from "react"
import { ChevronLeft, ChevronRight, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface Item {
    id: number
    title: string
    due_at?: string
    start_at?: string
    importance_level?: string
    status?: string
}

interface ModernCalendarProps {
    tasks: Item[]
    selectedDate: Date
    onDateSelect: (date: Date) => void
}

export function ModernCalendar({ tasks, selectedDate, onDateSelect }: ModernCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const today = new Date()

    const days = daysInMonth(year, month)
    const firstDay = firstDayOfMonth(year, month)

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"]

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

    const getTasksForDay = (day: number) => {
        return tasks.filter(task => {
            const base = task.start_at || task.due_at
            if (!base) return false
            const taskDate = new Date(base)
            return taskDate.getDate() === day && taskDate.getMonth() === month && taskDate.getFullYear() === year
        })
    }

    const isToday = (day: number) => {
        return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
    }

    const isSelected = (day: number) => {
        return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()
    }

    const handleDateClick = (day: number) => {
        const newDate = new Date(year, month, day)
        onDateSelect(newDate)
    }

    const handleImportICS = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            const events = content.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []
            toast({ title: "Calendar Imported", description: `Found ${events.length} events` })
        }
        reader.readAsText(file)
    }

    const handleExportICS = () => {
        let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AssignWell//EN\n`
        tasks.forEach(task => {
            const dueDate = new Date(task.start_at || task.due_at || new Date())
            const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
            icsContent += `BEGIN:VEVENT\nUID:${task.id}@assignwell.app\nDTSTART:${formatDate(dueDate)}\nSUMMARY:${task.title}\nEND:VEVENT\n`
        })
        icsContent += 'END:VCALENDAR'

        const blob = new Blob([icsContent], { type: 'text/calendar' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `assignwell-${new Date().toISOString().split('T')[0]}.ics`
        link.click()
        toast({ title: "Calendar Exported", description: `Exported ${tasks.length} assignments` })
    }

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-base font-bold text-gray-900">{monthNames[month]} {year}</h3>

                <div className="flex items-center gap-1.5">
                    <input ref={fileInputRef} type="file" accept=".ics" onChange={handleImportICS} className="hidden" />
                    <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs h-7 px-2">
                        <Upload className="h-3 w-3 mr-1" />
                        Import
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleExportICS} className="text-xs h-7 px-2">
                        <Download className="h-3 w-3 mr-1" />
                        Export
                    </Button>
                    <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
                        <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7">
                        <ChevronRight className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="grid grid-cols-7 gap-0.5 mb-0.5 flex-shrink-0">
                    {dayNames.map((day, i) => (
                        <div key={i} className="text-center text-[10px] font-medium text-gray-500 h-3 flex items-center justify-center">{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-fr gap-0.5 flex-1 min-h-0">
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {Array.from({ length: days }).map((_, i) => {
                        const day = i + 1
                        const dayTasks = getTasksForDay(day)
                        const isTodayDate = isToday(day)
                        const isSelectedDate = isSelected(day)

                        return (
                            <button
                                key={day}
                                onClick={() => handleDateClick(day)}
                                className={cn(
                                    "w-full h-full min-h-0 rounded-sm flex items-center justify-center text-[10px] font-medium transition-all hover:bg-gray-100 p-0",
                                    isSelectedDate && "bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-rose-600 hover:to-orange-600 ring-1 ring-rose-300",
                                    !isSelectedDate && isTodayDate && "bg-rose-100 text-rose-600",
                                    !isSelectedDate && !isTodayDate && dayTasks.length > 0 && "bg-gray-100"
                                )}
                            >
                                {day}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
