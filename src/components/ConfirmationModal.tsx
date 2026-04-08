'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message?: string;
    children?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const variantMap = {
        danger: 'danger',
        warning: 'primary',
        info: 'primary'
    } as const;

    const buttonVariant = variantMap[type] || 'primary';

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 isolate">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                        onClick={isLoading ? undefined : onCancel}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="max-w-md w-full relative z-10"
                    >
                        <Card
                            className="relative p-10 shadow-[0_0_100px_rgba(99,102,241,0.15)] bg-[#0a0a0f]/95 rounded-[3rem] border border-primary/20 backdrop-blur-3xl overflow-hidden"
                        >
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[60px]" />

                            <div className="mb-8 flex flex-col items-center text-center">
                                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl ${type === 'danger' ? 'bg-red-500/10 border border-red-500/30' : 'bg-primary/10 border border-primary/30'}`}>
                                    <div className={`w-3 h-3 rounded-full animate-pulse ${type === 'danger' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'bg-primary shadow-[0_0_20px_rgba(99,102,241,0.6)]'}`} />
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-white leading-tight">{title}</h3>
                                <div className="h-1 w-16 bg-gradient-to-r from-transparent via-primary/40 to-transparent mt-4" />
                            </div>

                            <div className="text-foreground/70 mb-8 text-sm leading-relaxed text-center font-medium max-w-[320px] mx-auto">
                                {message && <p className="mb-2">{message}</p>}
                                {children}
                            </div>

                            {!children && (
                                <div className="flex gap-4">
                                    <Button
                                        variant="secondary"
                                        onClick={onCancel}
                                        disabled={isLoading}
                                        className="flex-1 h-12 font-black uppercase tracking-widest text-[10px] rounded-2xl"
                                    >
                                        {cancelLabel}
                                    </Button>
                                    <Button
                                        variant={buttonVariant}
                                        onClick={onConfirm}
                                        disabled={isLoading}
                                        isLoading={isLoading}
                                        className="flex-1 h-12 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg"
                                    >
                                        {confirmLabel}
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
