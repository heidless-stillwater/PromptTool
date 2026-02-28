'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/context/SettingsContext';
import Tooltip from '@/components/Tooltip';

interface GenerateHeaderProps {
    availableCredits: number;
    onHistoryOpen: () => void;
    isAdmin: boolean;
}

export default function GenerateHeader({
    availableCredits,
    onHistoryOpen,
    isAdmin
}: GenerateHeaderProps) {
    const { helpModeEnabled, toggleHelpMode } = useSettings();
    return (
        <Card variant="glass" className="sticky top-0 z-50 border-x-0 border-t-0 rounded-none border-b border-border p-0">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Tooltip content="EXIT STUDIO: Return to your primary dashboard or gallery." position="right">
                        <Link href="/dashboard">
                            <Button variant="secondary" size="icon" className="w-9 h-9">
                                <Icons.arrowLeft size={18} />
                            </Button>
                        </Link>
                    </Tooltip>
                    <div className="hidden sm:block">
                        <Link href="/dashboard" className="text-xl font-black tracking-tighter gradient-text hover:opacity-80 transition-opacity">
                            STILLWATER<span className="text-foreground"> STUDIO</span>
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Tooltip content="HELP MODE: Toggle the global information layer for contextual tooltips." position="bottom">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleHelpMode}
                            className={cn(
                                "w-9 h-9 rounded-xl transition-all duration-300 border flex items-center justify-center",
                                helpModeEnabled
                                    ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                    : "bg-white/[0.03] border-white/5 text-white/30 hover:text-white"
                            )}
                        >
                            <Icons.info size={16} />
                        </Button>
                    </Tooltip>                    <Tooltip content="TIMELINE: Retrieve previously woven prompts and their architectural configurations." position="bottom">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onHistoryOpen}
                            className="h-9 gap-2 font-bold px-4"
                        >
                            <Icons.history size={16} />
                            <span className="hidden md:inline">History</span>
                        </Button>
                    </Tooltip>
                    <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />

                    <Tooltip content="ENERGY: Your current balance of neural processing units. Consumed during generation." position="bottom">
                        <Link href="/pricing" className="group">
                            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-background-secondary border border-border rounded-xl group-hover:border-primary/50 transition-all shadow-sm">
                                <div className="relative">
                                    <Icons.zap size={14} className="text-primary fill-primary animate-pulse" />
                                    <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full animate-pulse" />
                                </div>
                                <span className="text-sm font-black tracking-tight">{availableCredits}</span>
                                <Badge variant="primary" size="sm" className="bg-primary/10 text-primary border-0 !text-[8px] px-1 animate-in zoom-in-50">
                                    Credits
                                </Badge>
                            </div>
                        </Link>
                    </Tooltip>

                    {isAdmin && (
                        <Link href="/admin">
                            <Button variant="secondary" size="icon" className="w-9 h-9 border-primary/20 text-primary hover:bg-primary/10">
                                <Icons.settings size={16} />
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </Card>
    );
}
