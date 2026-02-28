'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message?: string;
    children?: React.ReactNode;
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
    children,
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

    const variantMap = {
        danger: 'danger',
        warning: 'primary', // approximating warning to primary for now, or could define warning variant
        info: 'primary'
    } as const;

    const buttonVariant = variantMap[type] || 'primary';

    return (
        <div
            className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onTransitionEnd={() => { if (!isOpen) setShouldRender(false); }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
                onClick={isLoading ? undefined : onCancel}
            />

            {/* Modal Content */}
            <Card
                className={`relative p-8 max-w-md w-full shadow-[0_0_50px_rgba(255,0,0,0.1)] border-white/10 bg-[#0a0a0f] transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
            >
                <div className="mb-4">
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>

                <div className="text-white/70 mb-8 text-sm font-medium leading-relaxed">
                    {message && <p className="mb-2 transition-colors group-hover:text-white">{message}</p>}
                    {children}
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={buttonVariant}
                        onClick={onConfirm}
                        disabled={isLoading}
                        isLoading={isLoading}
                        className="flex-1 shadow-lg"
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
