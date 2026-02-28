'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTour } from '@/context/TourContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './ui/Icons';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { cn } from '@/lib/utils';

export default function GuidedTour() {
    const { isActive, currentStep, steps, nextStep, skipTour, prevStep } = useTour();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const hasScrolledRef = useRef(false);
    const step = steps[currentStep];

    // Scroll target into view when step changes
    useEffect(() => {
        if (!isActive || !step) return;
        hasScrolledRef.current = false;
    }, [isActive, step?.id]);

    useEffect(() => {
        if (!isActive || !step) return;

        let retryCount = 0;
        const maxRetries = 6;

        const updateRect = () => {
            const el = document.getElementById(step.targetId);
            if (el) {
                // Scroll element into view on first find
                if (!hasScrolledRef.current) {
                    hasScrolledRef.current = true;
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Re-measure after scroll settles
                    setTimeout(() => {
                        setTargetRect(el.getBoundingClientRect());
                    }, 400);
                }
                setTargetRect(el.getBoundingClientRect());
                retryCount = 0;
            } else {
                setTargetRect(null);
                retryCount++;
                if (retryCount >= maxRetries) {
                    nextStep();
                }
            }
        };

        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect);

        const interval = setInterval(updateRect, 500);

        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect);
            clearInterval(interval);
        };
    }, [isActive, step, nextStep]);

    // Compute tooltip position with viewport clamping
    const tooltipStyle = useMemo(() => {
        if (!targetRect || !step) return {};

        const tooltipW = 340;
        const tooltipH = 200;
        const pad = 16;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

        let top: number;
        let left: number;

        if (step.position === 'top') {
            top = targetRect.top - tooltipH - 20;
            left = targetRect.left + (targetRect.width / 2) - (tooltipW / 2);
        } else if (step.position === 'bottom') {
            top = targetRect.bottom + 20;
            left = targetRect.left + (targetRect.width / 2) - (tooltipW / 2);
        } else if (step.position === 'left') {
            top = targetRect.top + (targetRect.height / 2) - (tooltipH / 2);
            left = targetRect.left - tooltipW - 20;
        } else if (step.position === 'right') {
            top = targetRect.top + (targetRect.height / 2) - (tooltipH / 2);
            left = targetRect.right + 20;
        } else {
            top = targetRect.bottom + 20;
            left = targetRect.left + (targetRect.width / 2) - (tooltipW / 2);
        }

        // Clamp to viewport
        if (top + tooltipH > vh - pad) top = vh - tooltipH - pad;
        if (top < pad) top = pad;
        if (left + tooltipW > vw - pad) left = vw - tooltipW - pad;
        if (left < pad) left = pad;

        return { top, left };
    }, [targetRect, step]);

    if (!isActive || !step) return null;

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none">
            {/* Dark overlay as 4 rectangles — the hole is genuinely empty so clicks pass through */}
            {targetRect && (<>
                {/* Top strip */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute left-0 right-0 bg-black/70 pointer-events-auto cursor-default"
                    style={{ top: 0, height: Math.max(0, targetRect.top - 8) }}
                    onClick={skipTour}
                    onWheel={(e) => window.scrollBy({ top: e.deltaY })}
                />
                {/* Bottom strip */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute left-0 right-0 bg-black/70 pointer-events-auto cursor-default"
                    style={{ top: targetRect.bottom + 8, bottom: 0 }}
                    onClick={skipTour}
                    onWheel={(e) => window.scrollBy({ top: e.deltaY })}
                />
                {/* Left strip */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute bg-black/70 pointer-events-auto cursor-default"
                    style={{ top: targetRect.top - 8, height: targetRect.height + 16, left: 0, width: Math.max(0, targetRect.left - 8) }}
                    onClick={skipTour}
                    onWheel={(e) => window.scrollBy({ top: e.deltaY })}
                />
                {/* Right strip */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute bg-black/70 pointer-events-auto cursor-default"
                    style={{ top: targetRect.top - 8, height: targetRect.height + 16, left: targetRect.right + 8, right: 0 }}
                    onClick={skipTour}
                    onWheel={(e) => window.scrollBy({ top: e.deltaY })}
                />
            </>)}
            {/* Fallback full overlay before target found */}
            {!targetRect && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 pointer-events-none"
                />
            )}

            {/* Spotlight Border Glow */}
            <AnimatePresence>
                {targetRect && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute border-2 border-primary rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.5)] bg-primary/5"
                        style={{
                            top: targetRect.top - 12,
                            left: targetRect.left - 12,
                            width: targetRect.width + 24,
                            height: targetRect.height + 24,
                        }}
                    >
                        <motion.div
                            className="absolute inset-0 border-primary/30 rounded-2xl"
                            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tooltip */}
            <AnimatePresence mode="wait">
                {targetRect && (
                    <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute pointer-events-auto z-[210]"
                        style={{ ...tooltipStyle, width: 340 }}
                    >
                        <Card variant="glass" className="p-6 shadow-2xl border-primary/20 bg-background/90 backdrop-blur-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
                                    <Icons.sparkles size={16} />
                                </div>
                                <h4 className="text-lg font-black tracking-tight">{step.title}</h4>
                            </div>
                            <p className="text-sm text-foreground-muted mb-6 leading-relaxed">
                                {step.content}
                            </p>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex gap-1">
                                    {steps.map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                i === currentStep ? "bg-primary w-4" : "bg-border"
                                            )}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={skipTour} className="text-xs">Skip</Button>
                                    <Button variant="primary" size="sm" onClick={nextStep} className="px-6">
                                        {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
