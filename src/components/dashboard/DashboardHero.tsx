'use client';

import Link from 'next/link';

interface DashboardHeroProps {
    audienceMode: 'casual' | 'professional';
    userId: string;
}

export default function DashboardHero({ audienceMode, userId }: DashboardHeroProps) {
    return (
        <div className={`mb-8 p-6 rounded-2xl border transition-all duration-500 ${audienceMode === 'casual'
            ? 'bg-primary/5 border-primary/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]'
            : 'bg-accent/5 border-accent/20 shadow-[inset_0_0_20px_rgba(217,70,239,0.05)]'
            }`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${audienceMode === 'casual' ? 'bg-primary text-white' : 'bg-accent text-white'
                            }`}>
                            {audienceMode} mode active
                        </span>
                        <h2 className="text-2xl font-bold">
                            {audienceMode === 'casual' ? 'Ready to have some fun?' : 'Precision Image Studio'}
                        </h2>
                    </div>
                    <p className="text-foreground-muted max-w-xl">
                        {audienceMode === 'casual'
                            ? 'In Casual mode, we guide you through creating prompts using our Build-a-Prompt tool. It is perfect for fast, high-quality results without the technical jargon.'
                            : 'Professional mode gives you full tool access, granular settings, and a free-form text environment for absolute creative control.'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        href={`/profile/${userId}`}
                        className="btn-secondary flex items-center justify-center gap-2 py-4 px-6 text-sm font-bold"
                    >
                        <span>👤</span>
                        <span>Public Profile</span>
                    </Link>
                    <Link
                        href="/generate"
                        className={`btn-primary flex items-center gap-3 py-4 px-8 text-lg font-bold group transition-all duration-300 ${audienceMode === 'professional' ? '!bg-accent !shadow-accent/30' : ''
                            }`}
                    >
                        <span>{audienceMode === 'casual' ? 'Start Creating' : 'New Generation'}</span>
                        <svg className="group-hover:translate-x-1 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}
