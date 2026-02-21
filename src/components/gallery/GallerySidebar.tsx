import { Collection } from '@/lib/types';
import { Card } from '@/components/ui/Card';
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
        <aside className="w-full lg:w-64 space-y-6">
            <Card className="p-4" variant="glass">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="font-black text-[10px] uppercase tracking-widest text-foreground-muted">Collections</h2>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onCreateCollection}
                        className="h-7 px-2 text-[9px] font-black uppercase tracking-wider gap-1.5 bg-background-secondary/50"
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
                            "w-full justify-start h-10 px-3 text-sm font-bold transition-all group",
                            !selectedCollectionId ? "shadow-lg shadow-primary/20" : "text-foreground-muted hover:text-foreground hover:bg-background-secondary/80"
                        )}
                    >
                        <Icons.grid size={16} className={cn("mr-2.5 transition-colors", !selectedCollectionId ? "text-white" : "text-foreground-muted group-hover:text-primary")} />
                        All Images
                    </Button>

                    {collections.map(col => (
                        <Button
                            key={col.id}
                            variant={selectedCollectionId === col.id ? 'primary' : 'ghost'}
                            onClick={() => onSelectCollection(col.id)}
                            className={cn(
                                "w-full justify-between h-10 px-3 text-sm font-bold transition-all group",
                                selectedCollectionId === col.id ? "shadow-lg shadow-primary/20" : "text-foreground-muted hover:text-foreground hover:bg-background-secondary/80"
                            )}
                        >
                            <span className="truncate flex items-center">
                                <Icons.history size={16} className={cn("mr-2.5 transition-colors opacity-50", selectedCollectionId === col.id ? "text-white opacity-100" : "text-foreground-muted group-hover:text-primary group-hover:opacity-100")} />
                                {col.name}
                            </span>
                            {col.imageCount > 0 && (
                                <Badge
                                    variant={selectedCollectionId === col.id ? 'glass' : 'secondary'}
                                    size="sm"
                                    className={cn(
                                        "ml-2 transition-all",
                                        selectedCollectionId === col.id ? "bg-white/20 border-white/10" : "bg-background-secondary border-transparent text-foreground-muted font-bold"
                                    )}
                                >
                                    {col.imageCount}
                                </Badge>
                            )}
                        </Button>
                    ))}
                </div>
            </Card>
        </aside>
    );
}
