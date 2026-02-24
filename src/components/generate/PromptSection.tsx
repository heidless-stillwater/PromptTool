'use client';

import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { PROMPT_CATEGORIES, buildPromptFromMadLibs, FEATURED_PROMPTS } from '@/lib/prompt-templates';
import { MadLibsSelection } from '@/lib/types';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/Tooltip';

type PromptMode = 'freeform' | 'madlibs' | 'featured';

import { motion, AnimatePresence } from 'framer-motion';

interface PromptSectionProps {
    promptMode: PromptMode;
    setPromptMode: (mode: PromptMode) => void;
    prompt: string;
    setPrompt: (prompt: string) => void;
    madLibs: MadLibsSelection;
    setMadLibs: (madLibs: MadLibsSelection) => void;
    handleEnhancePrompt: () => void;
    enhancing: boolean;
    isCasual: boolean;
    referenceImage: { url: string } | null;
    loadingReference: boolean;
    onRemoveReference: () => void;
    onUploadReference: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenGalleryPicker: () => void;
    onOpenPromptPicker: () => void;
}

export default function PromptSection({
    promptMode,
    setPromptMode,
    prompt,
    setPrompt,
    madLibs,
    setMadLibs,
    handleEnhancePrompt,
    enhancing,
    isCasual,
    referenceImage,
    loadingReference,
    onRemoveReference,
    onUploadReference,
    onOpenGalleryPicker,
    onOpenPromptPicker
}: PromptSectionProps) {
    return (
        <div className="space-y-6">
            {!isCasual && (
                <div className="flex p-1 bg-background-secondary rounded-xl border border-border shadow-sm">
                    {(['freeform', 'madlibs', 'featured'] as PromptMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setPromptMode(mode)}
                            className={cn(
                                "flex-1 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                promptMode === mode
                                    ? "bg-background shadow-md text-primary"
                                    : "text-foreground-muted hover:text-foreground"
                            )}
                        >
                            {mode === 'freeform' ? 'Free Text' : mode === 'madlibs' ? 'Builder' : 'Featured'}
                        </button>
                    ))}
                </div>
            )}

            <Card className="relative overflow-visible p-5 border-border shadow-sm transition-all duration-500" variant="glass">
                {/* Initial sparkle effect on entrance */}
                <motion.div
                    className="absolute -inset-[1px] rounded-[2rem] border-2 border-primary/50 pointer-events-none z-20"
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                />

                {/* Reference Image Preview - Visible in all modes if active */}
                {(loadingReference || referenceImage) && (
                    <div className="mb-6 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-4 relative animate-in slide-in-from-top-2 duration-300">
                        {loadingReference ? (
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center animate-pulse">
                                    <Icons.spinner size={16} className="animate-spin text-primary" />
                                </div>
                                <div className="text-xs font-bold text-foreground-muted animate-pulse">Analyzing reference...</div>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary/20 shadow-md relative">
                                    <img src={referenceImage!.url} alt="Reference" className="w-full h-full object-cover" />
                                    {(referenceImage as any)?.isVideo && (
                                        <div className="absolute bottom-0.5 right-0.5 bg-black/70 rounded px-1 py-0.5 text-[8px] text-white font-bold leading-none">
                                            🎬
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icons.history size={12} className="text-primary" />
                                        <span className="text-[10px] font-black text-primary uppercase tracking-wider">Variation mode active</span>
                                    </div>
                                    <p className="text-[10px] text-foreground-muted italic leading-tight">
                                        {(referenceImage as any)?.isVideo
                                            ? 'Using video still frame as visual reference'
                                            : 'Using previous generation as visual reference'}
                                    </p>
                                </div>
                                <button
                                    onClick={onRemoveReference}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-foreground-muted"
                                >
                                    <Icons.close size={14} />
                                </button>
                            </>
                        )}
                    </div>
                )}

                {promptMode === 'freeform' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted ml-1">Your Vision</label>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        id="ref-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={onUploadReference}
                                    />
                                    <Tooltip content="Upload Reference">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-7 w-7 bg-background-secondary border-border/50 hover:border-primary/50 text-foreground-muted hover:text-primary transition-all"
                                            onClick={() => document.getElementById('ref-upload')?.click()}
                                        >
                                            <Icons.upload size={12} />
                                        </Button>
                                    </Tooltip>

                                    <Tooltip content="Set Reference Image">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-7 w-7 bg-background-secondary border-border/50 hover:border-primary/50 text-foreground-muted hover:text-primary transition-all"
                                            onClick={onOpenGalleryPicker}
                                        >
                                            <Icons.image size={12} />
                                        </Button>
                                    </Tooltip>

                                    <Tooltip content="Import Prompt from Gallery">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-7 w-7 bg-background-secondary border-border/50 hover:border-primary/50 text-foreground-muted hover:text-primary transition-all"
                                            onClick={onOpenPromptPicker}
                                        >
                                            <Icons.text size={12} />
                                        </Button>
                                    </Tooltip>
                                </div>
                            </div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button
                                    id="magic-enhance"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleEnhancePrompt}
                                    disabled={enhancing || !prompt.trim()}
                                    className="h-8 px-3 text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:from-purple-500/20 hover:to-pink-500/20 text-purple-600 transition-all group relative overflow-hidden"
                                >
                                    <AnimatePresence mode="wait">
                                        {enhancing ? (
                                            <motion.div
                                                key="spinner"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="flex items-center"
                                            >
                                                <Icons.spinner size={12} className="mr-2 animate-spin" />
                                                Enhancing...
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="wand"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="flex items-center"
                                            >
                                                <Icons.wand size={12} className="mr-2 text-purple-500 group-hover:rotate-12 transition-transform shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                                                Enhance
                                                <motion.div
                                                    className="absolute inset-x-0 top-0 h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"
                                                    style={{ transform: 'skewX(-20deg)' }}
                                                    transition={{ duration: 0.5 }}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Button>
                            </motion.div>
                        </div>

                        <div className="relative group/prompt">
                            <AnimatePresence>
                                {enhancing && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden border-2 border-purple-500/30"
                                    >
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
                                            animate={{ translateX: ['-100%', '100%'] }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                        />
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"
                                            animate={{
                                                opacity: [0.4, 0.8, 0.4],
                                            }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <textarea
                                id="prompt-input"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="A majestic dragon flying over snow-capped mountains at sunset, cinematic lighting, photorealistic..."
                                className={cn(
                                    "w-full rounded-xl bg-background-secondary border border-border text-foreground transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-foreground-muted h-40 resize-none py-4 px-5 text-sm leading-relaxed scrollbar-hide relative z-0",
                                    prompt.length > 2000 && "border-error focus:ring-error/20",
                                    enhancing && "text-purple-600/50 cursor-wait"
                                )}
                                disabled={enhancing}
                            />
                            <div className="absolute bottom-3 right-3 flex items-center gap-3 z-20">
                                {prompt.length > 0 && !enhancing && (
                                    <button
                                        onClick={() => setPrompt('')}
                                        className="p-1 hover:text-error transition-colors text-foreground-muted"
                                    >
                                        <Icons.history size={14} className="rotate-45" />
                                    </button>
                                )}
                                <div className={cn(
                                    "text-[10px] font-black px-2 py-0.5 rounded-full bg-background-secondary border border-border",
                                    prompt.length > 2000 ? "text-error border-error/50 bg-error/5" : "text-foreground-muted"
                                )}>
                                    {prompt.length} / 2000
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-500 delay-150">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">Art Style</label>
                                <Select
                                    value={madLibs.style}
                                    onChange={(e) => setMadLibs({ ...madLibs, style: e.target.value })}
                                    className="bg-background-secondary"
                                >
                                    <option value="" className="bg-background text-foreground">Original / Freestyle</option>
                                    {PROMPT_CATEGORIES.styles.map((s) => (
                                        <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">Vibe</label>
                                <Select
                                    value={madLibs.mood}
                                    onChange={(e) => setMadLibs({ ...madLibs, mood: e.target.value })}
                                    className="bg-background-secondary"
                                >
                                    <option value="" className="bg-background text-foreground">No specific vibe</option>
                                    {PROMPT_CATEGORIES.moods.map((m) => (
                                        <option key={m} value={m} className="bg-background text-foreground">{m}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                {promptMode === 'madlibs' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">Subject</label>
                                <Select
                                    value={madLibs.subject}
                                    onChange={(e) => setMadLibs({ ...madLibs, subject: e.target.value })}
                                >
                                    <option value="" className="bg-background text-foreground">Choose a subject...</option>
                                    {PROMPT_CATEGORIES.subjects.map((s) => (
                                        <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">Action</label>
                                <Select
                                    value={madLibs.action}
                                    onChange={(e) => setMadLibs({ ...madLibs, action: e.target.value })}
                                >
                                    <option value="" className="bg-background text-foreground">Choose an action...</option>
                                    {PROMPT_CATEGORIES.actions.map((a) => (
                                        <option key={a} value={a} className="bg-background text-foreground">{a}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">Art Style</label>
                            <Select
                                value={madLibs.style}
                                onChange={(e) => setMadLibs({ ...madLibs, style: e.target.value })}
                            >
                                <option value="" className="bg-background text-foreground">Choose a style...</option>
                                {PROMPT_CATEGORIES.styles.map((s) => (
                                    <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">Mood</label>
                                <Select
                                    value={madLibs.mood}
                                    onChange={(e) => setMadLibs({ ...madLibs, mood: e.target.value })}
                                >
                                    <option value="" className="bg-background text-foreground">Choose a vibe...</option>
                                    {PROMPT_CATEGORIES.moods.map((m) => (
                                        <option key={m} value={m} className="bg-background text-foreground">{m}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">Setting</label>
                                <Select
                                    value={madLibs.setting}
                                    onChange={(e) => setMadLibs({ ...madLibs, setting: e.target.value })}
                                >
                                    <option value="" className="bg-background text-foreground">Choose a place...</option>
                                    {PROMPT_CATEGORIES.settings.map((s) => (
                                        <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="p-4 bg-background-secondary/50 rounded-2xl border border-dashed border-border/50">
                            <div className="flex items-center gap-2 mb-2">
                                <Icons.history size={12} className="text-foreground-muted" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Live Preview</span>
                            </div>
                            <p className="text-sm font-medium italic text-foreground leading-relaxed">&quot;{buildPromptFromMadLibs(madLibs)}&quot;</p>
                        </div>
                    </div>
                )}

                {promptMode === 'featured' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {FEATURED_PROMPTS.map((fp) => (
                            <button
                                key={fp.id}
                                onClick={() => setPrompt(fp.prompt)}
                                className={cn(
                                    "p-4 rounded-2xl text-left transition-all group relative overflow-hidden",
                                    prompt === fp.prompt
                                        ? "bg-primary/10 border-primary shadow-lg shadow-primary/5"
                                        : "bg-background-secondary hover:bg-background border-transparent hover:border-border"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant={prompt === fp.prompt ? 'primary' : 'secondary'} size="sm" className="!bg-primary/20 text-primary border-0">
                                        {fp.category}
                                    </Badge>
                                    {prompt === fp.prompt && <Icons.check size={14} className="text-primary" />}
                                </div>
                                <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{fp.title}</p>
                                <div className="absolute bottom-0 right-0 w-8 h-8 opacity-5">
                                    <Icons.image className="w-full h-full" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
