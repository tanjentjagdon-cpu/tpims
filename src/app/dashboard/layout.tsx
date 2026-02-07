import { DashboardHeader } from '@/components/dashboard-header'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <DashboardHeader />
            <main className="flex-1 w-full px-4 py-8 sm:px-6 lg:px-12">
                {children}
            </main>
        </div>
    )
}
