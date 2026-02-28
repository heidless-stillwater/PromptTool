'use client';

import React from 'react';
import { Icons } from '@/components/ui/Icons';
import { Modifier } from '@/app/generate/page';

interface DNAViewProps {
    activeModifiers: Modifier[];
    coreSubject: string;
    onRemoveModifier: (categoryId: string, value: string) => void;
    userLevel?: string;
}

import Tooltip from '@/components/Tooltip';

/**
 * DNA Strip: The Unified Status Bar
 * A condensed, high-density horizontal bar pinned to the top of the modifier section.
 * Standardized across all user levels for maximum visibility and minimal distraction.
 */
export const DNAStrip: React.FC<DNAViewProps> = ({ activeModifiers, coreSubject, onRemoveModifier, userLevel }) => {
    return (
        <div className="w-full flex flex-wrap items-center gap-4 py-3 px-4 rounded-xl bg-[#0a0a0f] border border-white/5 sticky top-20 z-40 animate-in fade-in slide-in-from-top-4 duration-300">
            <Tooltip content="DNA HELIX: Immediate oversight of your prompt constituents. Prune elements to refine results." position="top">
                <div className="flex items-center gap-2 shrink-0 border-r border-white/10 pr-4 cursor-help">
                    <Icons.settings size={12} className="text-primary-light" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary-light">
                        {userLevel === 'novice' ? 'Active Modifiers' : 'DNA Helix'}
                    </span>
                </div>
            </Tooltip>

            <div className="flex items-center gap-2 shrink-0 border-r border-white/10 pr-4">
                <span className="text-[10px] font-black text-foreground-muted whitespace-nowrap">
                    {userLevel === 'novice' ? 'TARGET:' : 'SUBJECT:'}
                </span>
                <span className="text-[10px] truncate max-w-[200px] italic opacity-60">
                    &quot;{coreSubject || 'None'}&quot;
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                {(activeModifiers as Modifier[]).map(m => (
                    <button
                        key={m.id}
                        onClick={() => onRemoveModifier(m.category, m.value)}
                        className="px-2 py-1 rounded-md border border-white/5 bg-white/5 hover:border-error/30 hover:bg-error/5 text-[9px] uppercase tracking-tighter flex items-center gap-2 transition-all text-foreground-muted hover:text-error whitespace-nowrap group"
                    >
                        <span className="opacity-40">{m.category}:</span>
                        <span className="font-bold">{m.value}</span>
                        <Icons.close size={8} className="opacity-0 group-hover:opacity-100" />
                    </button>
                ))}

                {activeModifiers.length === 0 && (
                    <span className="text-[9px] uppercase tracking-widest text-foreground-muted opacity-30 italic">No modifiers active</span>
                )}
            </div>
        </div>
    );
};
