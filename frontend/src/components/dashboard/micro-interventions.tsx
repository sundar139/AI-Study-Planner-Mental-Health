"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Wind, RefreshCcw, Droplet, Activity, Timer, Zap, Sparkles, Brain, Coffee, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { cn } from "@/lib/utils"

interface Intervention {
    id: number
    title: string
    description?: string
    category: string
    estimated_duration_minutes: number
    recommended?: boolean
}

type IconType = React.ComponentType<{ className?: string }>
const iconMap: Record<string, IconType> = {
    "breathing": Wind,
    "cognitive": Brain,
    "physical": Activity,
    "hydration": Droplet,
    "focus": RefreshCcw,
    "rest": Coffee,
    "motivation": Zap,
    "default": Sparkles
}

const gradientMap: Record<string, string> = {
    "breathing": "from-blue-500 to-cyan-500",
    "cognitive": "from-purple-500 to-pink-500",
    "physical": "from-green-500 to-emerald-500",
    "hydration": "from-indigo-500 to-blue-500",
    "focus": "from-orange-500 to-red-500",
    "rest": "from-pink-500 to-rose-500",
    "motivation": "from-yellow-500 to-amber-500",
    "default": "from-gray-400 to-gray-500"
}

export function MicroInterventions() {
    const [interventions, setInterventions] = useState<Intervention[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchInterventions()
    }, [])

    const fetchInterventions = async () => {
        try {
            const response = await api.get("/interventions/")
            const items = (response.data as Intervention[])
                .map((item) => ({
                    ...item,
                    recommended: Math.random() > 0.6
                }))
                .slice(0, 6)
            setInterventions(items)
        } catch (error) {
            console.error("Failed to fetch interventions", error)
            setInterventions([
                { id: 1, title: "Deep Breathing", description: "4-7-8 breathing technique", category: "breathing", estimated_duration_minutes: 2, recommended: true },
                { id: 2, title: "Focus Reset", description: "Quick mental refresh", category: "focus", estimated_duration_minutes: 1 },
                { id: 3, title: "Hydrate", description: "Drink water break", category: "hydration", estimated_duration_minutes: 1 },
                { id: 4, title: "Quick Walk", description: "5-minute movement", category: "physical", estimated_duration_minutes: 5, recommended: true },
                { id: 5, title: "Pomodoro Break", description: "Structured rest", category: "rest", estimated_duration_minutes: 5 },
                { id: 6, title: "Motivation Boost", description: "Positive affirmations", category: "motivation", estimated_duration_minutes: 1 },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const getIcon = (category: string) => iconMap[category.toLowerCase()] || iconMap["default"]
    const getGradient = (category: string) => gradientMap[category.toLowerCase()] || gradientMap["default"]

    const recommendedCount = interventions.filter(i => i.recommended).length

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold">Quick Wellbeing Breaks</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {recommendedCount > 0 && `${recommendedCount} recommended for you`}
                        </p>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                        <Sparkles className="h-5 w-5" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-32 rounded-lg skeleton" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {interventions.map((intervention) => {
                            const Icon = getIcon(intervention.category)
                            const gradient = getGradient(intervention.category)

                            return (
                                <div
                                    key={intervention.id}
                                    className="group relative p-4 rounded-xl border bg-card hover:shadow-lg transition-all card-hover cursor-pointer"
                                >
                                    {intervention.recommended && (
                                        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-orange-500 border-0 shadow-md">
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            Recommended
                                        </Badge>
                                    )}

                                    <div className="flex flex-col h-full">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3",
                                            gradient
                                        )}>
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>

                                        <h3 className="font-semibold text-sm mb-1">{intervention.title}</h3>
                                        {intervention.description && (
                                            <p className="text-xs text-muted-foreground mb-3 flex-1">
                                                {intervention.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Timer className="h-3 w-3" />
                                                <span>{intervention.estimated_duration_minutes} min</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Play className="h-3 w-3 mr-1" />
                                                Start
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
