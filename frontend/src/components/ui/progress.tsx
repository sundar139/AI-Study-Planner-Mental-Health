"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type ProgressProps = {
    value?: number
    className?: string
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ value = 0, className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "relative h-1 w-full overflow-hidden rounded-full bg-secondary",
                className
            )}
            {...props}
        >
            <div
                className="h-full bg-primary transition-all"
                style={{ width: `${value}%` }}
            />
        </div>
    )
)

Progress.displayName = "Progress"


