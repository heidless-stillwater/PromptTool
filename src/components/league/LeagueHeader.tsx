
'use client';

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
        { key: 'trending', label: '🔥 Trending' },
        { key: 'newest', label: '✨ Newest' },
        { key: 'alltime', label: '👑 All Time' },
    ] as const;

    return (
        <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <span className="text-4xl">🏆</span>
                        Community League
                    </h1>
                    <p className="text-foreground-muted mt-1">
                        Vote for your favorite AI-generated images from the community
                    </p>
                </div>

                {/* Sort Tabs */}
                <div className="flex bg-background-secondary rounded-lg p-1 border border-border/50 self-start">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => onSortChange(tab.key)}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${sortMode === tab.key
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-foreground-muted hover:text-foreground'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
