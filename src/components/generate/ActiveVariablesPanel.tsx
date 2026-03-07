'use client';

import React from 'react';
import { useVariables } from '@/lib/context/VariableContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icons';
import Tooltip from '@/components/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';

export interface ActiveVariablesPanelProps {
    collapsible?: boolean;
    defaultCollapsed?: boolean;
}

export const ActiveVariablesPanel: React.FC<ActiveVariablesPanelProps> = ({ collapsible = false, defaultCollapsed = false }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
    const { variables, detectedVariables, updateVariableValue, activateVariable } = useVariables();
    const activeKeys = Object.keys(variables);
    const detectedKeys = Object.keys(detectedVariables);

    console.log('ActiveVariablesPanel State:', { activeKeys, detectedKeys });

    const handleBulkActivate = () => {
        detectedKeys.forEach(key => activateVariable(key, detectedVariables[key]));
    };

    return (
        <div className="space-y-6">
            {/* Engine Status (Always Visible if panel exists) */}
            {(activeKeys.length === 0 && detectedKeys.length === 0) && (
                <div className="px-6 py-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between group grayscale hover:grayscale-0 transition-all duration-500">
                    <div className="flex items-center gap-2">
                        <Icons.settings size={12} className="text-white/20 animate-spin-slow" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Variable Engine Idle</span>
                    </div>
                    <Tooltip content="Type variables in brackets like [VAR] to activate them.">
                        <Icons.info size={10} className="text-white/10" />
                    </Tooltip>
                </div>
            )}

            {/* UNIFIED COLLAPSIBLE WRAPPER */}
            {(activeKeys.length > 0 || detectedKeys.length > 0) && (
                <div className="space-y-4">
                    {collapsible && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full flex items-center gap-3 mb-4 group cursor-pointer px-1"
                        >
                            <div className="flex items-center gap-3">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 group-hover:text-primary transition-colors leading-none">
                                    Active DNA Logic
                                </h3>
                                <span className="px-1.5 py-0.5 rounded bg-primary/5 text-primary/40 text-[7px] font-black uppercase border border-primary/10 group-hover:border-primary/20 transition-colors">
                                    {activeKeys.length + detectedKeys.length} Logic Gates
                                </span>

                                {isCollapsed && (
                                    <div className="flex items-center gap-1.5 ml-2 animate-in fade-in slide-in-from-left-2 duration-500">
                                        {Array.from(new Set([...activeKeys, ...detectedKeys])).slice(0, 3).map(key => (
                                            <span key={key} className="px-1.5 py-0.5 rounded-[4px] bg-primary/10 text-primary/60 text-[7px] font-black uppercase tracking-tighter border border-primary/10">
                                                {key}
                                            </span>
                                        ))}
                                        {Array.from(new Set([...activeKeys, ...detectedKeys])).length > 3 && (
                                            <span className="text-[7px] font-black text-primary/30 uppercase tracking-tighter">
                                                +{Array.from(new Set([...activeKeys, ...detectedKeys])).length - 3} More
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="h-px flex-1 bg-primary/10 group-hover:bg-primary/20 transition-all opacity-40" />

                            <Icons.chevronDown size={14} className={`text-primary/40 group-hover:text-primary transition-all duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`} />
                        </button>
                    )}

                    <AnimatePresence initial={false}>
                        {!isCollapsed && (
                            <motion.div
                                initial={collapsible ? { height: 0, opacity: 0 } : false}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden space-y-6"
                            >
                                {/* ACTIVE VARIABLES */}
                                {activeKeys.length > 0 && (
                                    <Card className="border-primary/20 bg-primary/5 p-6 backdrop-blur-xl overflow-hidden relative group/panel">
                                        {/* Background Glow */}
                                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none group-hover/panel:bg-primary/20 transition-all duration-1000" />

                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                                    <Icons.settings size={16} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-white leading-none">
                                                        Active DNA Architecture
                                                    </h3>
                                                    <p className="text-[9px] uppercase font-bold tracking-[0.15em] text-primary/40 mt-1.5 leading-relaxed">
                                                        Defining variables & associated literal tags
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[8px] font-black bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/40 uppercase tracking-tighter">
                                                {activeKeys.length} Logic Gates
                                            </span>
                                        </div>

                                        <div className="space-y-5">
                                            <AnimatePresence mode="popLayout">
                                                {activeKeys.map((key) => {
                                                    const variable = variables[key];
                                                    return (
                                                        <motion.div
                                                            key={key}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: 20 }}
                                                            className="space-y-2.5"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-white/60">
                                                                        {key}
                                                                    </label>
                                                                </div>
                                                                <div className="flex items-center gap-2 px-1.5 py-0.5 bg-black/40 rounded border border-white/5">
                                                                    <Icons.wand size={8} className="text-primary/40" />
                                                                    <span className="text-[7px] font-mono text-white/30 uppercase">
                                                                        {variable.source}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="relative group/input">
                                                                <Input
                                                                    value={variable.currentValue}
                                                                    onChange={(e) => updateVariableValue(key, e.target.value)}
                                                                    placeholder={variable.defaultValue || 'Enter value...'}
                                                                    className="h-11 bg-black/60 border-white/5 focus:border-primary/50 rounded-xl text-xs font-medium pl-4 pr-10 transition-all shadow-inner"
                                                                />
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/5 group-focus-within/input:text-primary/40 transition-colors">
                                                                    <Icons.settings size={14} />
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>

                                        <div className="mt-8 pt-4 border-t border-white/5">
                                            <p className="text-[8px] text-white/20 italic leading-tight">
                                                Synthesized variable overrides are injected into the neural stream at generation time.
                                            </p>
                                        </div>
                                    </Card>
                                )}

                                {/* DISCOVERY ZONE */}
                                {detectedKeys.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-6 rounded-[2rem] border border-dashed border-primary/20 bg-primary/5 backdrop-blur-md relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                        </div>

                                        <div className="flex items-center justify-between mb-5">
                                            <div className="flex items-center gap-2">
                                                <Icons.wand size={14} className="text-primary" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                                                    DNA Sequence Active
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <AnimatePresence>
                                                {detectedKeys.map((key) => (
                                                    <motion.div
                                                        key={key}
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.8, opacity: 0 }}
                                                        className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-primary/20 shadow-xl shadow-primary/5"
                                                    >
                                                        [{key}]
                                                        <Icons.check size={10} strokeWidth={3} />
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                        <p className="mt-5 text-[9px] text-white/40 font-medium leading-relaxed">
                                            New containers detected and <span className="text-primary/70">auto-stabilized</span>. Define values in the active panel above to finalize resolution.
                                        </p>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};
