
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Mail, Lock } from "lucide-react"
import { useAuthStore } from "@/store/auth"
import api from "@/lib/api"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [remember, setRemember] = useState<boolean>(false)
    const [showPassword, setShowPassword] = useState<boolean>(false)
    const router = useRouter()
    const { setToken, setUser } = useAuthStore()

    useEffect(() => {
        try {
            const savedEmail = typeof window !== 'undefined' ? window.localStorage.getItem('savedEmail') : null
            const savedRemember = typeof window !== 'undefined' ? window.localStorage.getItem('rememberLogin') : null
            if (savedEmail) setEmail(savedEmail)
            if (savedRemember) setRemember(savedRemember === 'true')
        } catch {}
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const formData = new FormData()
            formData.append("username", email)
            formData.append("password", password)

            const response = await api.post("/auth/login/access-token", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            })

            const { access_token } = response.data
            setToken(access_token)
            try { window.localStorage.setItem("loginAt", String(Date.now())) } catch {}
            try {
                if (remember) {
                    window.localStorage.setItem('savedEmail', email)
                    window.localStorage.setItem('rememberLogin', 'true')
                } else {
                    window.localStorage.removeItem('savedEmail')
                    window.localStorage.removeItem('rememberLogin')
                }
            } catch {}

            // Fetch user details
            const userResponse = await api.get("/users/me", {
                headers: { Authorization: `Bearer ${access_token}` },
            })
            setUser(userResponse.data)

            router.replace("/")
        } catch {
            setError("Invalid email or password")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-100 via-amber-100 to-orange-50" />
            <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-rose-400/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-orange-400/30 blur-3xl" />
            <div className="relative flex min-h-screen items-center justify-center px-4">
                <Card className="w-full max-w-md shadow-2xl border-rose-200/60 glass">
                    <CardHeader className="text-center space-y-2">
                        <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white shadow-md">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">AssignWell Companion</CardTitle>
                        <CardDescription className="text-sm">Welcome back — sign in to continue</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                                    <Input
                                        id="email"
                                        name="username"
                                        type="email"
                                        placeholder="name@example.com"
                                        autoComplete="username"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="pl-9"
                                        />
                                    </div>
                                    <Button type="button" variant="outline" onClick={() => setShowPassword(v => !v)} className="whitespace-nowrap">
                                        {showPassword ? "Hide" : "Show"}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                                    Remember me
                                </label>
                                <div className="text-xs text-muted-foreground">Use your browser to save passwords</div>
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" type="button" onClick={() => router.push("/register")}>Create Account</Button>
                            <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-md">
                                {isLoading ? "Signing In..." : "Sign In"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}
