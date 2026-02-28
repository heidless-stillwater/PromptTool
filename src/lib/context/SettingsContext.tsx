'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserLevel = 'novice' | 'journeyman' | 'master';

interface SettingsContextType {
    helpModeEnabled: boolean;
    setHelpModeEnabled: (enabled: boolean) => void;
    toggleHelpMode: () => void;
    userLevel: UserLevel;
    setUserLevel: (level: UserLevel) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [helpModeEnabled, setHelpModeEnabled] = useState<boolean>(false);
    const [userLevel, setUserLevel] = useState<UserLevel>('novice');
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize from localStorage
    useEffect(() => {
        const storedHelp = localStorage.getItem('stillwater_help_enabled');
        if (storedHelp !== null) {
            setHelpModeEnabled(storedHelp === 'true');
        }

        const storedLevel = localStorage.getItem('pskill_userLevel') as UserLevel;
        if (storedLevel && ['novice', 'journeyman', 'master'].includes(storedLevel)) {
            setUserLevel(storedLevel);
        }

        setIsInitialized(true);
    }, []);

    // Persist to localStorage
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('stillwater_help_enabled', helpModeEnabled.toString());
            localStorage.setItem('pskill_userLevel', userLevel);
        }
    }, [helpModeEnabled, userLevel, isInitialized]);

    // Keyboard shortcut for toggling help mode (H key)
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Don't toggle if user is typing in an input or textarea
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                (e.target as HTMLElement).isContentEditable
            ) {
                return;
            }

            if (e.key.toLowerCase() === 'h') {
                toggleHelpMode();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isInitialized]);

    const toggleHelpMode = () => setHelpModeEnabled(prev => !prev);

    return (
        <SettingsContext.Provider value={{ helpModeEnabled, setHelpModeEnabled, toggleHelpMode, userLevel, setUserLevel }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
