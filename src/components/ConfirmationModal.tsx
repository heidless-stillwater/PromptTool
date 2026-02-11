'use client';

import { useEffect, useState } from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    type?: 'danger' | 'info' | 'warning';
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    isLoading = false,
    type = 'info'
}: ConfirmationModalProps) {
    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) setShouldRender(true);
    }, [isOpen]);

    if (!shouldRender && !isOpen) return null;

    const typeStyles = {
        danger: 'bg-error text-white hover:bg-error/90 shadow-error/20',
        warning: 'bg-primary text-white hover:bg-primary/90 shadow-primary/20',
        info: 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
    };

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onTransitionEnd={() => { if (!isOpen) setShouldRender(false); }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/60 backdrop-blur-sm"
                onClick={isLoading ? undefined : onCancel}
            />

            {/* Modal Content */}
            <div
                className={`relative glass-card p-6 max-w-sm w-full shadow-2xl border-border transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
            >
                <div className="mb-4">
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>

                <p className="text-foreground-muted mb-8 text-sm leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 rounded-xl font-bold bg-background-secondary text-foreground-muted hover:text-foreground transition-all disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${typeStyles[type]}`}
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
