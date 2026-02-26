'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';

// --- DATA: Nanobanana Formula ---
const CATEGORIES = [
    {
        id: 'medium',
        label: 'Medium',
        options: ['Photography', 'Oil Painting', '3D Render', 'Watercolor', 'Sketch', 'Digital Illustration', 'Polaroid', 'Anime'],
    },
    {
        id: 'style',
        label: 'Art Style / Vibe',
        options: ['Cyberpunk', 'Fantasy', 'Minimalist', 'Vaporwave', 'Steampunk', 'Surrealism', 'Studio Ghibli', 'Noir'],
    },
    {
        id: 'lighting',
        label: 'Lighting',
        options: ['Cinematic', 'Golden Hour', 'Volumetric Fog', 'Studio Lighting', 'Neon', 'Bioluminescent', 'Harsh Shadows'],
    },
    {
        id: 'camera',
        label: 'Camera & Lens',
        options: ['35mm Lens', 'Macro', 'Drone Shot', 'Fisheye', 'Wide Angle', 'Close-up Portrait', 'Tilt-Shift'],
    },
    {
        id: 'color',
        label: 'Color Palette',
        options: ['High Contrast', 'Muted Tones', 'Pastel', 'Neon Colors', 'Monochromatic', 'Earthy', 'Vibrant'],
    },
    {
        id: 'environment',
        label: 'Environment',
        options: ['Busy Street', 'Underwater', 'Deep Space', 'Overgrown Ruins', 'Cozy Room', 'Abstract Dimension'],
    },
    {
        id: 'magic',
        label: 'Magic Words',
        options: ['Masterpiece', 'Trending on ArtStation', '8k Resolution', 'Unreal Engine 5', 'Award Winning', 'Extremely Detailed'],
    }
];

type Modifier = { id: string; category: string; value: string };
type UITab = 'form' | 'blocks' | 'stack';

export default function NanobananaPrototype() {
    const { profile, user } = useAuth();
    const { showToast } = useToast();
    const isAdmin = profile?.role === 'su' || profile?.role === 'admin';

    // Helpers
    const getDefaultModifiers = (): Modifier[] => {
        return CATEGORIES.map((cat) => ({
            id: `default-${cat.id}`,
            category: cat.id,
            value: cat.options[0]
        }));
    };

    // State
    const [uiTab, setUiTab] = useState<UITab>('form');
    const [coreSubject, setCoreSubject] = useState('');
    const [modifiers, setModifiers] = useState<Modifier[]>(getDefaultModifiers());
    const [isModifiersOpen, setIsModifiersOpen] = useState(true);
    const [compiledPrompt, setCompiledPrompt] = useState<string>('');
    const [isCompiling, setIsCompiling] = useState(false);

    // Generator state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // Auto-compile debounce ref
    const compileTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleToggleModifier = (category: string, value: string) => {
        setModifiers(prev => {
            const exists = prev.find(m => m.value === value);
            if (exists) return prev.filter(m => m.id !== exists.id);
            return [...prev, { id: Date.now().toString(), category, value }];
        });
    };

    // Reorder modifiers (for Visual Blocks UI)
    const moveModifier = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === modifiers.length - 1) return;

        const newModifiers = [...modifiers];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newModifiers[index], newModifiers[swapIndex]] = [newModifiers[swapIndex], newModifiers[index]];
        setModifiers(newModifiers);
    };

    // Trigger AI compilation when inputs change
    useEffect(() => {
        const compilePrompt = async () => {
            if (!coreSubject.trim()) {
                setCompiledPrompt('');
                return;
            }

            setIsCompiling(true);
            try {
                const res = await fetch('/api/generate/nanobanana/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject: coreSubject, modifiers }),
                });

                if (!res.ok) throw new Error('Compilation failed');
                const data = await res.json();
                setCompiledPrompt(data.compiledPrompt);
            } catch (error) {
                console.error('Failed to compile:', error);
                setCompiledPrompt('Error compiling prompt.');
            } finally {
                setIsCompiling(false);
            }
        };

        if (compileTimeout.current) clearTimeout(compileTimeout.current);
        compileTimeout.current = setTimeout(compilePrompt, 800); // 800ms debounce

        return () => {
            if (compileTimeout.current) clearTimeout(compileTimeout.current);
        };
    }, [coreSubject, modifiers]);

    const handleGenerate = async () => {
        if (!compiledPrompt || !user) return;

        setIsGenerating(true);
        setGeneratedImage(null);

        try {
            const token = await user.getIdToken();

            const res = await fetch('/api/generate/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: compiledPrompt,
                    quality: 'standard',
                    aspectRatio: '1:1',
                    modality: 'image',
                    promptType: 'freeform', // bypassing normal madlibs
                    count: 1,
                    // The API optionally reads testing flags
                    isTesting: true
                }),
            });

            if (!res.ok) throw new Error('Generation failed');

            // The /api/generate endpoint returns Server-Sent Events (SSE)
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('Failed to read stream');

            let done = false;
            let finalImageUrl = null;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.substring(6);
                            if (dataStr === '[DONE]') continue;
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.type === 'error') {
                                    showToast(data.error || 'Generation failed', 'error');
                                    setIsGenerating(false);
                                    return;
                                }
                                if (data.type === 'complete' && data.images && data.images.length > 0) {
                                    finalImageUrl = data.images[0].imageUrl;
                                }
                            } catch (e) {
                                // Ignore parse errors for partial chunks
                            }
                        }
                    }
                }
            }

            if (finalImageUrl) {
                setGeneratedImage(finalImageUrl);
            } else {
                showToast('No image returned', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to generate prototype image', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    if (profile && !isAdmin) {
        return <div className="p-12 text-center">Admin Access Required</div>;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
            {/* Left Pane: Builder */}
            <div className="w-full md:w-1/2 lg:w-3/5 border-r border-border h-screen overflow-y-auto">
                <div className="p-6 md:p-8 max-w-2xl mx-auto">

                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">🍌</span>
                            <h1 className="text-2xl font-black tracking-tight">Nanobanana Builder</h1>
                            <Badge variant="gradient" className="text-[9px] uppercase tracking-widest bg-purple-500/20 text-purple-400 border-purple-500/30">PROTOTYPE</Badge>
                        </div>
                        <p className="text-sm text-foreground-muted">Experiment with structural AI prompt compilation.</p>
                    </div>

                    {/* Step 1: Core Subject */}
                    <Card className="p-6 mb-8 border-primary/30 bg-primary/5">
                        <label className="block text-sm font-bold mb-2 text-primary">1. Core Subject <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={coreSubject}
                            onChange={(e) => setCoreSubject(e.target.value)}
                            placeholder="e.g. A solitary astronaut standing on..."
                            className="w-full px-4 py-3 rounded-xl bg-background border border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                    </Card>

                    {/* Step 2: Modifiers - Experimental UI Tabs */}
                    <Card className="p-6 mb-8 border-border bg-background">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setIsModifiersOpen(!isModifiersOpen)}
                                className="flex items-center gap-2 text-sm font-bold flex-1 text-left"
                            >
                                2. The Modifiers
                                <span className="text-foreground-muted font-normal uppercase tracking-widest text-[10px] ml-2">
                                    ({modifiers.length} Active)
                                </span>
                                {isModifiersOpen ? <Icons.chevronUp className="w-4 h-4" /> : <Icons.chevronDown className="w-4 h-4" />}
                            </button>

                            <div className="flex shrink-0">
                                {modifiers.length > 0 ? (
                                    <button
                                        onClick={() => setModifiers([])}
                                        className="text-[10px] uppercase tracking-widest text-red-400 hover:text-red-300 px-3 py-1 bg-red-400/10 rounded-full transition-colors font-bold"
                                    >
                                        Clear
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setModifiers(getDefaultModifiers())}
                                        className="text-[10px] uppercase tracking-widest text-primary hover:text-primary-light px-3 py-1 bg-primary/10 rounded-full transition-colors font-bold"
                                    >
                                        Use Defaults
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Collapsible Content */}
                        {isModifiersOpen && (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                <div className="flex bg-background-secondary p-1 rounded-xl w-fit mb-6 border border-border/50">
                                    {(['form', 'blocks', 'stack'] as UITab[]).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setUiTab(tab)}
                                            className={cn(
                                                "px-4 py-1.5 rounded-lg text-sm font-bold transition-all capitalize",
                                                uiTab === tab ? "bg-accent shadow-sm" : "text-foreground-muted hover:text-foreground"
                                            )}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                {/* UI A: Linear Form */}
                                {uiTab === 'form' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        {CATEGORIES.map(cat => (
                                            <div key={cat.id}>
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-muted mb-3">{cat.label}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {cat.options.map(opt => {
                                                        const isActive = modifiers.some(m => m.value === opt);
                                                        return (
                                                            <button
                                                                key={opt}
                                                                onClick={() => handleToggleModifier(cat.id, opt)}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                                                                    isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-background-secondary text-foreground-muted hover:border-primary/30"
                                                                )}
                                                            >
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* UI B: Visual Blocks */}
                                {uiTab === 'blocks' && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="grid grid-cols-2 gap-8">
                                            {/* Palette */}
                                            <div>
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-muted mb-3">Add Blocks</h3>
                                                <div className="h-[400px] overflow-y-auto pr-2 space-y-4 rounded-xl">
                                                    {CATEGORIES.map(cat => (
                                                        <div key={cat.id}>
                                                            <div className="text-[10px] text-foreground-muted mb-1">{cat.label}</div>
                                                            <select
                                                                className="w-full text-xs bg-background-secondary border border-border p-2 rounded-lg outline-none"
                                                                onChange={(e) => {
                                                                    if (e.target.value) handleToggleModifier(cat.id, e.target.value);
                                                                    e.target.value = "";
                                                                }}
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>+ Add {cat.label}...</option>
                                                                {cat.options.map(opt => (
                                                                    <option key={opt} value={opt} disabled={modifiers.some(m => m.value === opt)}>
                                                                        {opt}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Active Stack */}
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Priority Stack</h3>
                                                    <span className="text-[10px] text-foreground-muted bg-background-secondary px-2 py-0.5 rounded-full">Top = Highest</span>
                                                </div>

                                                <div className="space-y-2">
                                                    <AnimatePresence>
                                                        {modifiers.length === 0 && (
                                                            <div className="text-xs text-foreground-muted italic text-center p-4 border border-dashed border-border rounded-xl">No modifiers added yet.</div>
                                                        )}
                                                        {modifiers.map((mod, idx) => (
                                                            <motion.div
                                                                key={mod.id}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                className="bg-background-secondary border border-border rounded-lg p-2.5 flex items-center justify-between group"
                                                            >
                                                                <div>
                                                                    <div className="text-[9px] uppercase tracking-wider text-primary/70">{mod.category}</div>
                                                                    <div className="text-sm font-bold">{mod.value}</div>
                                                                </div>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <div className="flex flex-col">
                                                                        <button disabled={idx === 0} onClick={() => moveModifier(idx, 'up')} className="p-0.5 disabled:opacity-30 hover:bg-background rounded"><Icons.chevronUp size={12} /></button>
                                                                        <button disabled={idx === modifiers.length - 1} onClick={() => moveModifier(idx, 'down')} className="p-0.5 disabled:opacity-30 hover:bg-background rounded"><Icons.chevronDown size={12} /></button>
                                                                    </div>
                                                                    <button onClick={() => handleToggleModifier(mod.category, mod.value)} className="p-1 ml-1 hover:bg-red-500/20 text-red-400 rounded transition-colors">
                                                                        <Icons.close size={14} />
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* UI C: Smart Stack */}
                                {uiTab === 'stack' && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="text-center p-8 border border-dashed border-border rounded-2xl">
                                            <div className="text-4xl mb-4">🎴</div>
                                            <p className="text-sm text-foreground-muted">Smart Stack UI concept.<br />(Card swiping library goes here)</p>
                                            <p className="text-xs mt-2 text-primary">Switch to Form or Blocks to continue prototyping.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Right Pane: Reviewer */}
            <div className="w-full md:w-1/2 lg:w-2/5 md:h-screen md:overflow-y-auto bg-[#050508] border-l border-white/5 p-6 md:p-8 flex flex-col relative">

                <h2 className="text-xs font-black uppercase tracking-widest text-foreground-muted mb-4 border-b border-border/50 pb-2">Compiled Prompt</h2>

                <div className="relative mb-6">
                    <div className={cn(
                        "p-4 rounded-xl border transition-all text-sm leading-relaxed",
                        compiledPrompt ? "border-primary/30 bg-primary/5 text-primary-light" : "border-border bg-background/50 text-foreground-muted",
                        isCompiling ? "opacity-50 blur-[1px]" : ""
                    )}>
                        {compiledPrompt || (coreSubject ? "Compiling..." : "Awaiting core subject...")}
                    </div>
                    {isCompiling && (
                        <div className="absolute top-1/2 right-4 -translate-y-1/2">
                            <Icons.spinner className="w-4 h-4 text-primary animate-spin" />
                        </div>
                    )}
                </div>

                <Button
                    variant="primary"
                    size="lg"
                    className="w-full shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-purple-600 mb-8"
                    disabled={!compiledPrompt || isCompiling || isGenerating}
                    onClick={handleGenerate}
                >
                    {isGenerating ? (
                        <>
                            <Icons.spinner className="w-5 h-5 animate-spin mr-2" /> Generating Prototype...
                        </>
                    ) : (
                        'Generate Prototype Image'
                    )}
                </Button>

                <div className="flex-1 flex flex-col justify-end min-h-[400px]">
                    <h2 className="text-xs font-black uppercase tracking-widest text-foreground-muted mb-4 text-center">Output Canvas</h2>

                    <div className="w-full aspect-square rounded-2xl border border-white/10 bg-background/50 flex items-center justify-center overflow-hidden relative shadow-2xl">
                        {isGenerating ? (
                            <div className="flex flex-col items-center gap-4 animate-pulse">
                                <div className="text-5xl">✨</div>
                                <div className="h-2 w-32 bg-primary/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-1/2 animate-bounce rounded-full" />
                                </div>
                            </div>
                        ) : generatedImage ? (
                            <img
                                src={generatedImage.startsWith('http') || generatedImage.startsWith('data:') ? generatedImage : `data:image/png;base64,${generatedImage}`}
                                alt="Generated prototype"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-center opacity-30">
                                <Icons.image className="w-12 h-12 mx-auto mb-2" />
                                <span className="text-xs font-bold uppercase tracking-widest">Awaiting Generation</span>
                            </div>
                        )}

                        {generatedImage && (
                            <div className="absolute top-4 right-4 flex gap-2">
                                <Button size="sm" variant="secondary" className="bg-black/50 backdrop-blur border-white/10 hover:bg-black/70">
                                    <Icons.download size={14} className="mr-2" /> Download
                                </Button>
                                <Button size="sm" variant="secondary" className="bg-black/50 backdrop-blur border-white/10 hover:bg-black/70">
                                    <Icons.save size={14} className="mr-2" /> Save
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
