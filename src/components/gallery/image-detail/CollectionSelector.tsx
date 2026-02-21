import { Collection } from '@/lib/types';

interface CollectionSelectorProps {
    collections: Collection[];
    selectedIds: string[];
    onToggle: (collectionId: string) => void;
}

export default function CollectionSelector({ collections, selectedIds, onToggle }: CollectionSelectorProps) {
    return (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs text-primary font-bold uppercase tracking-wide block">Collections</label>
                <span className="text-[10px] text-foreground-muted">
                    {selectedIds.length} selected
                </span>
            </div>

            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                {collections.map(col => {
                    const isSelected = selectedIds.includes(col.id);
                    return (
                        <label
                            key={col.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors border ${isSelected
                                ? 'bg-primary/10 border-primary/30'
                                : 'hover:bg-background-secondary border-transparent'
                                }`}
                        >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected
                                ? 'bg-primary border-primary text-white'
                                : 'border-foreground-muted bg-background'
                                }`}>
                                {isSelected && <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className="text-sm truncate flex-1">{col.name}</span>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={isSelected}
                                onChange={() => onToggle(col.id)}
                            />
                        </label>
                    );
                })}
                {collections.length === 0 && (
                    <div className="text-xs text-foreground-muted italic text-center py-2">
                        No collections available.
                    </div>
                )}
            </div>
        </div>
    );
}
