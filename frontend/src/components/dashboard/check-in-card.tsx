"use client"

import { useRouter } from "next/navigation"
import { Smile } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CheckInCard() {
    const router = useRouter()

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                <Smile className="h-8 w-8 text-rose-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">How are you feeling?</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
                Check in to track your mood and find correlations.
            </p>

            <Button
                onClick={() => router.push("/wellbeing")}
                className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
            >
                Check-In Now
            </Button>
        </div>
    )
}
