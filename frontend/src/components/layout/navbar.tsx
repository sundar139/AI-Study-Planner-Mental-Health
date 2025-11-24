"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Bell, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<Array<{ id: string; title: string; body: string; ts: number; read: boolean }>>([])

    const readItems = () => {
        try {
            const raw = typeof window !== 'undefined' ? window.localStorage.getItem('assignwell.notifications') : null
            const arr = raw ? (JSON.parse(raw) as Array<{ id: string; title: string; body: string; ts: number; read: boolean }>) : []
            return arr.sort((a, b) => b.ts - a.ts)
        } catch { return [] }
    }
    const writeItems = (arr: Array<{ id: string; title: string; body: string; ts: number; read: boolean }>) => {
        try { if (typeof window !== 'undefined') window.localStorage.setItem('assignwell.notifications', JSON.stringify(arr)) } catch {}
    }
    const markAllRead = () => {
        const next = items.map(i => ({ ...i, read: true }))
        setItems(next)
        writeItems(next)
    }
    const markRead = (id: string) => {
        const next = items.map(i => i.id === id ? { ...i, read: true } : i)
        setItems(next)
        writeItems(next)
    }
    useEffect(() => {
        setTimeout(() => setItems(readItems()), 0)
        const handler = () => setItems(readItems())
        window.addEventListener('assignwell.notification', handler as EventListener)
        return () => window.removeEventListener('assignwell.notification', handler as EventListener)
    }, [])

    const navLinks = [
        { href: "/", label: "Dashboard" },
        { href: "/assignments", label: "Assignments" },
        { href: "/wellbeing", label: "Well-Being" },
        { href: "/goals", label: "Goals" },
    ]
    

    const handleLogout = () => {
        try {
            if (typeof document !== 'undefined') document.cookie = 'assignwell_token=; Max-Age=0; path=/'
            if (typeof window !== 'undefined') window.localStorage.removeItem('auth-storage')
        } catch {}
        router.replace("/login")
    }

    return (
        <nav className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
                {/* Left: Logo + Nav Links */}
                <div className="flex items-center gap-8">
                    {/* AssignWell Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">A</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">AssignWell</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                prefetch={false}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    pathname === link.href
                                        ? "text-blue-600 bg-blue-50"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right: Notifications, User Avatar */}
                <div className="flex items-center gap-3">
                    {/* Notifications */}
                    <DropdownMenu open={open} onOpenChange={setOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-gray-600 hover:text-gray-900 relative"
                                onClick={() => setOpen(!open)}
                            >
                                <Bell className="h-5 w-5" />
                                {items.some(i => !i.read) && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={8} className="w-96">
                            <div className="px-2 py-2 flex items-center justify-between">
                                <span className="text-sm font-medium">Notifications</span>
                                <button className="text-xs text-blue-600 hover:underline" onClick={markAllRead}>Mark all read</button>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto">
                                {items.length === 0 ? (
                                    <div className="p-4 text-sm text-muted-foreground">No notifications</div>
                                ) : (
                                    items.map((n) => (
                                        <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-2" onClick={() => markRead(n.id)}>
                                            <div className="flex items-center gap-2 w-full">
                                                {!n.read && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
                                                <span className="text-xs text-gray-500 flex-1 text-right">{new Date(n.ts).toLocaleString()}</span>
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">{n.title}</div>
                                            <div className="text-xs text-gray-700">{n.body}</div>
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* User Avatar Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                                    <User className="h-5 w-5" />
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 z-[60]">
                            <DropdownMenuItem onClick={() => router.push("/profile")}>
                                Profile Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/peer-support")}>Peer Support</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    )
}
