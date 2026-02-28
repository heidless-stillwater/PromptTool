import { Collection } from '@/lib/types';

import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

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
        <aside className="w-full lg:w-64 space-y-6 flex-shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[10px] uppercase tracking-widest text-primary font-black block">Collections</h2>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onCreateCollection}
                        className="h-7 px-2 text-[9px] font-black uppercase tracking-wider gap-1.5 bg-white/5 hover:bg-white/10 border-white/5 rounded-lg"
                    >
                        <Icons.plus size={10} />
                        New
                    </Button>
                </div>

                <div className="space-y-1">
                    <Button
                        variant={!selectedCollectionId ? 'primary' : 'ghost'}
                        onClick={() => onSelectCollection(null)}
                        className={cn(
                            "w-full justify-start h-10 px-3 text-sm font-bold transition-all group rounded-xl",
                            !selectedCollectionId ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground-muted hover:text-foreground hover:bg-white/5 border border-transparent"
                        )}
                    >
                        <Icons.grid size={16} className={cn("mr-2.5 transition-colors", !selectedCollectionId ? "text-primary" : "text-foreground-muted group-hover:text-primary")} />
                        All Images
                    </Button>

                    {collections.map(col => (
                        <Button
                            key={col.id}
                            variant={selectedCollectionId === col.id ? 'primary' : 'ghost'}
                            onClick={() => onSelectCollection(col.id)}
                            className={cn(
                                "w-full justify-between h-10 px-3 text-sm font-bold transition-all group rounded-xl",
                                selectedCollectionId === col.id ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground-muted hover:text-white hover:bg-white/5 border border-transparent"
                            )}
                        >
                            <span className="truncate flex items-center">
                                <Icons.history size={16} className={cn("mr-2.5 transition-colors opacity-50", selectedCollectionId === col.id ? "text-primary opacity-100" : "text-foreground-muted group-hover:text-primary group-hover:opacity-100")} />
                                {col.name}
                            </span>
                            {col.imageCount > 0 && (
                                <Badge
                                    variant="secondary"
                                    size="sm"
                                    className={cn(
                                        "ml-2 transition-all",
                                        selectedCollectionId === col.id ? "bg-primary/20 text-primary border-primary/30 font-bold" : "bg-white/5 border-transparent text-foreground-muted font-bold"
                                    )}
                                >
                                    {col.imageCount}
                                </Badge>
                            )}
                        </Button>
                    ))}
                </div>
            </div>
        </aside >
    );
}
