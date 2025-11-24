"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"

interface DateTimePickerProps {
  className?: string
  value?: { date: string; time: string }
  onChange?: (next: { date: string; time: string }) => void
}

export function DateTimePicker({ className, value, onChange }: DateTimePickerProps) {
  const [date, setDate] = React.useState<string>(value?.date ?? "")
  const [time, setTime] = React.useState<string>(value?.time ?? "")

  React.useEffect(() => {
    onChange?.({ date, time })
  }, [date, time, onChange])

  const handleQuickSelect = (preset: string) => {
    const now = new Date()
    const d = new Date(now)
    if (preset === "today") d.setDate(now.getDate())
    if (preset === "tomorrow") d.setDate(now.getDate() + 1)
    const ds = d.toISOString().slice(0, 10)
    setDate(ds)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className={cn("flex items-center gap-2")}>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <div className={cn("flex items-center gap-2")}>
        <Select onValueChange={(v) => setTime(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pick time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="08:00">08:00</SelectItem>
            <SelectItem value="09:00">09:00</SelectItem>
            <SelectItem value="10:00">10:00</SelectItem>
            <SelectItem value="14:00">14:00</SelectItem>
            <SelectItem value="16:00">16:00</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => handleQuickSelect("today")}>Today</Button>
        <Button type="button" variant="outline" onClick={() => handleQuickSelect("tomorrow")}>Tomorrow</Button>
      </div>
    </div>
  )
}

export default DateTimePicker