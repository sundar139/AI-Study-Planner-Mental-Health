
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/api"

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        email: "",
        full_name: "",
        password: "",
        confirmPassword: "",
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match")
            setIsLoading(false)
            return
        }

        try {
            await api.post("/users/", {
                email: formData.email,
                full_name: formData.full_name,
                password: formData.password,
            })

            // Redirect to login on success
            router.push("/login")
        } catch (err) {
            const resp = (err as { response?: { data?: unknown } }).response
            const detail = resp && typeof resp.data === "object" && resp.data && "detail" in (resp.data as Record<string, unknown>)
                ? (resp.data as Record<string, unknown>).detail
                : undefined
            setError(typeof detail === "string" ? detail : "Registration failed")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Create an Account</CardTitle>
                    <CardDescription>Enter your details to get started.</CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                    <CardContent>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" type="button" onClick={() => router.push("/login")}>Login</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Creating..." : "Create Account"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
