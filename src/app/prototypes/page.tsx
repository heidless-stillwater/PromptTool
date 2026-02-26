'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icons';
import { usePrototypeFlags } from '@/hooks/usePrototypeFlags';

interface PrototypeEntry {
    slug: string;
    title: string;
    description: string;
    status: 'draft' | 'testing' | 'promoted';
    icon: string;
}

const PROTOTYPES: PrototypeEntry[] = [
    {
        slug: 'onboarding',
        title: 'New User Onboarding',
        description: 'Choose-your-path onboarding with exemplar gallery, interactive showcase, and 3-step MadLibs wizard.',
        status: 'testing',
        icon: '🚀',
    },
    {
        slug: 'nanobanana',
        title: 'Nanobanana Prompt Builder',
        description: 'Experiment with 3 distinct UI paradigms for constructing highly structured, AI-compiled prompts.',
        status: 'testing',
        icon: '🍌',
    },
];

export default function PrototypesIndex() {
    const { profile } = useAuth();
    const { flags, toggleFlag, loading } = usePrototypeFlags();

    const isAdmin = profile?.role === 'su' || profile?.role === 'admin';

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="p-8 text-center max-w-md">
                    <div className="text-4xl mb-4">🔒</div>
                    <h1 className="text-xl font-bold mb-2">Admin Access Required</h1>
                    <p className="text-foreground-muted text-sm">Prototypes are only accessible to admin and SU users.</p>
                    <Link href="/dashboard" className="text-primary text-sm font-bold mt-4 block hover:underline">
                        ← Back to Dashboard
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-5xl mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">🧪 Prototype Lab</h1>
                        <p className="text-foreground-muted mt-1">Test features in isolation before promoting to production.</p>
                    </div>
                    <Link href="/dashboard">
                        <Badge variant="outline" className="hover:border-primary/50 transition-colors cursor-pointer">
                            ← Dashboard
                        </Badge>
                    </Link>
                </div>

                <div className="grid gap-4">
                    {PROTOTYPES.map((proto) => {
                        const isLive = flags[proto.slug] === true;
                        return (
                            <Card key={proto.slug} className="p-6 hover:border-primary/30 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="text-3xl">{proto.icon}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h2 className="text-lg font-bold">{proto.title}</h2>
                                                <Badge
                                                    variant={proto.status === 'promoted' ? 'gradient' : 'outline'}
                                                    className="text-[9px] uppercase tracking-widest"
                                                >
                                                    {proto.status}
                                                </Badge>
                                                {isLive && (
                                                    <Badge variant="gradient" className="text-[9px] uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                                        LIVE
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-foreground-muted">{proto.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {/* Feature flag toggle */}
                                        <button
                                            onClick={() => toggleFlag(proto.slug)}
                                            disabled={loading}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${isLive ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isLive ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                        </button>

                                        <Link href={`/prototypes/${proto.slug}`}>
                                            <Badge variant="outline" className="cursor-pointer hover:border-primary/50 hover:text-primary transition-colors px-3 py-1.5">
                                                Preview →
                                            </Badge>
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {PROTOTYPES.length === 0 && (
                    <Card className="p-12 text-center">
                        <div className="text-4xl mb-4 opacity-20">🧪</div>
                        <p className="text-foreground-muted">No prototypes yet. Create one at <code className="text-xs bg-background-secondary px-2 py-1 rounded">/prototypes/your-name/page.tsx</code></p>
                    </Card>
                )}
            </div>
        </div>
    );
}
