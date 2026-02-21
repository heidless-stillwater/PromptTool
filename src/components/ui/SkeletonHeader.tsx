import { cn } from "@/lib/utils"
import { Skeleton } from "./Skeleton"

interface SkeletonHeaderProps {
    className?: string;
}

export function SkeletonHeader({ className }: SkeletonHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-6 mb-12", className)}>
            <div className="flex items-center gap-3">
                <Skeleton className="w-1 h-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4 flex-1">
                    <Skeleton className="h-12 w-2/3 md:w-1/2" />
                    <Skeleton className="h-4 w-full md:w-3/4" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-24 rounded-xl" />
                    <Skeleton className="h-10 w-40 rounded-xl" />
                </div>
            </div>
        </div>
    )
}
