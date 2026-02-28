'use client';

import React from 'react';
import { Icons } from '@/components/ui/Icons';
import { Modifier } from '@/app/generate/page';

interface DNAViewProps {
    activeModifiers: Modifier[];
    coreSubject: string;
    onRemoveModifier: (categoryId: string, value: string) => void;
    userLevel?: string;
    isOpen?: boolean;
    onToggle?: () => void;
}

import Tooltip from '@/components/Tooltip';

/**
 * DNA Strip: The Unified Status Bar
 * A header-integrated status bar that summarizes prompt components.
 */
export const DNAStrip: React.FC<DNAViewProps> = ({
    activeModifiers,
    coreSubject,
    onRemoveModifier,
    userLevel,
    isOpen,
    onToggle
}) => {
    return (
        <div
            onClick={onToggle}
            className="w-full flex flex-wrap items-center gap-4 py-3 px-6 bg-[#0a0a0f] border-b border-white/5 z-10 cursor-pointer hover:border-b-primary hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)] transition-all duration-300 group/dna"
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <Tooltip content="DNA HELIX: Interactive oversight of your prompt constituents. Click to expand full controls." position="top">
                    <div className="flex items-center gap-2 shrink-0 border-r border-white/10 pr-4 py-1 -ml-2 rounded-lg transition-colors group">
                        <Icons.settings size={12} className={isOpen ? "text-primary anim-pulse" : "text-primary-light"} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary-light">
                            {userLevel === 'novice' ? 'Active Modifiers' : 'DNA Helix'}
                        </span>
                        {isOpen !== undefined && (
                            <Icons.chevronDown
                                size={10}
                                className={`text-white/70 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                            />
                        )}
                    </div>
                </Tooltip>

                <div className="flex items-center gap-2 shrink-0 border-r border-white/10 pr-4">
                    <span className="text-[10px] font-black text-foreground-muted whitespace-nowrap">
                        {userLevel === 'novice' ? 'TARGET:' : 'SUBJECT:'}
                    </span>
                    <span className="text-[10px] truncate max-w-[150px] italic opacity-60">
                        &quot;{coreSubject || 'None'}&quot;
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 py-0.5 overflow-hidden">
                    {(activeModifiers as Modifier[]).map(m => (
                        <button
                            key={m.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveModifier(m.category, m.value);
                            }}
                            className="px-2 py-1 rounded-md border border-white/5 bg-white/5 hover:border-error/30 hover:bg-error/5 text-[9px] uppercase tracking-tighter flex items-center gap-2 transition-all text-foreground-muted hover:text-error whitespace-nowrap group/chip"
                        >
                            <span className="opacity-40">{m.category}:</span>
                            <span className="font-bold">{m.value}</span>
                            <Icons.close size={8} className="opacity-0 group-hover/chip:opacity-100" />
                        </button>
                    ))}

                    {activeModifiers.length === 0 && (
                        <span className="text-[9px] uppercase tracking-widest text-foreground-muted opacity-30 italic">No modifiers active</span>
                    )}
                </div>
            </div>

            {onToggle && (
                <div className="ml-auto">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/70 transition-colors">
                        [{activeModifiers.length} Components] {isOpen ? '(Collapse)' : '(Expand)'}
                    </span>
                </div>
            )}
        </div>
    );
};
