'use client';

import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';

export type SortMode = 'trending' | 'newest' | 'alltime';

interface LeagueHeaderProps {
    sortMode: SortMode;
    onSortChange: (mode: SortMode) => void;
}

export default function LeagueHeader({
    sortMode,
    onSortChange
}: LeagueHeaderProps) {
    const tabs = [
        { key: 'trending', label: 'Trending', icon: <Icons.zap size={16} className="text-orange-400" /> },
        { key: 'newest', label: 'Newest', icon: <Icons.sparkles size={16} className="text-blue-400" /> },
        { key: 'alltime', label: 'All Time', icon: <Icons.trophy size={16} className="text-yellow-400" /> },
    ] as const;

    return (
        <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Icons.trophy className="text-yellow-400 w-8 h-8" />
                        Community League
                    </h1>
                    <p className="text-foreground-muted mt-1">
                        Vote for your favorite AI-generated images from the community
                    </p>
                </div>

                {/* Sort Tabs */}
                <div className="flex bg-background-secondary rounded-xl p-1 border border-border/50 self-start shadow-inner">
                    {tabs.map(tab => (
                        <Button
                            key={tab.key}
                            variant={sortMode === tab.key ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => onSortChange(tab.key)}
                            className={`rounded-lg gap-2 ${sortMode !== tab.key ? 'text-foreground-muted hover:text-foreground' : ''}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
