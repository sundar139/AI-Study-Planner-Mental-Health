"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./navbar"

export function HideableNavbar() {
  const pathname = usePathname()
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return null
  return <Navbar />
}