'use client';

import { useAdminSettings } from '@/hooks/useAdminSettings';
import StatusModal from '@/components/StatusModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

export default function AdminSettingsPage() {
    const {
        announcement,
        setAnnouncement,
        isSaving,
        model,
        setModel,
        safety,
        setSafety,
        modalStatus,
        setModalStatus,
        handleSave
    } = useAdminSettings();

    return (
        <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            <StatusModal
                status={modalStatus}
                onClose={() => setModalStatus('idle')}
            />

            {/* Announcement Banner */}
            <Card variant="glass" className="p-8 rounded-[2.5rem] border-border/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Icons.globe className="w-24 h-24" />
                </div>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">📢</div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Global Announcement</h3>
                        <p className="text-xs text-foreground-muted font-bold uppercase tracking-widest opacity-60">Visible on all generation interfaces</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <textarea
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                        className="w-full bg-[#0a0a0f] text-white border border-border/50 rounded-2xl p-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[150px] transition-all resize-none shadow-inner"
                        placeholder="Enter announcement text..."
                    />
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                id="show-banner"
                                defaultChecked
                                className="w-5 h-5 rounded-md border-border bg-background checked:bg-primary checked:border-primary transition-all cursor-pointer appearance-none border-2"
                            />
                            <Icons.check className="absolute w-3.5 h-3.5 text-white left-0.5 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity font-black" />
                        </div>
                        <label htmlFor="show-banner" className="text-xs font-black uppercase tracking-widest text-foreground-muted group-hover:text-foreground transition-colors cursor-pointer">
                            Display banner to all active users
                        </label>
                    </div>
                </div>
            </Card>

            {/* Model & Safety Config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card variant="glass" className="p-8 rounded-[2.5rem] border-border/50">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-sm">🤖</span>
                        Engine Selection
                    </h3>
                    <div className="space-y-4">
                        <EngineOption
                            id="flash"
                            name="Gemini 2.5 Flash"
                            description="Fastest, economical, stable."
                            selected={model === 'flash'}
                            onSelect={() => setModel('flash')}
                        />
                        <EngineOption
                            id="pro"
                            name="Gemini 3.0 Pro (Exp)"
                            description="Highest quality, slower generation."
                            selected={model === 'pro'}
                            onSelect={() => setModel('pro')}
                            highlight
                        />
                    </div>
                </Card>

                <Card variant="glass" className="p-8 rounded-[2.5rem] border-border/50">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-sm">🛡️</span>
                        Safety Thresholds
                    </h3>
                    <div className="space-y-6">
                        <Select
                            value={safety}
                            onChange={(e) => setSafety(e.target.value)}
                            className="text-xs font-black uppercase tracking-widest"
                        >
                            <option value="strict">Strict (BLOCK_LOW_AND_ABOVE)</option>
                            <option value="medium">Standard (BLOCK_MEDIUM_AND_ABOVE)</option>
                            <option value="permissive">Permissive (BLOCK_ONLY_HIGH)</option>
                        </Select>
                        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-2 flex items-center gap-2">
                                <Icons.info size={12} /> System Note
                            </p>
                            <p className="text-[10px] font-medium text-foreground-muted leading-relaxed uppercase tracking-tighter">
                                These settings apply globally but can be overridden by specific user profile rules.
                                Permissive mode may result in more blocked generations by the underlying API.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end pr-4">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="lg"
                    className="px-12 h-14 font-black uppercase tracking-widest shadow-2xl shadow-primary/25 rounded-2xl text-xs"
                    isLoading={isSaving}
                >
                    Save Global Settings
                </Button>
            </div>
        </div>
    );
}

function EngineOption({ id, name, description, selected, onSelect, highlight }: {
    id: string,
    name: string,
    description: string,
    selected: boolean,
    onSelect: () => void,
    highlight?: boolean
}) {
    return (
        <label className={cn(
            "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
            selected
                ? "bg-primary/5 border-primary shadow-lg shadow-primary/5"
                : "bg-background-secondary/50 border-border/30 hover:border-primary/50"
        )}>
            <div className="relative flex items-center">
                <input
                    type="radio"
                    name="model"
                    checked={selected}
                    onChange={onSelect}
                    className="w-5 h-5 border-2 border-border bg-background checked:bg-primary checked:border-primary transition-all cursor-pointer appearance-none rounded-full"
                />
                {selected && <div className="absolute w-2 h-2 bg-white rounded-full left-1.5" />}
            </div>
            <div>
                <p className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    highlight ? "text-accent" : "text-foreground",
                    selected && !highlight ? "text-primary" : ""
                )}>
                    {name}
                </p>
                <p className="text-[10px] text-foreground-muted font-bold uppercase tracking-tighter opacity-60">
                    {description}
                </p>
            </div>
        </label>
    );
}
