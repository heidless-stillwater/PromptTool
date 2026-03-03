'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { CreditTransaction } from '@/lib/types';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import { useCreditHistory } from '@/hooks/queries/useQueryHooks';

interface CreditLedgerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreditLedgerModal({ isOpen, onClose }: CreditLedgerModalProps) {
    const { user } = useAuth();
    // Use the central TanStack query so this modal is reactive to invalidations elsewhere
    const { data: transactions = [], isLoading: loading } = useCreditHistory(user?.uid);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
                    />

                    <div className="relative w-full max-w-2xl px-4 py-12 md:py-20 flex flex-col items-center justify-center min-h-screen pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full bg-[#050510] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white leading-none">Neural Ledger</h3>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mt-2">Energy consumption and recharge logs</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full border border-white/5 text-white/40 hover:text-white hover:bg-white/5"
                                >
                                    <Icons.close size={18} />
                                </Button>
                            </div>

                            {/* List */}
                            <div className="p-8 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-4">
                                {loading ? (
                                    <div className="py-20 flex flex-col items-center gap-4 text-center">
                                        <Icons.spinner className="w-10 h-10 animate-spin text-primary" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Retrieving transaction data...</p>
                                    </div>
                                ) : transactions.length === 0 ? (
                                    <div className="py-20 text-center space-y-4">
                                        <Icons.activity size={48} className="mx-auto text-white/10" />
                                        <p className="text-sm font-medium text-foreground-muted italic text-white/30">No energy transmissions found in the current sector.</p>
                                    </div>
                                ) : (
                                    transactions.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-between group hover:bg-white/[0.05] transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                                                    tx.amount > 0
                                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                                        : "bg-primary/10 border-primary/20 text-primary"
                                                )}>
                                                    {tx.amount > 0 ? <Icons.plus size={16} /> : <Icons.activity size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest text-white leading-tight">
                                                        {tx.description || (tx.type === 'usage' ? 'Image Generation' : 'System Update')}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-white/30 mt-1 uppercase">
                                                        {tx.createdAt instanceof Timestamp
                                                            ? formatDate(tx.createdAt.toDate())
                                                            : 'Recent Transmission'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn(
                                                    "text-sm font-black tracking-tighter",
                                                    tx.amount > 0 ? "text-emerald-500" : "text-primary"
                                                )}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount} Units
                                                </p>
                                                <p className="text-[8px] font-black uppercase text-foreground-muted/40 tracking-wider">Energy Delta</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-8 bg-white/[0.02] border-t border-white/5 flex justify-center">
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground-muted/30">End of Transmission</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
