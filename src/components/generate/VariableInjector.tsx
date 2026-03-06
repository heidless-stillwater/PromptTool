'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Icons } from '../ui/Icons';
import { useVariables } from '@/lib/context/VariableContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Tooltip from '../Tooltip';

interface VariableInjectorProps {
    onInject: (name: string) => void;
    className?: string;
}

export const VariableInjector: React.FC<VariableInjectorProps> = ({ onInject, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const { variables, detectedVariables, registerVariable } = useVariables();
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Combine all unique variable names
    const allVarNames = Array.from(new Set([
        ...Object.keys(variables),
        ...Object.keys(detectedVariables)
    ])).sort();

    const filtered = allVarNames.filter(name =>
        name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (name: string) => {
        onInject(name);
        setIsOpen(false);
        setSearch('');
    };

    const handleCreate = () => {
        const name = search.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (!name) return;

        // If not already in registry, register it
        if (!variables[name]) {
            registerVariable({ name });
        }

        handleSelect(name);
    };

    const [alignment, setAlignment] = useState<'left' | 'right'>('right');

    const updateAlignment = useCallback(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const spaceOnRight = window.innerWidth - rect.right;
        const spaceOnLeft = rect.left;

        // If we're using right-0 (menu expands left), we need at least 288px on the left
        // If we're using left-0 (menu expands right), we need at least 288px on the right
        if (spaceOnLeft < 300) {
            setAlignment('left');
        } else {
            setAlignment('right');
        }
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            updateAlignment();
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', updateAlignment);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updateAlignment);
        };
    }, [isOpen, updateAlignment]);

    return (
        <div className={cn("relative inline-block", className)} ref={menuRef}>
            <Tooltip content="Injection Core: Add or Define Variables">
                <button
                    type="button"
                    className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center hover:bg-primary/20 transition-all group active:scale-95"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Icons.plus size={14} strokeWidth={3} className={cn("transition-transform duration-300", isOpen && "rotate-45")} />
                </button>
            </Tooltip>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 8, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={cn(
                            "absolute top-full z-[100] w-72 p-4 rounded-2xl bg-[#0a0a0f]/95 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl",
                            alignment === 'right' ? "right-0" : "left-0"
                        )}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-light">Neural Select</h4>
                                <span className="text-[8px] font-mono text-white/20">REGISTRY: {allVarNames.length}</span>
                            </div>

                            <div className="relative">
                                <Icons.search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreate();
                                        if (e.key === 'Escape') setIsOpen(false);
                                    }}
                                    placeholder="SEARCH OR DEFINE..."
                                    className="w-full bg-black/60 border border-white/5 rounded-xl py-2.5 pl-10 pr-3 text-[10px] uppercase font-black tracking-widest text-white outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                                />
                            </div>

                            <div className="max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                                {filtered.length > 0 ? (
                                    filtered.map(name => (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => handleSelect(name)}
                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 text-white/40 hover:text-white border border-transparent hover:border-primary/10 transition-all group text-left"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-wider">[{name}]</span>
                                                {variables[name]?.currentValue && (
                                                    <span className="text-[8px] text-primary/40 truncate max-w-[150px]">{variables[name].currentValue}</span>
                                                )}
                                            </div>
                                            <Icons.chevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                                        </button>
                                    ))
                                ) : search.trim() === '' ? (
                                    <div className="py-8 text-center border border-dashed border-white/5 rounded-xl">
                                        <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest">No Active Variables</p>
                                    </div>
                                ) : null}
                            </div>

                            {search.trim() && !allVarNames.find(n => n.toUpperCase() === search.toUpperCase()) && (
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    className="w-full py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                                >
                                    <Icons.plus size={12} strokeWidth={4} />
                                    Define [{search.toUpperCase()}]
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
