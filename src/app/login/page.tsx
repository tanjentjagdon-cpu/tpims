import { LoginForm } from '@/components/login-form'
import Image from 'next/image'

export default function LoginPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
            <div className="absolute inset-0 bg-grid-amber-500/[0.03] pointer-events-none"></div>
            <div className="z-10 w-full max-w-sm">
                <div className="mb-8 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-xl shadow-primary/10 mb-6 overflow-hidden border border-border p-2">
                        <Image
                            src="/logo.jpg"
                            alt="TELAPHORIA Logo"
                            width={64}
                            height={64}
                            className="object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-serif">TELAPHORIA</h1>
                    <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Inventory Management System</p>
                </div>
                <LoginForm />
            </div>
        </main>
    )
}
