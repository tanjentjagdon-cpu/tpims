'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './theme-toggle'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

const navigation = [
    { name: 'Overview', href: '/dashboard' },
    { name: 'Products', href: '/dashboard/products' },
    { name: 'Shopee Orders', href: '/dashboard/shopee' },
    { name: 'Shopee Income Report', href: '/dashboard/shopee-income' },
    { name: 'Tiktok Orders', href: '/dashboard/tiktok' },
    { name: 'TikTok Finance', href: '/dashboard/tiktok/finance' },
    { name: 'Expenses', href: '/dashboard/expenses' },
]

export function DashboardHeader() {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background shadow-sm">
            <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-12">
                <div className="flex items-center gap-8">
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-md shadow-primary/5 overflow-hidden border border-border p-1 group-hover:scale-105 transition-transform">
                            <Image
                                src="/logo.jpg"
                                alt="TELAPHORIA Logo"
                                width={32}
                                height={32}
                                className="object-contain"
                            />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground font-serif">TELAPHORIA</span>
                    </Link>

                    <nav className="hidden md:flex items-center space-x-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                                        isActive
                                            ? "bg-secondary text-secondary-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                    )}
                                >
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-1.5 h-9 rounded-md text-sm font-semibold text-foreground hover:bg-secondary transition-colors border border-border"
                    >
                        Logout
                        <LogOut className="h-4 w-4 text-primary" />
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden border-t border-border bg-background px-4 py-2 overflow-x-auto flex space-x-4 no-scrollbar">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-secondary"
                            )}
                        >
                            {item.name}
                        </Link>
                    )
                })}
            </div>
        </header>
    )
}
