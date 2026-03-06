import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "@/components/ui/Icons";
import { Modifier } from "@/app/generate/page";
import { MODIFIER_CATEGORIES } from "@/lib/constants";
import Tooltip from "@/components/Tooltip";

interface DNAModifierModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeModifiers: Modifier[];
    onToggleModifier: (category: string, value: string) => void;
    onClearAll: () => void;
    userLevel: string;
    rawPromptPreview: string;
    displayPrompt: string;
    handleCopyPrompt: () => void;
    dnaViewMode: "subject" | "full";
    setDnaViewMode: (mode: "subject" | "full") => void;
}

export default function DNAModifierModal({
    isOpen,
    onClose,
    activeModifiers,
    onToggleModifier,
    onClearAll,
    userLevel,
    rawPromptPreview,
    displayPrompt,
    handleCopyPrompt,
    dnaViewMode,
    setDnaViewMode,
}: DNAModifierModalProps) {
    const [openModifierCategories, setOpenModifierCategories] = useState<
        string[]
    >(MODIFIER_CATEGORIES.map((c) => c.id)); // Default all open for easier scanning in modal

    const toggleModifierCategory = (categoryId: string) => {
        setOpenModifierCategories((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId],
        );
    };

    const isPro = userLevel !== "novice";

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 bg-black/80 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className={`w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#0a0a0f] border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden`}
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-white/10 px-8 py-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                        <Icons.settings size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black uppercase tracking-widest text-white leading-none">
                                            DNA Helix Configuration
                                        </h2>
                                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-foreground-muted mt-1">
                                            Configure your generation modifiers
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all"
                                >
                                    <Icons.close size={18} />
                                </button>
                            </div>

                            {/* Active Modifiers (Sticky Context) */}
                            <div className="flex flex-col gap-2 pt-2 border-t border-white/5 mt-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                        Active Modifiers ({activeModifiers.length})
                                    </span>
                                    {activeModifiers.length > 0 && (
                                        <button
                                            onClick={onClearAll}
                                            className="text-[9px] font-bold uppercase tracking-widest text-error/70 hover:text-error transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 min-h-[32px] max-h-[64px] overflow-y-auto custom-scrollbar pr-2 py-1">
                                    {activeModifiers.length === 0 ? (
                                        <span className="text-xs text-foreground-muted/50 italic">
                                            No modifiers active. Select from below to build your DNA.
                                        </span>
                                    ) : (
                                        activeModifiers.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => onToggleModifier(m.category, m.value)}
                                                className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:border-error/50 hover:bg-error/20 text-[10px] uppercase flex items-center gap-2 transition-all text-primary group/chip"
                                            >
                                                <span className="opacity-50">{m.category}:</span>
                                                <span className="font-bold">{m.value}</span>
                                                <Icons.close
                                                    size={10}
                                                    className="opacity-0 group-hover/chip:opacity-100 group-hover/chip:text-error transition-opacity"
                                                />
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* DNA Structure Details (Added for consistency) */}
                            {userLevel !== "novice" && (
                                <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                                {userLevel === "master" ? "DNA Structure" : "Synthesized"}
                                            </span>
                                            <div className="flex items-center gap-3 ml-2">
                                                <Tooltip content="Copy full prompt to buffer">
                                                    <button
                                                        onClick={handleCopyPrompt}
                                                        className="p-1 rounded-md bg-white/5 border border-white/10 text-white/60 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center shrink-0"
                                                    >
                                                        <Icons.copy size={14} />
                                                    </button>
                                                </Tooltip>
                                                <span className="text-[10px] font-mono text-foreground-muted/40 px-2 border-l border-white/10">
                                                    {dnaViewMode === "subject"
                                                        ? rawPromptPreview.length
                                                        : displayPrompt.length}{" "}
                                                    chars
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex bg-black/40 p-0.5 rounded-md border border-white/5">
                                            <button
                                                onClick={() => setDnaViewMode("subject")}
                                                className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${dnaViewMode === "subject" ? "bg-primary text-white shadow" : "text-foreground-muted hover:text-white"}`}
                                            >
                                                Subject
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDnaViewMode("full")}
                                                className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${dnaViewMode === "full" ? "bg-purple-600 text-white shadow" : "text-foreground-muted hover:text-white"}`}
                                            >
                                                Full
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-3 rounded-xl text-xs font-medium italic transition-colors leading-relaxed line-clamp-2 hover:line-clamp-none cursor-help ${dnaViewMode === "full" ? "bg-purple-500/5 border border-purple-500/10 text-purple-200/90" : "bg-primary/5 border border-primary/10 text-white/70"}`}>
                                        {dnaViewMode === "subject" ? (
                                            rawPromptPreview || "Waiting for DNA..."
                                        ) : (
                                            displayPrompt || "No woven DNA yet..."
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Categories List */}
                        <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                            {MODIFIER_CATEGORIES.map((cat) => {
                                const isCatOpen = openModifierCategories.includes(cat.id);
                                const activeInCategory = activeModifiers.filter(
                                    (m) => m.category === cat.id,
                                );

                                return (
                                    <div
                                        key={cat.id}
                                        className="border-b border-white/5 pb-8 last:border-0 last:pb-0"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleModifierCategory(cat.id)}
                                            className="w-full flex justify-between items-center group/cat hover:bg-white/[0.02] p-4 -mx-4 rounded-xl transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span
                                                    className={`text-xs font-black uppercase tracking-widest transition-colors ${activeInCategory.length > 0 ? "text-primary" : "text-white/60 group-hover/cat:text-white/90"}`}
                                                >
                                                    {cat.label}
                                                </span>
                                                {!isCatOpen && activeInCategory.length > 0 && (
                                                    <span className="text-[10px] font-mono tracking-normal text-white/50 italic">
                                                        &mdash;{" "}
                                                        {activeInCategory.map((m) => m.value).join(" + ")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {activeInCategory.length > 0 && (
                                                    <div className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold">
                                                        {activeInCategory.length} Active
                                                    </div>
                                                )}
                                                <Icons.chevronDown
                                                    size={16}
                                                    className={`text-white/30 group-hover/cat:text-white/60 transition-transform duration-300 ${isCatOpen ? "rotate-180" : ""}`}
                                                />
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {isCatOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="flex flex-wrap gap-2 pt-4 pb-2">
                                                        {cat.options.map((opt) => {
                                                            const isActive = activeModifiers.some(
                                                                (m) =>
                                                                    m.category === cat.id &&
                                                                    m.value.toLowerCase() === opt.toLowerCase(),
                                                            );
                                                            return (
                                                                <button
                                                                    key={opt}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onToggleModifier(cat.id, opt)
                                                                    }
                                                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all duration-200 ${isActive
                                                                        ? "border-primary bg-primary/20 text-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                                                        : "border-white/10 bg-white/5 text-white/50 hover:border-white/30 hover:text-white hover:bg-white/10"
                                                                        }`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-md flex justify-end sticky bottom-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all"
                            >
                                Confirm & Apply DNA
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}