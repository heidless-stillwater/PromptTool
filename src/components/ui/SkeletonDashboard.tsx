import { Skeleton } from "./Skeleton"
import { SkeletonHeader } from "./SkeletonHeader"
import { SkeletonFeed } from "./SkeletonFeed"
import { Card } from "./Card"

export function SkeletonDashboard() {
    return (
        <div className="min-h-screen">
            <div className="h-16 border-b border-border bg-background-secondary/50 flex items-center px-6 justify-between">
                <Skeleton className="h-8 w-40" />
                <div className="flex gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
                <div className="space-y-4">
                    <Skeleton className="h-12 w-1/3" />
                    <Skeleton className="h-6 w-1/2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="p-6">
                            <Skeleton className="h-4 w-24 mb-4" />
                            <Skeleton className="h-8 w-16" />
                        </Card>
                    ))}
                </div>

                <div className="flex gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-32 rounded-xl" />
                    ))}
                </div>

                <div className="space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <SkeletonFeed count={3} variant="dashboard" />
                </div>
            </main>
        </div>
    )
}
