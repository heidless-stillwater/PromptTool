'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';

interface ReactionPickerProps {
    entryId: string;
    reactions: Record<string, string[]>; // emoji -> [userIds]
    onReact: (emoji: string, reacted: boolean) => void;
}

const COMMON_EMOJIS = ['🔥', '🚀', '🎨', '❤️', '👏'];

export default function ReactionPicker({ entryId, reactions, onReact }: ReactionPickerProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const handleReact = async (emoji: string) => {
        if (!user) {
            showToast('Please sign in to react', 'error');
            return;
        }

        setIsProcessing(emoji);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/league/react', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ entryId, emoji })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            onReact(emoji, data.reacted);
        } catch (err: any) {
            console.error('[ReactionPicker] Error:', err);
            showToast(err.message || 'Failed to react', 'error');
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {COMMON_EMOJIS.map(emoji => {
                const userIds = reactions[emoji] || [];
                const hasReacted = user ? userIds.includes(user.uid) : false;
                const count = userIds.length;

                if (count === 0 && !user) return null; // Only show if count > 0 for guests

                return (
                    <button
                        key={emoji}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleReact(emoji);
                        }}
                        disabled={!!isProcessing}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold transition-all border ${hasReacted
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-background-secondary/50 border-border hover:border-primary/50 text-foreground-muted hover:text-foreground'
                            } ${isProcessing === emoji ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        <span>{emoji}</span>
                        {count > 0 && <span className="text-xs">{count}</span>}
                    </button>
                );
            })}

            {/* Show Add button if we want to support more emojis in future, but for now we stick to common ones */}
        </div>
    );
}
