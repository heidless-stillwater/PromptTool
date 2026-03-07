'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';

export interface Variable {
    id: string;
    name: string;
    defaultValue: string;
    currentValue: string;
    source: 'prompt' | 'registry';
}

interface VariableContextType {
    variables: Record<string, Variable>;
    detectedVariables: Record<string, string>; // name -> defaultValue
    updateVariableValue: (name: string, value: string) => void;
    activateVariable: (name: string, defaultValue?: string) => void;
    registerVariable: (variable: Partial<Variable>) => void;
    resolvePrompt: (text: string) => string;
    getMissingVariables: (text: string) => string[];
    scanPrompt: (primarySources: string[], secondarySources?: string[]) => void;
    loadVariables: (vars: Record<string, string>) => void;
    removeVariable: (name: string) => void;
    clearVariables: () => void;
}

const VariableContext = createContext<VariableContextType | undefined>(undefined);

export const VariableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [variables, setVariables] = useState<Record<string, Variable>>({});
    const [detectedVariables, setDetectedVariables] = useState<Record<string, string>>({});

    // Use a ref to track the last source state we processed to avoid redundant updates
    const lastScannedRef = useRef<string>('');

    // Scan multiple sources for variables like [NAME] or [NAME:DEFAULT]
    const scanPrompt = useCallback((primarySources: string | string[], secondarySources: string | string[] = []) => {
        // Normalize to arrays
        const primary = Array.isArray(primarySources) ? primarySources : [primarySources];
        const secondary = Array.isArray(secondarySources) ? secondarySources : [secondarySources];

        // Updated regex to exclude strings wrapped in single quotes like '[X]'
        // It uses a negative lookbehind and lookahead for single quotes.
        const regex = /(?<!')\[([A-Z0-9_]+)(?::([^\]]+))?\](?!')/gi;
        const currentPromptVars: Record<string, string> = {}; // name -> defaultValue

        const currentSignature = [...primary, '||', ...secondary].join('|');
        if (currentSignature === lastScannedRef.current) return;
        lastScannedRef.current = currentSignature;

        // 1. Process Primary Sources (User Input: Subject/Modifiers)
        primary.forEach(text => {
            if (!text) return;
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(text)) !== null) {
                const name = match[1].toUpperCase();
                const defaultValue = match[2] || '';
                if (currentPromptVars[name] === undefined) {
                    currentPromptVars[name] = defaultValue;
                }
            }
        });

        // 2. Process Secondary Sources (AI Output)
        secondary.forEach(text => {
            if (!text) return;
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(text)) !== null) {
                const name = match[1].toUpperCase();
                const defaultValue = match[2] || '';
                if (currentPromptVars[name] === undefined) {
                    currentPromptVars[name] = defaultValue;
                }
            }
        });

        // 3. Atomic Synchronization
        setVariables(prev => {
            const next = { ...prev };
            let changed = false;

            // Phase A: Purge and Sync existing
            Object.keys(next).forEach(name => {
                const isPresent = currentPromptVars[name] !== undefined;

                if (isPresent) {
                    if (next[name].defaultValue !== currentPromptVars[name]) {
                        const oldDefault = next[name].defaultValue;
                        const wasUsingDefault = next[name].currentValue === oldDefault || next[name].currentValue === '';

                        next[name].defaultValue = currentPromptVars[name];

                        if (wasUsingDefault) {
                            next[name].currentValue = currentPromptVars[name];
                            console.log(`[VariableEngine] Syncing ${name} to new default: "${currentPromptVars[name]}"`);
                        }
                        changed = true;
                    }
                } else if (next[name].source === 'prompt') {
                    delete next[name];
                    changed = true;
                    console.log(`[VariableEngine] Purging stale: ${name}`);
                }
            });

            // Phase B: Auto-Register new
            Object.entries(currentPromptVars).forEach(([name, def]) => {
                if (!next[name]) {
                    next[name] = {
                        id: name,
                        name: name,
                        defaultValue: def,
                        currentValue: def,
                        source: 'prompt'
                    };
                    changed = true;
                    console.log(`[VariableEngine] Auto-activating: ${name}`);
                }
            });

            return changed ? next : prev;
        });

        // 4. Update 'detectedVariables' for UI feedback
        setDetectedVariables(currentPromptVars);
    }, []); // No dependencies, uses functional updates and refs

    const activateVariable = useCallback((name: string, defaultValue?: string) => {
        const key = name.toUpperCase();
        setVariables(prev => ({
            ...prev,
            [key]: {
                id: key,
                name: key,
                defaultValue: defaultValue || '',
                currentValue: defaultValue || '',
                source: 'prompt'
            }
        }));
    }, []);

    const updateVariableValue = useCallback((name: string, value: string) => {
        const key = name.toUpperCase();
        setVariables(prev => {
            const existing = prev[key];
            if (existing && existing.currentValue === value) return prev;

            const newVar = existing || {
                id: key,
                name: key,
                defaultValue: '',
                source: 'prompt' as const
            };

            return {
                ...prev,
                [key]: {
                    ...newVar,
                    currentValue: value
                }
            };
        });
    }, []);

    const registerVariable = useCallback((variable: Partial<Variable>) => {
        if (!variable.name) return;
        const name = variable.name.toUpperCase();
        setVariables(prev => {
            const existing = prev[name];
            const nextVal = variable.currentValue || variable.defaultValue || '';
            const nextDef = variable.defaultValue || '';

            if (existing && existing.currentValue === nextVal && existing.defaultValue === nextDef && existing.source === 'registry') {
                return prev;
            }

            return {
                ...prev,
                [name]: {
                    id: name,
                    name,
                    defaultValue: nextDef,
                    currentValue: nextVal,
                    source: 'registry',
                    ...variable
                }
            };
        });
    }, []);

    const loadVariables = useCallback((vars: Record<string, string>) => {
        setVariables(prev => {
            const next = { ...prev };
            let changed = false;
            Object.entries(vars).forEach(([name, value]) => {
                const key = name.toUpperCase();
                if (next[key]) {
                    if (next[key].currentValue !== value) {
                        next[key].currentValue = value;
                        changed = true;
                    }
                } else {
                    next[key] = {
                        id: key,
                        name: key,
                        defaultValue: '',
                        currentValue: value,
                        source: 'prompt'
                    };
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, []);

    const removeVariable = useCallback((name: string) => {
        const key = name.toUpperCase();
        setVariables(prev => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const clearVariables = useCallback(() => {
        setVariables(prev => {
            if (Object.keys(prev).length === 0) return prev;
            return {};
        });
    }, []);

    // Resolves a string by replacing [VAR] or [VAR:DEFAULT] with their values
    const resolvePrompt = useCallback((text: string) => {
        if (!text) return '';

        return text.replace(/(?<!')\[([A-Z0-9_]+)(?::([^\]]+))?\](?!')/gi, (match, name, defaultVal) => {
            const key = name.toUpperCase();
            const variable = variables[key];

            if (variable) {
                // Priority 1: Current User Overridden Value
                if (variable.currentValue !== undefined && variable.currentValue !== '') {
                    return variable.currentValue;
                }
                // Priority 2: Registry Default Value (the value from the SCANNER's first encounter)
                // We return this even if it's empty, because the scanner ensures registry defaultValue 
                // is updated when the primary prompt text changes (e.g. [VAR:cat] -> [VAR]).
                return variable.defaultValue;
            }

            // Priority 3: Inline Fallback (only if not in registry)
            if (defaultVal !== undefined) return defaultVal;

            return match; // Keep unresolved [VAR] if no value is known
        });
    }, [variables]);

    const getMissingVariables = useCallback((text: string) => {
        if (!text) return [];
        const missing: Set<string> = new Set();
        const regex = /(?<!')\[([A-Z0-9_]+)(?::([^\]]+))?\](?!')/gi;
        let match;
        regex.lastIndex = 0;

        while ((match = regex.exec(text)) !== null) {
            const name = match[1].toUpperCase();

            const inlineDefault = match[2];
            const variable = variables[name];

            const hasCurrent = variable && variable.currentValue !== undefined && variable.currentValue !== '';

            // A variable is "missing" if it has no current value AND no default in the registry.
            // We ignore the inline default from the text if it's in the registry, 
            // because the registry default is the "truth" for this session.
            const hasDefault = variable ? (variable.defaultValue !== '') : !!inlineDefault;

            if (!hasCurrent && !hasDefault) {
                missing.add(name);
            }
        }
        return Array.from(missing);
    }, [variables]);

    const value = useMemo(() => ({
        variables,
        detectedVariables,
        updateVariableValue,
        activateVariable,
        registerVariable,
        resolvePrompt,
        getMissingVariables,
        scanPrompt,
        loadVariables,
        removeVariable,
        clearVariables
    }), [variables, detectedVariables, updateVariableValue, activateVariable, registerVariable, resolvePrompt, getMissingVariables, scanPrompt, loadVariables, removeVariable, clearVariables]);

    return (
        <VariableContext.Provider value={value}>
            {children}
        </VariableContext.Provider>
    );
};

export const useVariables = () => {
    const context = useContext(VariableContext);
    if (context === undefined) {
        throw new Error('useVariables must be used within a VariableProvider');
    }
    return context;
};
