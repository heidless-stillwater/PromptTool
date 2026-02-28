'use client';

import { Collection } from '@/lib/types';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useCollections } from '@/hooks/useCollections';

interface ManageCollectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ManageCollectionsModal({ isOpen, onClose }: ManageCollectionsModalProps) {
    const {
        collections,
        isLoading,
        isCreating,
        handleCreate,
        handleDelete,
        handleRename,
        handleTogglePrivacy
    } = useCollections();

    const [searchQuery, setSearchQuery] = useState('');
    const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all');
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionPrivacy, setNewCollectionPrivacy] = useState<'public' | 'private'>('public');

    if (!isOpen) return null;

    const filteredCollections = collections.filter((c: Collection) => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPrivacy = privacyFilter === 'all' || c.privacy === privacyFilter;
        return matchesSearch && matchesPrivacy;
    });

    const startRenaming = (col: Collection) => {
        setRenamingId(col.id);
        setRenameValue(col.name);
    };

    const submitRename = async (id: string) => {
        if (renameValue.trim() && renameValue !== collections.find((c: Collection) => c.id === id)?.name) {
            await handleRename(id, renameValue.trim());
        }
        setRenamingId(null);
    };

    const submitCreate = async () => {
        if (newCollectionName.trim()) {
            await handleCreate(newCollectionName.trim(), newCollectionPrivacy);
            setNewCollectionName('');
            setIsCreatingNew(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl overflow-hidden"
            >
                <Card className="flex flex-col max-h-[85vh] p-0 border-primary/20 shadow-2xl overflow-hidden rounded-[2.5rem] bg-[#0a0a0f]">
                    {/* Header */}
                    <div className="p-8 border-b border-border/50 bg-[#12121a]">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Icons.stack className="text-primary" />
                                    Community Collections
                                </h2>
                                <p className="text-xs text-foreground-muted font-bold uppercase tracking-widest mt-1 opacity-60">
                                    Curate and Organize Public Assets
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl hover:bg-background-secondary"
                            >
                                <Icons.close size={20} />
                            </Button>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1 group">
                                    <Icons.search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within:text-primary transition-colors" size={16} />
                                    <Input
                                        placeholder="Search folders..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-12 h-12 bg-black border-border rounded-2xl text-sm"
                                    />
                                </div>
                                <Button
                                    onClick={() => setIsCreatingNew(true)}
                                    className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2"
                                >
                                    <Icons.plus size={16} />
                                    Create New
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                {(['all', 'public', 'private'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setPrivacyFilter(f)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                                            privacyFilter === f
                                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                                : "bg-[#1a1a24] text-foreground-muted border-border/50 hover:border-primary/30"
                                        )}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 space-y-4">
                        {isCreatingNew && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#1a1a24] border border-primary/30 rounded-[2rem] p-6 mb-6"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">New Collection</label>
                                    <div className="flex bg-background/50 p-1 rounded-xl border border-primary/10">
                                        {(['public', 'private'] as const).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setNewCollectionPrivacy(p)}
                                                className={cn(
                                                    "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                                    newCollectionPrivacy === p
                                                        ? "bg-primary text-white shadow-sm"
                                                        : "text-foreground-muted hover:text-foreground"
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Input
                                        value={newCollectionName}
                                        onChange={e => setNewCollectionName(e.target.value)}
                                        placeholder="Enter collection name..."
                                        className="h-12 bg-black border-primary/30 flex-1 text-white placeholder:text-white/20"
                                        autoFocus
                                        onKeyDown={e => e.key === 'Enter' && submitCreate()}
                                    />
                                    <div className="flex gap-2">
                                        <Button onClick={submitCreate} isLoading={isCreating} className="h-12 px-8 rounded-2xl flex-1 sm:flex-none">Create Folder</Button>
                                        <Button variant="ghost" onClick={() => setIsCreatingNew(false)} className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase">Cancel</Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <Icons.spinner className="w-10 h-10 animate-spin text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Retrieving Collections</span>
                            </div>
                        ) : filteredCollections.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-border/30 rounded-[3rem] bg-[#15151e]">
                                <div className="text-4xl mb-4 opacity-20">🔍</div>
                                <h3 className="text-lg font-black uppercase tracking-tight mb-1">No Folders Found</h3>
                                <p className="text-sm text-foreground-muted">No collections match your current filter criteria.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredCollections.map((col: Collection) => (
                                    <div
                                        key={col.id}
                                        className={cn(
                                            "group relative flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300",
                                            col.privacy === 'private'
                                                ? "bg-[#1f0a0a] border-error/30 hover:border-error/50"
                                                : "bg-[#15151e] border-border hover:border-primary/40"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl border flex items-center justify-center text-xl group-hover:scale-110 transition-transform",
                                            col.privacy === 'private'
                                                ? "bg-error/5 border-error/20"
                                                : "bg-gradient-to-br from-primary/10 to-accent/10 border-border/50"
                                        )}>
                                            {col.privacy === 'private' ? '🔒' : '📁'}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {renamingId === col.id ? (
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={renameValue}
                                                        onChange={e => setRenameValue(e.target.value)}
                                                        className="h-9 text-sm font-bold bg-background/50"
                                                        autoFocus
                                                        onKeyDown={e => e.key === 'Enter' && submitRename(col.id)}
                                                    />
                                                    <Button size="sm" onClick={() => submitRename(col.id)} className="h-9 px-4 rounded-xl">Save</Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setRenamingId(null)} className="h-9 px-4 rounded-xl text-foreground-muted">Cancel</Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-sm font-black uppercase tracking-tight text-foreground truncate">{col.name}</h4>
                                                    <Badge
                                                        variant={col.privacy === 'public' ? 'success' : 'error'}
                                                        className="text-[8px] h-4 px-2 tracking-widest font-black uppercase gap-1"
                                                    >
                                                        {col.privacy === 'public' ? <Icons.globe size={8} /> : <Icons.lock size={8} />}
                                                        {col.privacy}
                                                    </Badge>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted opacity-60">{col.imageCount || 0} Images</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startRenaming(col)}
                                                className="p-2 hover:bg-primary/10 text-foreground-muted hover:text-primary rounded-xl transition-all"
                                                title="Rename"
                                            >
                                                <Icons.settings size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleTogglePrivacy(col.id, col.privacy)}
                                                className={cn(
                                                    "p-2 rounded-xl transition-all",
                                                    col.privacy === 'public'
                                                        ? "hover:bg-error/10 text-foreground-muted hover:text-error"
                                                        : "hover:bg-success/10 text-foreground-muted hover:text-success"
                                                )}
                                                title={col.privacy === 'public' ? 'Make Private' : 'Make Public'}
                                            >
                                                {col.privacy === 'public' ? <Icons.lock size={16} /> : <Icons.globe size={16} />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Destroy this collection? Images will be safe.')) {
                                                        handleDelete(col.id);
                                                    }
                                                }}
                                                className="p-2 hover:bg-error/10 text-foreground-muted hover:text-error rounded-xl transition-all"
                                                title="Delete"
                                            >
                                                <Icons.delete size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-border/50 bg-[#0f0f15] flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-60">
                            {collections.length} Total Collections
                        </p>
                        <Button variant="secondary" onClick={onClose} className="rounded-xl px-8 text-[10px] font-black uppercase tracking-widest h-11">
                            Close Manager
                        </Button>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
