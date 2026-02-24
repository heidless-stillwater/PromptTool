import { useState } from 'react';
import { Collection } from '@/lib/types';
import { Icons } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface CollectionSelectorProps {
    collections: Collection[];
    selectedIds: string[];
    onToggle: (collectionId: string) => void;
}

export default function CollectionSelector({ collections, selectedIds, onToggle }: CollectionSelectorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const selectedCollections = collections.filter(c => selectedIds.includes(c.id));

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs text-foreground-muted uppercase tracking-wide font-black block">Collections</label>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                    {isEditing ? 'Close' : 'Manage'}
                    <Icons.settings size={10} className={cn(isEditing && "rotate-90", "transition-transform")} />
                </button>
            </div>

            {!isEditing ? (
                <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                    {selectedCollections.length > 0 ? (
                        selectedCollections.map(col => (
                            <Badge key={col.id} variant="secondary" className="text-[10px] py-0 px-2 h-5 bg-primary/10 text-primary border-primary/20">
                                {col.name}
                            </Badge>
                        ))
                    ) : (
                        <p className="text-[11px] text-foreground-muted italic">Not in any collection</p>
                    )}
                </div>
            ) : (
                <div className="bg-background-secondary/50 border border-border rounded-xl p-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
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
            )}
        </div>
    );
}
