"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { BrainCircuit, TrendingUp, AlertCircle, ArrowRight } from "lucide-react"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth"

const productivityData = [
    { time: "8am", value: 30 },
    { time: "10am", value: 80 },
    { time: "12pm", value: 60 },
    { time: "2pm", value: 90 },
    { time: "4pm", value: 70 },
    { time: "6pm", value: 40 },
    { time: "8pm", value: 20 },
]

export function InsightsCharts() {
    const [moodInsight, setMoodInsight] = useState("Analyze your mood patterns to see insights here.")
    const token = useAuthStore(state => state.token)

    useEffect(() => {
        const fetchInsight = async () => {
            if (!token) return
            try {
                const res = await api.post("/ai/analyze-mood")
                if (res.data && res.data.insight) {
                    setMoodInsight(res.data.insight)
                }
            } catch {
            }
        }
        fetchInsight()
    }, [token])

    return (
        <div className="grid grid-rows-[1.5fr_1fr] gap-4 h-full min-h-0">
            {/* Top: Productivity Chart */}
            <Card className="border-none shadow-md flex flex-col overflow-hidden">
                <CardHeader className="pb-2 shrink-0">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Productivity Patterns
                    </CardTitle>
                    <CardDescription>Your focus peaks around 2 PM daily.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 pb-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productivityData}>
                            <XAxis
                                dataKey="time"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}%`}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {productivityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.value > 75 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} opacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Bottom: Insight Cards List */}
            <div className="grid grid-cols-2 gap-3 min-h-0">
                {/* Mood Insight */}
                <Card className="border-none shadow-sm bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer group">
                    <CardContent className="p-4 flex flex-col h-full justify-between">
                        <div className="flex items-start justify-between">
                            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                                <BrainCircuit className="h-4 w-4" />
                            </div>
                            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="mt-2">
                            <h4 className="font-semibold text-sm text-indigo-900 dark:text-indigo-100">Mood Correlation</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {moodInsight}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Stress Predictor */}
                <Card className="border-none shadow-sm bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors cursor-pointer group">
                    <CardContent className="p-4 flex flex-col h-full justify-between">
                        <div className="flex items-start justify-between">
                            <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
                                <AlertCircle className="h-4 w-4" />
                            </div>
                            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="mt-2">
                            <h4 className="font-semibold text-sm text-orange-900 dark:text-orange-100">Stress Predictor</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                High workload detected on Thursday. Consider a lighter schedule.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
