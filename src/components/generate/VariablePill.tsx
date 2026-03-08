'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useVariables } from '@/lib/context/VariableContext';
import { Input } from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icons';
import { AnimatePresence, motion } from 'framer-motion';

interface VariablePillProps {
    name: string;
    originalMatch: string;
}

export const VariablePill: React.FC<VariablePillProps> = ({ name, originalMatch }) => {
    const { variables, detectedVariables, updateVariableValue, activateVariable, removeVariable, registerVariable } = useVariables();
    const variable = variables[name.toUpperCase()];
    const isDetected = !!detectedVariables[name.toUpperCase()];
    const [isEditing, setIsEditing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsEditing(false);
            }
        };
        if (isEditing) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isEditing]);

    if (!variable && !isDetected) {
        const formattedText = originalMatch.replace(/^\[([^:]+)(:.*)?\]$/, (match, p1, p2) => `[${p1.toUpperCase()}${p2 || ''}]`);
        return <span className="text-white/40">{formattedText}</span>;
    }

    // Ghost state for detected but not active
    if (!variable && isDetected) {
        return (
            <button
                onClick={() => activateVariable(name, detectedVariables[name.toUpperCase()])}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-md border border-dashed border-white/20 text-white/40 hover:border-primary/50 hover:text-primary transition-all text-[10px] font-black uppercase tracking-wider animate-in fade-in"
            >
                <Icons.plus size={8} />
                {name.toUpperCase()}
                <span className="text-white/20 font-mono text-[8px] lowercase">: activate</span>
            </button>
        );
    }

    return (
        <div className="relative inline-block" ref={containerRef}>
            <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all text-[10px] font-black uppercase tracking-wider animate-in fade-in zoom-in-95 group"
            >
                <Icons.wand size={8} className={`transition-transform duration-500 ${isEditing ? 'rotate-180' : ''}`} />
                {variable.name.toUpperCase()}
                <span className="text-white/40 font-mono text-[8px] lowercase">: {variable.currentValue || 'empty'}</span>
            </button>

            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 p-4 bg-black/95 backdrop-blur-2xl border border-primary/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(99,102,241,0.2)] z-[10000]"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Edit Variable</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            removeVariable(name);
                                            setIsEditing(false);
                                        }}
                                        className="p-1 hover:bg-red-500/20 text-red-400 rounded-md transition-colors"
                                        title="Delete variable"
                                    >
                                        <Icons.trash size={10} />
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="p-1 hover:bg-white/10 text-white/40 rounded-md transition-colors"
                                    >
                                        <Icons.close size={10} />
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <Input
                                    autoFocus
                                    value={variable.currentValue}
                                    onChange={(e) => updateVariableValue(name, e.target.value)}
                                    placeholder="Enter value..."
                                    className="h-10 bg-white/5 border-white/10 text-xs rounded-xl focus:border-primary/40 focus:ring-primary/10"
                                    onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/10">
                                    <Icons.settings size={12} />
                                </div>
                            </div>

                            <div className="flex justify-between items-center py-1 mt-1 border-t border-white/5 gap-2">
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Default</span>
                                    <span className="text-[8px] text-white/40 truncate">{variable.defaultValue || 'Inherited'}</span>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-3 py-1 bg-white/5 text-white/60 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10 transition-all border border-white/5"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => {
                                            registerVariable({ name, defaultValue: variable.currentValue });
                                            setIsEditing(false);
                                        }}
                                        className="px-2 py-1 bg-white/5 text-white/40 text-[7px] font-black uppercase tracking-widest rounded hover:text-primary transition-all"
                                    >
                                        Set Default
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-3 py-1 bg-primary text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:brightness-110 active:scale-95 transition-all"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Arrow */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-black/95" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
