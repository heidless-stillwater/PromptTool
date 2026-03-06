'use client';

import React from 'react';
import { Icons } from '@/components/ui/Icons';
import { Modifier } from '@/app/generate/page';
import Tooltip from '@/components/Tooltip';

interface DNAViewProps {
    activeModifiers: Modifier[];
    coreSubject: string;
    onRemoveModifier: (categoryId: string, value: string) => void;
    userLevel?: string;
    isOpen?: boolean;
    onToggle?: () => void;
    synthesisRequired?: boolean;
    isDnaModified?: boolean;
    onClearAll?: () => void;
    onReset?: () => void;
    onOpenStyles?: () => void;
    canReset?: boolean;
}

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
    onToggle,
    synthesisRequired,
    isDnaModified,
    onClearAll,
    onReset,
    onOpenStyles,
    canReset
}) => {
    return (
        <div
            className="w-full z-10 flex flex-wrap items-center gap-4 py-3 px-6 bg-[#0a0a0f] border-b border-white/5 hover:border-b-primary hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)] transition-all duration-300 group/dna"
        >
            <div className="flex flex-wrap items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
                <Tooltip content="DNA HELIX: Interactive oversight of your prompt constituents. Click to expand full controls." position="top">
                    <div className="flex items-center gap-2 shrink-0 border-r border-white/10 pr-4 py-1 -ml-2 rounded-lg transition-colors group">
                        <Icons.settings size={12} className={isOpen ? "text-primary anim-pulse" : "text-primary-light"} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary-light">
                            {userLevel === 'novice' ? 'Active Modifiers' : 'DNA Helix'}
                        </span>
                        {isDnaModified ? (
                            <span className="px-1.5 py-0.5 rounded-sm bg-purple-500/20 text-purple-400 text-[7px] font-black uppercase border border-purple-500/20 animate-pulse shrink-0">
                                Synthesis Required
                            </span>
                        ) : synthesisRequired && (
                            <span className="px-1.5 py-0.5 rounded-sm bg-white/10 text-white/50 text-[7px] font-black uppercase border border-white/10 shrink-0">
                                Synthesis Pending
                            </span>
                        )}
                        {isOpen !== undefined && (
                            <Icons.chevronDown
                                size={10}
                                className={`text-white/70 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                            />
                        )}
                    </div>
                </Tooltip>

                <div className="flex items-center gap-2 min-w-0 max-w-[300px]">
                    <span className="text-[10px] font-black text-foreground-muted whitespace-nowrap shrink-0">
                        {userLevel === 'novice' ? 'TARGET:' : 'SUBJECT:'}
                    </span>
                    <span className="text-[10px] italic opacity-60 text-white font-medium truncate" title={coreSubject || 'None'}>
                        &quot;{coreSubject || 'None'}&quot;
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 py-0.5 w-full max-h-[52px] overflow-hidden">
                    {(activeModifiers as Modifier[]).slice(0, 12).map(m => (
                        <button
                            key={m.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveModifier(m.category, m.value);
                            }}
                            className="px-2 py-1 rounded-md border border-white/5 bg-white/5 hover:border-error/30 hover:bg-error/5 text-[9px] uppercase flex items-center gap-2 transition-all text-foreground-muted hover:text-error whitespace-nowrap group/chip"
                        >
                            <span className="opacity-40">{m.category}:</span>
                            <span className="font-bold">{m.value}</span>
                            <Icons.close size={8} className="opacity-0 group-hover/chip:opacity-100" />
                        </button>
                    ))}

                    {activeModifiers.length > 12 && (
                        <div
                            className="px-2 py-1 rounded-md border border-primary/20 bg-primary/5 text-[8px] font-black text-primary-light uppercase whitespace-nowrap shrink-0"
                            title={activeModifiers.slice(12).map(m => `${m.category}: ${m.value}`).join(', ')}
                        >
                            +{activeModifiers.length - 12} more active
                        </div>
                    )}

                    {activeModifiers.length === 0 && (
                        <span className="text-[9px] uppercase tracking-widest text-foreground-muted opacity-30 italic">No modifiers active</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 ml-auto shrink-0">
                <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/5 gap-1">
                    {onOpenStyles && (
                        <Tooltip content="Explore Visual Presets & Styles">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenStyles();
                                }}
                                className="h-7 w-7 rounded-md flex items-center justify-center text-white/40 hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
                            >
                                <Icons.grid size={12} />
                            </button>
                        </Tooltip>
                    )}

                    {onReset && (
                        <Tooltip content="Reset to Original Template Values">
                            <button
                                disabled={!canReset}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReset();
                                }}
                                className="h-7 w-7 rounded-md flex items-center justify-center text-white/40 hover:text-primary hover:bg-primary/10 disabled:opacity-20 disabled:pointer-events-none transition-all"
                            >
                                <Icons.refresh size={12} />
                            </button>
                        </Tooltip>
                    )}

                    {onClearAll && (
                        <Tooltip content="Clear All DNA Entries (Unset Active Modifiers)">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClearAll();
                                }}
                                className="h-7 w-7 rounded-md flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
                            >
                                <Icons.trash size={12} />
                            </button>
                        </Tooltip>
                    )}
                </div>

                {onToggle && (
                    <div className="px-3 border-l border-white/10 flex flex-col items-end">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/70 transition-colors">
                            [{activeModifiers.length} Components]
                        </span>
                        <span className="text-[7px] font-bold uppercase tracking-widest text-white/30">
                            {isOpen ? 'Collapse Helix' : 'Expand Helix'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
