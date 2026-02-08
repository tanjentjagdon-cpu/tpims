'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get('code')
  
  useEffect(() => {
    if (code) {
      // If we land here with a code, it means the redirect URI was likely just the domain
      // Forward to the dashboard handler
      router.replace(`/dashboard/tiktok?auth_code=${code}`)
    }
  }, [code, router])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col">
        <h1 className="text-4xl font-bold text-foreground mb-8 font-serif">TELAPHORIA</h1>
        <p className="text-xl text-muted-foreground mb-12 text-center max-w-2xl font-sans">
          Welcome to your advanced inventory management system. Please log in to access your dashboard.
        </p>
        <Link href="/login">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl shadow-xl shadow-primary/20">
            Go to Login
          </Button>
        </Link>
      </div>
    </main>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}
