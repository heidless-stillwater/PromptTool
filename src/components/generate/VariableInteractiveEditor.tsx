'use client';

import React from 'react';
import { VariablePill } from './VariablePill';

interface VariableInteractiveEditorProps {
    text: string;
}

export const VariableInteractiveEditor: React.FC<VariableInteractiveEditorProps> = ({ text }) => {
    if (!text) return <span className="text-white/20 italic">No prompt architecture detected...</span>;

    // Pattern to match [VAR] or [VAR:DEFAULT]
    const regex = /(\[[A-Z0-9_]+(?::[^\]]+)?\])/gi;
    const parts = text.split(regex);

    return (
        <div className="leading-loose text-sm font-medium text-white/80">
            {parts.map((part, i) => {
                const match = part.match(/\[([A-Z0-9_]+)(?::([^\]]+))?\]/i);
                if (match) {
                    return <VariablePill key={i} name={match[1]} originalMatch={part} />;
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
};
