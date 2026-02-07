'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const isDark = theme === 'dark'

    return (
        <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={cn(
                "relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-300 focus:outline-none",
                isDark ? "bg-secondary border-border border" : "bg-secondary border-border border"
            )}
            aria-label="Toggle theme"
        >
            <div
                className={cn(
                    "absolute flex h-4 w-4 items-center justify-center rounded-full transition-all duration-300 transform",
                    isDark
                        ? "translate-x-5 bg-primary text-primary-foreground"
                        : "translate-x-0.5 bg-white text-muted-foreground shadow-sm"
                )}
            >
                {isDark ? (
                    <Moon className="h-2.5 w-2.5" fill="currentColor" />
                ) : (
                    <Sun className="h-2.5 w-2.5" />
                )}
            </div>

            {/* Background icons (optional, based on design) */}
            <div className="flex w-full justify-between items-center px-2 pointer-events-none opacity-20">
                {!isDark && <Moon className="h-3 w-3 text-gray-400 ml-auto" />}
                {isDark && <Sun className="h-3 w-3 text-amber-500 mr-auto" />}
            </div>
        </button>
    )
}
