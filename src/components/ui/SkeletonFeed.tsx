import { cn } from "@/lib/utils"
import { SkeletonCard } from "./SkeletonCard"

interface SkeletonFeedProps {
    count?: number;
    variant?: 'gallery' | 'dashboard';
    className?: string;
    gridClassName?: string;
}

export function SkeletonFeed({
    count = 8,
    variant = 'gallery',
    className,
    gridClassName
}: SkeletonFeedProps) {
    return (
        <div className={cn("space-y-8", className)}>
            <div className={cn(
                "grid gap-6",
                variant === 'gallery'
                    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                gridClassName
            )}>
                {Array.from({ length: count }).map((_, i) => (
                    <SkeletonCard key={i} variant={variant} />
                ))}
            </div>
        </div>
    )
}
