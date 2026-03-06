'use client';

import React, { useState } from 'react';
import { useSettings } from '@/lib/context/SettingsContext';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export default function Tooltip({ content, children, position = 'top', className = '' }: TooltipProps) {
    const { helpModeEnabled } = useSettings();
    const [isVisible, setIsVisible] = useState(false);

    if (!helpModeEnabled) {
        return <div className={`inline-block ${className}`}>{children}</div>;
    }

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-background-tertiary border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-background-tertiary border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-background-tertiary border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-background-tertiary border-y-transparent border-l-transparent'
    };

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    className={`absolute z-[9999] px-4 py-2 text-[10px] font-bold text-foreground bg-background-tertiary border border-border rounded-lg shadow-xl whitespace-normal w-60 md:w-80 max-w-[400px] animate-in fade-in zoom-in-95 duration-200 ${positionClasses[position]}`}
                >
                    {content}
                    <div className={`absolute border-[5px] ${arrowClasses[position]}`} />
                </div>
            )}
        </div>
    );
}
