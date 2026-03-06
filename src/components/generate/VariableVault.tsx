'use client';

import React, { useState } from 'react';
import { useVariables } from '@/lib/context/VariableContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';

export const VariableVault: React.FC = () => {
    const { variables, detectedVariables, registerVariable, activateVariable, updateVariableValue, clearVariables, removeVariable } = useVariables();
    const [newName, setNewName] = useState('');
    const [newValue, setNewValue] = useState('');
    const detectedKeys = Object.keys(detectedVariables);

    const handleAdd = () => {
        if (!newName.trim()) return;
        registerVariable({
            name: newName,
            defaultValue: newValue,
            currentValue: newValue,
            source: 'registry'
        });
        setNewName('');
        setNewValue('');
    };

    return (
        <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-widest text-white leading-none">
                        Variable Vault
                    </h2>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-3">
                        Register global DNA constants for your prompt architecture.
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearVariables}
                    className="text-[9px] font-black uppercase tracking-widest text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
                >
                    Wipe Registry
                </Button>
            </div>

            {/* Discovery Zone (If empty and prompt has vars) */}
            {detectedKeys.length > 0 && (
                <div className="p-6 rounded-3xl border border-dashed border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-4">
                        <Icons.wand size={14} className="text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            Detected in Active Prompt
                        </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <AnimatePresence>
                            {detectedKeys.map((key) => (
                                <motion.button
                                    key={key}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    onClick={() => activateVariable(key, detectedVariables[key])}
                                    className="px-3 py-1.5 rounded-xl bg-primary text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Register [{key}]
                                    <Icons.plus size={10} strokeWidth={3} />
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Add New Variable */}
            <Card className="border-white/5 bg-white/5 p-6 backdrop-blur-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                            Variable Name
                        </label>
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. LIGHTING"
                            className="h-10 bg-black/40 border-white/5 focus:border-primary/50 text-xs rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                            Default Value
                        </label>
                        <div className="flex gap-2">
                            <Input
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                placeholder="e.g. volumetric, 8k"
                                className="h-10 bg-black/40 border-white/5 focus:border-primary/50 text-xs rounded-xl flex-1"
                            />
                            <Button onClick={handleAdd} className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest">
                                Register
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Registry List */}
            <div className="space-y-4 pb-20">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">
                    Current Registry ({Object.keys(variables).length})
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    <AnimatePresence mode="popLayout">
                        {Object.entries(variables).map(([name, v]) => (
                            <motion.div
                                key={name}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <div className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                                            <Icons.settings size={14} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-white uppercase tracking-wider">
                                                [{name}]
                                            </div>
                                            <div className="text-[9px] text-white/30 font-medium truncate max-w-[200px]">
                                                Default: {v.defaultValue || 'None'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-primary/40 mb-1">Live Value</span>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={v.currentValue}
                                                    onChange={(e) => updateVariableValue(name, e.target.value)}
                                                    className="h-7 w-32 bg-black/40 border-white/5 text-[10px] text-right"
                                                />
                                                <button
                                                    onClick={() => removeVariable(name)}
                                                    className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors group/del"
                                                    title="Delete variable"
                                                >
                                                    <Icons.trash size={12} className="group-hover/del:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {Object.keys(variables).length === 0 && (
                        <div className="py-12 flex flex-col items-center justify-center text-white/10 border-2 border-dashed border-white/5 rounded-3xl">
                            <Icons.settings size={24} className="mb-4 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Registry Empty</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
