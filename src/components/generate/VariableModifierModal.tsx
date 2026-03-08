'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useVariables, Variable } from '@/lib/context/VariableContext';

interface VariableModifierModalProps {
    isOpen: boolean;
    onClose: () => void;
    variableName: string;
}

export const VariableModifierModal: React.FC<VariableModifierModalProps> = ({
    isOpen,
    onClose,
    variableName
}) => {
    const { variables, registerVariable, updateVariableValue } = useVariables();
    const variable = variables[variableName.toUpperCase()];

    const [name, setName] = useState(variableName);
    const [currentValue, setCurrentValue] = useState('');
    const [defaultValue, setDefaultValue] = useState('');

    useEffect(() => {
        if (variable) {
            setName(variable.name);
            setCurrentValue(variable.currentValue || '');
            setDefaultValue(variable.defaultValue || '');
        } else {
            setName(variableName);
            setCurrentValue('');
            setDefaultValue('');
        }
    }, [variable, variableName, isOpen]);

    const handleSave = () => {
        registerVariable({
            name: name.toUpperCase(),
            defaultValue: defaultValue,
            currentValue: currentValue || defaultValue
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-[#0a0a0f] border border-primary/30 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)]"
            >
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-primary/5">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary-light leading-none">
                            Logic Attribute
                        </h3>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mt-2">
                            Configure Variable Architecture
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <Icons.settings size={18} />
                    </div>
                </div>

                <div className="p-10 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 px-1">
                            Variable handle
                        </label>
                        <Input
                            disabled
                            value={`[${name.toUpperCase()}]`}
                            className="h-12 bg-white/[0.02] border-white/5 text-sm rounded-xl text-white/40 font-mono"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 px-1">
                            Default Value
                        </label>
                        <Input
                            placeholder="Constant fallback..."
                            value={defaultValue}
                            onChange={(e) => setDefaultValue(e.target.value)}
                            className="h-12 bg-white/5 border-white/10 text-sm rounded-xl focus:border-primary/40"
                        />
                        <p className="text-[8px] text-white/20 italic px-1">
                            This value is used if no live override is provided.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                                Live Override
                            </label>
                            <button
                                onClick={() => setCurrentValue(defaultValue)}
                                className="text-[7px] font-black uppercase tracking-widest text-white/20 hover:text-primary transition-colors"
                            >
                                Sync to Default
                            </button>
                        </div>
                        <Input
                            placeholder="Enter live value..."
                            value={currentValue}
                            onChange={(e) => setCurrentValue(e.target.value)}
                            className="h-12 bg-white/5 border-white/10 text-sm rounded-xl focus:border-primary/40"
                        />
                    </div>

                    <div className="pt-4 flex gap-4">
                        <Button
                            variant="outline"
                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border-white/10 text-white/40 hover:text-white"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                            onClick={handleSave}
                        >
                            Commit Logic
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
