'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CommunityEntry } from '@/lib/types';
import { PROMPT_CATEGORIES } from '@/lib/prompt-templates';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type OnboardingStep = 'welcome' | 'exemplar-picker' | 'exemplar-showcase' | 'create-from-exemplar';

export default function OnboardingPrototype() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<OnboardingStep>('welcome');
    const [exemplars, setExemplars] = useState<CommunityEntry[]>([]);
    const [selectedExemplar, setSelectedExemplar] = useState<CommunityEntry | null>(null);
    const [showcaseIndex, setShowcaseIndex] = useState(0);
    const [customising, setCustomising] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [customValues, setCustomValues] = useState({ subject: '', style: '', mood: '' });
    const [loading, setLoading] = useState(true);

    // Fetch exemplars
    useEffect(() => {
        const fetchExemplars = async () => {
            try {
                const q = query(collection(db, 'leagueEntries'), where('isExemplar', '==', true));
                const snap = await getDocs(q);
                const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityEntry));
                setExemplars(entries);
            } catch (e) {
                console.warn('[Onboarding] Failed to fetch exemplars:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchExemplars();
    }, []);

    // Auto-advance showcase
    useEffect(() => {
        if (step !== 'exemplar-showcase' || exemplars.length === 0) return;
        const timer = setInterval(() => {
            setShowcaseIndex(prev => (prev + 1) % Math.min(exemplars.length, 4));
        }, 5000);
        return () => clearInterval(timer);
    }, [step, exemplars.length]);

    const completeOnboarding = async (redirectTo: string) => {
        if (user) {
            try {
                await setDoc(doc(db, 'users', user.uid), { hasCompletedOnboarding: true }, { merge: true });
            } catch (e) {
                console.warn('[Onboarding] Failed to mark complete:', e);
            }
        }
        router.push(redirectTo);
    };

    const handleSelectExemplar = (entry: CommunityEntry) => {
        setSelectedExemplar(entry);
        // Pre-fill custom values by extracting keywords from prompt
        const prompt = entry.prompt || '';
        setCustomValues({
            subject: prompt.split(',')[0]?.trim() || '',
            style: '',
            mood: '',
        });
        setStep('create-from-exemplar');
    };

    const handleUseAsIs = () => {
        if (!selectedExemplar) return;
        const params = new URLSearchParams({ prompt: selectedExemplar.prompt || '' });
        completeOnboarding(`/generate?${params.toString()}`);
    };

    const handleWizardComplete = () => {
        const parts = [customValues.subject];
        if (customValues.style) parts.push(customValues.style + ' style');
        if (customValues.mood) parts.push(customValues.mood + ' mood');
        const prompt = parts.join(', ');
        const params = new URLSearchParams({ prompt });
        completeOnboarding(`/generate?${params.toString()}`);
    };

    const slideVariants = {
        enter: { opacity: 0, x: 60 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -60 },
    };

    // ──────────────────────────── SCREEN 1: WELCOME ────────────────────────────
    if (step === 'welcome') {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    className="max-w-3xl w-full text-center"
                >
                    <div className="mb-8">
                        <div className="text-6xl mb-4">✨</div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-pink-500">
                            Welcome to AI Image Studio
                        </h1>
                        <p className="text-lg text-foreground-muted max-w-lg mx-auto">
                            Create stunning AI-generated images and videos. Let&apos;s get you started.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mt-12">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Card
                                className="p-8 cursor-pointer hover:border-primary/50 transition-all group text-left h-full"
                                onClick={() => setStep('exemplar-picker')}
                            >
                                <div className="text-4xl mb-4">🎨</div>
                                <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Create Something Now</h2>
                                <p className="text-sm text-foreground-muted leading-relaxed">
                                    Jump straight into creating with guided examples. Pick an exemplar, customise it, and generate your first masterpiece.
                                </p>
                                <div className="mt-4 flex items-center gap-2 text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    Let&apos;s go <Icons.arrowRight size={14} />
                                </div>
                            </Card>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Card
                                className="p-8 cursor-pointer hover:border-emerald-500/50 transition-all group text-left h-full"
                                onClick={() => setStep('exemplar-showcase')}
                            >
                                <div className="text-4xl mb-4">🌍</div>
                                <h2 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">Explore the Community</h2>
                                <p className="text-sm text-foreground-muted leading-relaxed">
                                    See what others have created for inspiration. Browse curated exemplars, then try one yourself.
                                </p>
                                <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    Show me <Icons.arrowRight size={14} />
                                </div>
                            </Card>
                        </motion.div>
                    </div>

                    <button
                        onClick={() => completeOnboarding('/dashboard')}
                        className="mt-8 text-sm text-foreground-muted/50 hover:text-foreground-muted transition-colors"
                    >
                        Skip for now
                    </button>
                </motion.div>
            </div>
        );
    }

    // ──────────────────────────── SCREEN 2A: EXEMPLAR PICKER ────────────────────────────
    if (step === 'exemplar-picker') {
        return (
            <div className="min-h-screen bg-[#0a0a0f] p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-6xl mx-auto py-12"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => setStep('welcome')} className="text-foreground-muted hover:text-foreground transition-colors">
                            <Icons.arrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Pick a Starting Point</h1>
                            <p className="text-foreground-muted mt-1">Choose an exemplar to use as your creative foundation.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : exemplars.length === 0 ? (
                        <Card className="p-12 text-center">
                            <div className="text-4xl mb-4 opacity-20">📭</div>
                            <p className="text-foreground-muted">No exemplars available yet. Ask an admin to mark community entries as exemplars.</p>
                            <Button variant="secondary" className="mt-4" onClick={() => completeOnboarding('/generate')}>
                                Go to Generator →
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {exemplars.map((entry, i) => {
                                const isVideo = !!(entry.videoUrl || entry.settings?.modality === 'video');
                                return (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Card
                                            className="overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all group"
                                            onClick={() => handleSelectExemplar(entry)}
                                        >
                                            <div className="aspect-square relative overflow-hidden">
                                                <img
                                                    src={entry.imageUrl}
                                                    alt={entry.prompt || 'Exemplar'}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                                {isVideo && (
                                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg">
                                                        <Icons.video size={14} className="text-white" />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 left-2">
                                                    <Badge className="bg-amber-500/90 text-white text-[9px] font-black uppercase tracking-widest border-0">
                                                        ⭐ Exemplar
                                                    </Badge>
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                    <p className="text-white text-xs line-clamp-2 italic">&quot;{entry.prompt}&quot;</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    // ──────────────────────────── SCREEN 2B: EXEMPLAR SHOWCASE ────────────────────────────
    if (step === 'exemplar-showcase') {
        const showcaseExemplars = exemplars.slice(0, 4);
        const current = showcaseExemplars[showcaseIndex];

        return (
            <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
                <div className="flex items-center gap-4 p-4">
                    <button onClick={() => setStep('welcome')} className="text-foreground-muted hover:text-foreground transition-colors">
                        <Icons.arrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold">Community Highlights</h1>
                </div>

                {loading || !current ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={showcaseIndex}
                                initial={{ opacity: 0, x: 100 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                                className="max-w-3xl w-full"
                            >
                                <div className="aspect-video rounded-2xl overflow-hidden mb-6 border border-white/10 shadow-2xl">
                                    <img
                                        src={current.imageUrl}
                                        alt={current.prompt || 'Exemplar'}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg italic text-foreground-muted mb-2">&quot;{current.prompt}&quot;</p>
                                    <p className="text-sm text-foreground-muted/60">by {current.authorName || 'Anonymous'}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Dots */}
                        <div className="flex gap-2 mt-6">
                            {showcaseExemplars.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setShowcaseIndex(i)}
                                    className={cn(
                                        "w-2.5 h-2.5 rounded-full transition-all",
                                        i === showcaseIndex ? "bg-primary scale-125" : "bg-zinc-700 hover:bg-zinc-500"
                                    )}
                                />
                            ))}
                        </div>

                        <div className="flex gap-4 mt-8">
                            <Button
                                variant="primary"
                                onClick={() => handleSelectExemplar(current)}
                                className="px-6"
                            >
                                ✨ Try this one
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => completeOnboarding('/community')}
                            >
                                Go to Community Hub →
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ──────────────────────────── SCREEN 3: CREATE FROM EXEMPLAR ────────────────────────────
    if (step === 'create-from-exemplar' && selectedExemplar) {
        const wizardLabels = ['Subject', 'Style', 'Mood'];
        const wizardKeys = ['subject', 'style', 'mood'] as const;

        return (
            <div className="min-h-screen bg-[#0a0a0f] p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-5xl mx-auto py-12"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => { setStep('exemplar-picker'); setCustomising(false); setWizardStep(0); }} className="text-foreground-muted hover:text-foreground transition-colors">
                            <Icons.arrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-black tracking-tight">Create from Exemplar</h1>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Left — Exemplar preview */}
                        <div>
                            <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-4">
                                <img
                                    src={selectedExemplar.imageUrl}
                                    alt={selectedExemplar.prompt || 'Selected exemplar'}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <p className="text-sm italic text-foreground-muted line-clamp-3">&quot;{selectedExemplar.prompt}&quot;</p>
                        </div>

                        {/* Right — Actions */}
                        <div className="flex flex-col justify-center gap-6">
                            {!customising ? (
                                <>
                                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                                        <Card className="p-6 cursor-pointer hover:border-primary/50 transition-all group" onClick={handleUseAsIs}>
                                            <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                                                📋 Use this prompt
                                            </h3>
                                            <p className="text-sm text-foreground-muted">Go straight to the generator with this exact prompt pre-filled.</p>
                                        </Card>
                                    </motion.div>

                                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                                        <Card className="p-6 cursor-pointer hover:border-purple-500/50 transition-all group" onClick={() => setCustomising(true)}>
                                            <h3 className="text-lg font-bold mb-2 group-hover:text-purple-400 transition-colors">
                                                🎨 Make it yours
                                            </h3>
                                            <p className="text-sm text-foreground-muted">Customise the subject, style, and mood in 3 quick steps.</p>
                                        </Card>
                                    </motion.div>
                                </>
                            ) : (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={wizardStep}
                                        initial={{ opacity: 0, x: 40 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -40 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Card className="p-8">
                                            {/* Progress */}
                                            <div className="flex gap-2 mb-6">
                                                {wizardLabels.map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "h-1.5 flex-1 rounded-full transition-colors",
                                                            i <= wizardStep ? "bg-primary" : "bg-zinc-800"
                                                        )}
                                                    />
                                                ))}
                                            </div>

                                            <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary">
                                                Step {wizardStep + 1} of 3
                                            </div>
                                            <h3 className="text-xl font-bold mb-4">{wizardLabels[wizardStep]}</h3>

                                            {wizardStep === 0 ? (
                                                <div>
                                                    <p className="text-sm text-foreground-muted mb-3">
                                                        The original uses: <span className="font-bold text-foreground">&quot;{customValues.subject}&quot;</span>
                                                    </p>
                                                    <input
                                                        type="text"
                                                        value={customValues.subject}
                                                        onChange={(e) => setCustomValues(prev => ({ ...prev, subject: e.target.value }))}
                                                        placeholder="e.g. a dragon flying over a castle"
                                                        className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm"
                                                    />
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-sm text-foreground-muted mb-3">
                                                        Choose a {wizardLabels[wizardStep].toLowerCase()} for your creation:
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {(wizardStep === 1 ? PROMPT_CATEGORIES.style : PROMPT_CATEGORIES.mood).map((option) => (
                                                            <button
                                                                key={option}
                                                                onClick={() => setCustomValues(prev => ({ ...prev, [wizardKeys[wizardStep]]: option }))}
                                                                className={cn(
                                                                    "px-3 py-2.5 rounded-xl text-sm text-left transition-all border",
                                                                    customValues[wizardKeys[wizardStep]] === option
                                                                        ? "border-primary bg-primary/10 text-primary font-bold"
                                                                        : "border-border bg-background-secondary text-foreground-muted hover:border-primary/30"
                                                                )}
                                                            >
                                                                {option}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-between mt-6">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => wizardStep === 0 ? setCustomising(false) : setWizardStep(wizardStep - 1)}
                                                >
                                                    ← Back
                                                </Button>
                                                {wizardStep < 2 ? (
                                                    <Button variant="primary" size="sm" onClick={() => setWizardStep(wizardStep + 1)}>
                                                        Next →
                                                    </Button>
                                                ) : (
                                                    <Button variant="primary" size="sm" onClick={handleWizardComplete} className="bg-gradient-to-r from-primary to-purple-500">
                                                        ✨ Generate!
                                                    </Button>
                                                )}
                                            </div>
                                        </Card>
                                    </motion.div>
                                </AnimatePresence>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return null;
}
