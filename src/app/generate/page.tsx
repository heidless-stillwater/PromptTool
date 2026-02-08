'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PROMPT_CATEGORIES, buildPromptFromMadLibs, FEATURED_PROMPTS } from '@/lib/prompt-templates';
import { ImageQuality, AspectRatio, MadLibsSelection, CREDIT_COSTS, SUBSCRIPTION_PLANS } from '@/lib/types';
import Link from 'next/link';

type PromptMode = 'freeform' | 'madlibs' | 'featured';

export default function GeneratePage() {
    const { user, profile, credits, loading, refreshCredits } = useAuth();
    const router = useRouter();

    // State
    const [promptMode, setPromptMode] = useState<PromptMode>('freeform');
    const [prompt, setPrompt] = useState('');
    const [madLibs, setMadLibs] = useState<MadLibsSelection>({
        subject: PROMPT_CATEGORIES.subjects[0],
        action: PROMPT_CATEGORIES.actions[0],
        style: PROMPT_CATEGORIES.styles[0],
        mood: '',
        setting: '',
    });
    const [quality, setQuality] = useState<ImageQuality>('standard');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Calculate available credits
    const availableCredits = credits
        ? credits.balance + Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    // Check if quality is allowed for subscription
    const allowedQualities = profile
        ? SUBSCRIPTION_PLANS[profile.subscription].allowedQualities
        : ['standard'];

    // Get final prompt based on mode
    const getFinalPrompt = (): string => {
        if (promptMode === 'freeform') {
            return prompt;
        } else if (promptMode === 'madlibs') {
            return buildPromptFromMadLibs(madLibs);
        } else {
            return prompt; // Featured prompt already set
        }
    };

    // Handle image generation
    const handleGenerate = async () => {
        const finalPrompt = getFinalPrompt();

        if (!finalPrompt.trim()) {
            setError('Please enter a prompt');
            return;
        }

        const cost = CREDIT_COSTS[quality];
        if (availableCredits < cost) {
            setError(`Insufficient credits. Need ${cost}, have ${availableCredits}`);
            return;
        }

        setError('');
        setGenerating(true);
        setGeneratedImage(null);

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: finalPrompt,
                    quality,
                    aspectRatio,
                    promptType: promptMode === 'madlibs' ? 'madlibs' : 'freeform',
                    madlibsData: promptMode === 'madlibs' ? madLibs : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Generation failed');
            }

            setGeneratedImage(data.imageUrl);
            await refreshCredits();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    // Download image
    const handleDownload = async (format: 'png' | 'jpeg' = 'png') => {
        if (!generatedImage) return;

        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `ai-image-${Date.now()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!user || !profile) {
        return null;
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold gradient-text">
                        AI Image Studio
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="credit-badge">
                            <span>{availableCredits} credits</span>
                        </div>
                        <Link href="/dashboard" className="btn-secondary text-sm px-4 py-2">
                            ← Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Controls */}
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Create Image</h1>
                            <p className="text-foreground-muted">Describe your vision and watch it come to life</p>
                        </div>

                        {/* Prompt Mode Tabs */}
                        <div className="flex gap-2 p-1 bg-background-secondary rounded-xl">
                            {(['freeform', 'madlibs', 'featured'] as PromptMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setPromptMode(mode)}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${promptMode === mode
                                            ? 'bg-primary text-white'
                                            : 'text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    {mode === 'freeform' ? 'Free Text' : mode === 'madlibs' ? 'Builder' : 'Featured'}
                                </button>
                            ))}
                        </div>

                        {/* Prompt Input based on mode */}
                        <div className="card">
                            {promptMode === 'freeform' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Your Prompt</label>
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="A majestic dragon flying over snow-capped mountains at sunset, photorealistic..."
                                        className="input-field h-32 resize-none"
                                    />
                                    <p className="text-xs text-foreground-muted mt-2">
                                        {prompt.length} characters • Be descriptive for best results
                                    </p>
                                </div>
                            )}

                            {promptMode === 'madlibs' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Subject</label>
                                        <select
                                            value={madLibs.subject}
                                            onChange={(e) => setMadLibs({ ...madLibs, subject: e.target.value })}
                                            className="select-field"
                                        >
                                            {PROMPT_CATEGORIES.subjects.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Action</label>
                                        <select
                                            value={madLibs.action}
                                            onChange={(e) => setMadLibs({ ...madLibs, action: e.target.value })}
                                            className="select-field"
                                        >
                                            {PROMPT_CATEGORIES.actions.map((a) => (
                                                <option key={a} value={a}>{a}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Art Style</label>
                                        <select
                                            value={madLibs.style}
                                            onChange={(e) => setMadLibs({ ...madLibs, style: e.target.value })}
                                            className="select-field"
                                        >
                                            {PROMPT_CATEGORIES.styles.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Mood (Optional)</label>
                                            <select
                                                value={madLibs.mood}
                                                onChange={(e) => setMadLibs({ ...madLibs, mood: e.target.value })}
                                                className="select-field"
                                            >
                                                <option value="">Select mood...</option>
                                                {PROMPT_CATEGORIES.moods.map((m) => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2">Setting (Optional)</label>
                                            <select
                                                value={madLibs.setting}
                                                onChange={(e) => setMadLibs({ ...madLibs, setting: e.target.value })}
                                                className="select-field"
                                            >
                                                <option value="">Select setting...</option>
                                                {PROMPT_CATEGORIES.settings.map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="p-4 bg-background-secondary rounded-lg">
                                        <p className="text-sm text-foreground-muted mb-1">Preview:</p>
                                        <p className="text-sm">{buildPromptFromMadLibs(madLibs)}</p>
                                    </div>
                                </div>
                            )}

                            {promptMode === 'featured' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {FEATURED_PROMPTS.map((fp) => (
                                        <button
                                            key={fp.id}
                                            onClick={() => setPrompt(fp.prompt)}
                                            className={`p-4 rounded-xl text-left transition-all ${prompt === fp.prompt
                                                    ? 'bg-primary/20 border-primary'
                                                    : 'bg-background-secondary hover:bg-background-secondary/80'
                                                } border border-transparent`}
                                        >
                                            <span className="text-xs font-medium text-accent">{fp.category}</span>
                                            <p className="font-medium mt-1">{fp.title}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quality & Aspect Ratio */}
                        <div className="card">
                            <h3 className="font-semibold mb-4">Settings</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Quality</label>
                                    <select
                                        value={quality}
                                        onChange={(e) => setQuality(e.target.value as ImageQuality)}
                                        className="select-field"
                                    >
                                        <option value="standard" disabled={!allowedQualities.includes('standard')}>
                                            Standard (1024px) - {CREDIT_COSTS.standard} credit
                                        </option>
                                        <option value="high" disabled={!allowedQualities.includes('high')}>
                                            High (2K) - {CREDIT_COSTS.high} credits
                                        </option>
                                        <option value="ultra" disabled={!allowedQualities.includes('ultra')}>
                                            Ultra (4K) - {CREDIT_COSTS.ultra} credits {!allowedQualities.includes('ultra') ? '(Pro only)' : ''}
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                                    <select
                                        value={aspectRatio}
                                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                        className="select-field"
                                    >
                                        <option value="1:1">1:1 (Square)</option>
                                        <option value="4:3">4:3 (Classic)</option>
                                        <option value="3:4">3:4 (Portrait)</option>
                                        <option value="16:9">16:9 (Widescreen)</option>
                                        <option value="9:16">9:16 (Mobile)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-error/10 border border-error/30 rounded-xl text-error text-sm">
                                {error}
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={generating || availableCredits < CREDIT_COSTS[quality]}
                            className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="spinner w-5 h-5 border-2" />
                                    Generating...
                                </span>
                            ) : (
                                <span>Generate Image ({CREDIT_COSTS[quality]} credit{CREDIT_COSTS[quality] > 1 ? 's' : ''})</span>
                            )}
                        </button>
                    </div>

                    {/* Right: Preview */}
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <div className="card">
                            <h3 className="font-semibold mb-4">Preview</h3>

                            <div
                                className="relative bg-background-secondary rounded-xl overflow-hidden flex items-center justify-center"
                                style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                            >
                                {generating ? (
                                    <div className="text-center">
                                        <div className="spinner mx-auto mb-4" />
                                        <p className="text-foreground-muted">Creating your masterpiece...</p>
                                    </div>
                                ) : generatedImage ? (
                                    <img
                                        src={generatedImage}
                                        alt="Generated"
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="text-center p-8">
                                        <div className="text-6xl mb-4 opacity-30">🎨</div>
                                        <p className="text-foreground-muted">
                                            Your generated image will appear here
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Download Options */}
                            {generatedImage && (
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={() => handleDownload('png')}
                                        className="btn-secondary flex-1"
                                    >
                                        Download PNG
                                    </button>
                                    <button
                                        onClick={() => handleDownload('jpeg')}
                                        className="btn-secondary flex-1"
                                    >
                                        Download JPEG
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
