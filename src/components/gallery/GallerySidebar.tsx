import { Collection } from '@/lib/types';

interface GallerySidebarProps {
    collections: Collection[];
    selectedCollectionId: string | null;
    onSelectCollection: (id: string | null) => void;
    onCreateCollection: () => void;
}

export default function GallerySidebar({
    collections,
    selectedCollectionId,
    onSelectCollection,
    onCreateCollection
}: GallerySidebarProps) {
    return (
        <aside className="w-full lg:w-64 space-y-6">
            <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg">Collections</h2>
                    <button
                        onClick={onCreateCollection}
                        className="p-1 px-2 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-lg font-bold transition-all"
                    >
                        + New
                    </button>
                </div>

                <div className="space-y-1">
                    <button
                        onClick={() => onSelectCollection(null)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${!selectedCollectionId ? 'bg-primary text-white font-bold' : 'hover:bg-background-secondary text-foreground-muted hover:text-foreground'}`}
                    >
                        All Images
                    </button>
                    {collections.map(col => (
                        <button
                            key={col.id}
                            onClick={() => onSelectCollection(col.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${selectedCollectionId === col.id ? 'bg-primary text-white font-bold' : 'hover:bg-background-secondary text-foreground-muted hover:text-foreground'}`}
                        >
                            <span className="truncate">{col.name}</span>
                            {col.imageCount > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCollectionId === col.id ? 'bg-white/20' : 'bg-background-secondary'}`}>
                                    {col.imageCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}
