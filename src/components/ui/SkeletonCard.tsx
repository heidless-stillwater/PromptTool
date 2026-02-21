import { cn } from "@/lib/utils"
import { Skeleton } from "./Skeleton"
import { Card } from "./Card"

interface SkeletonCardProps {
    variant?: 'gallery' | 'dashboard';
    className?: string;
}

export function SkeletonCard({ variant = 'gallery', className }: SkeletonCardProps) {
    if (variant === 'gallery') {
        return (
            <div className={cn("relative aspect-square rounded-xl overflow-hidden bg-white/5 animate-pulse", className)}>
                <Skeleton className="absolute inset-0 rounded-none" />
                <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
        )
    }

    return (
        <Card variant="default" className={cn("overflow-hidden border-border/50", className)}>
            <div className="aspect-[4/3] relative">
                <Skeleton className="absolute inset-0 rounded-none" />
            </div>
            <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
            </div>
        </Card>
    )
}
