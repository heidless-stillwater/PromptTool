'use client';

import { Suspense, useState, useEffect } from 'react';
import { SkeletonDashboard } from '@/components/ui/SkeletonDashboard';
import { Button } from '@/components/ui/Button';

import { Icons } from '@/components/ui/Icons';
import Link from 'next/link';

// Specialized views
import CasualModeView from '@/components/dashboard/member/CasualModeView';
import ProModeView from '@/components/dashboard/member/ProModeView';
import Tooltip from '@/components/Tooltip';
import DashboardHero from './DashboardHero';
import DashboardStats from './DashboardStats';
import ResourceVitality from './ResourceVitality';
import CreditActivity from './CreditActivity';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { useSettings } from '@/lib/context/SettingsContext';

interface MemberDashboardProps {
    dashboardData: any;
}

export default function MemberDashboard({ dashboardData }: MemberDashboardProps) {
    const { userLevel } = useSettings();
    const {
        profile, setAudienceMode, authLoading, user, credits,
        availableCredits, effectiveRole, switchRole, signOut
    } = dashboardData;

    if (authLoading || !profile) {
        return <SkeletonDashboard />;
    }

    const isCasual = profile.audienceMode === 'casual';

    return (
        <div className="min-h-screen bg-[#020203] text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.15),transparent_60%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.1),transparent_60%)] pointer-events-none" />

            <DashboardHeader
                user={user}
                profile={profile}
                credits={credits}
                availableCredits={availableCredits || 0}
                isAdminOrSu={false}
                effectiveRole={effectiveRole}
                switchRole={switchRole}
                setAudienceMode={setAudienceMode}
                signOut={signOut}
            />

            {/* Mode Switcher - Sticky below the header */}
            <div className="sticky top-[73px] z-40 w-full bg-background/60 backdrop-blur-xl border-b border-white/5 shadow-2xl">
                <div className="w-full max-w-none px-4 sm:px-6 md:px-8 py-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-6">
                    <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hidden lg:inline">Experience</span>
                        <div className="flex bg-background-secondary rounded-xl p-1 border border-border/50 shadow-inner backdrop-blur-md">
                            <Tooltip content="CASUAL: Focus on discovery. Simplified UI with curated style guides and automated prompt synthesis.">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAudienceMode('casual')}
                                    className={`px-6 py-2 rounded-lg text-[10px] h-9 font-black tracking-[0.2em] uppercase transition-all duration-500 ${isCasual
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-white/20 hover:text-white/60 hover:bg-white/5'
                                        }`}
                                >
                                    Casual
                                </Button>
                            </Tooltip>
                            <Tooltip content="PROFESSIONAL: Full architectural oversight. Granular control over DNA constituents, batch parameters, and advanced analytics.">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAudienceMode('professional')}
                                    className={`px-6 py-2 rounded-lg text-[10px] h-9 font-black tracking-[0.2em] uppercase transition-all duration-500 ${!isCasual
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                        : 'text-white/20 hover:text-white/60 hover:bg-white/5'
                                        }`}
                                >
                                    Professional
                                </Button>
                            </Tooltip>
                        </div>

                        {/* Anchor Navigation */}
                        <div className="flex items-center gap-2 ml-4 pl-8 border-l border-white/10 hidden xl:flex">
                            {(userLevel === 'master' ? [
                                { id: 'pro-stats', label: 'Stats' },
                                { id: 'recent-creations', label: 'Work' },
                                { id: 'analytics', label: 'Analytics' },
                                { id: 'community-pulse', label: 'Showcase' },
                                { id: 'curated-exemplars', label: 'Exemplars' }
                            ] : userLevel === 'journeyman' ? [
                                { id: 'recent-creations', label: 'Project Work' },
                                { id: 'community-pulse', label: 'The Stream' },
                                { id: 'your-gallery', label: 'Personal Vault' },
                                { id: 'curated-exemplars', label: 'Exemplars' }
                            ] : [
                                { id: 'wallet-wisdom', label: 'Wisdom' },
                                { id: 'community-pulse', label: 'Inspirations' },
                                { id: 'your-gallery', label: 'My Journey' },
                                { id: 'curated-exemplars', label: 'Exemplars' }
                            ]).map(link => (
                                <a
                                    key={link.id}
                                    href={`#${link.id}`}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-300"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-secondary border border-border/50">
                            <Icons.circle size={8} className="text-primary fill-primary animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">System Online</span>
                        </div>
                        <Tooltip content="MANDATORY TOUR: New to Stillwater? Take a guided flight through the Studio and Neural Vault mechanisms.">
                            <Link href="/prototypes/onboarding">
                                <Button variant="outline" size="sm" className="h-9 rounded-lg text-[10px] font-black tracking-[0.2em] uppercase gap-3 hover:bg-primary/10 text-white/40 hover:text-white border-border/50 hover:border-primary/40 transition-all duration-500 group">
                                    <Icons.sparkles size={14} className="text-primary group-hover:rotate-12 transition-transform" />
                                    Onboarding
                                </Button>
                            </Link>
                        </Tooltip>
                    </div>
                </div>
            </div>

            <main className="w-full max-w-none px-4 sm:px-6 md:px-8 py-12 relative z-10">
                {/* Level-based welcome */}
                <div className="mb-12">
                    <h1 className="text-4xl font-black uppercase tracking-tight text-white mb-2">
                        {userLevel === 'novice' ? 'Guided Discovery' : userLevel === 'journeyman' ? 'Creation Studio' : 'Expert Oversight'}
                    </h1>
                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary/60">
                        {userLevel === 'novice'
                            ? 'The simplest path from imagination to masterpiece.'
                            : userLevel === 'journeyman'
                                ? 'Refining your architectural vision through neural synthesis.'
                                : 'Master-tier Command & Control over the Stillwater engine.'}
                    </p>
                </div>

                {/* Getting Started banner for new users */}
                <GettingStartedBanner profile={profile} userLevel={userLevel} />

                <div className="mb-10">
                    <ResourceVitality
                        usage={dashboardData.resourceUsageData?.usage || {}}
                        quotas={dashboardData.resourceUsageData?.quotas || { storageBytes: 0, dbWritesDaily: 0, cpuTimeMsPerMonth: 0, burstAllowanceBytes: 0 }}
                        burstUsed={credits?.isOxygenDeployed || false}
                        burstAuthorized={credits?.isOxygenAuthorized || false}
                        tier={dashboardData.resourceUsageData?.tier || 'free'}
                        loading={dashboardData.resourceUsageLoading}
                    />
                </div>


                <Suspense fallback={<SkeletonDashboard />}>
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        {isCasual ? (
                            <CasualModeView dashboardData={dashboardData} />
                        ) : (
                            <ProModeView dashboardData={dashboardData} />
                        )}
                    </div>
                </Suspense>
            </main>
        </div >
    );
}

/** Dismissible banner linking to onboarding prototype */
function GettingStartedBanner({ profile, userLevel }: { profile: any; userLevel: string }) {
    const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

    useEffect(() => {
        const wasDismissed = localStorage.getItem('onboarding_banner_dismissed');
        const completed = profile?.hasCompletedOnboarding;
        setDismissed(!!wasDismissed || !!completed);
    }, [profile]);

    if (dismissed) return null;

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('onboarding_banner_dismissed', 'true');
    };

    return (
        <div className="mb-6 rounded-2xl p-6 border border-primary/30 bg-primary/10 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-500 backdrop-blur-sm">
            <div className="flex items-center gap-4">
                <div className="text-3xl filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                    {userLevel === 'master' ? '🛠️' : '🚀'}
                </div>
                <div>
                    <h3 className="font-black text-sm uppercase tracking-widest text-white">
                        {userLevel === 'novice' ? 'New here? Get started in seconds' : 'Optimize your Engineering workflow'}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mt-1">
                        {userLevel === 'novice'
                            ? 'Try our guided onboarding — create your first AI image with curated examples.'
                            : 'Explore our professional Studio mechanisms and high-fidelity archival management.'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                <Link href="/prototypes/onboarding">
                    <Button variant="primary" size="sm" className="text-[10px] font-black uppercase tracking-widest px-4">
                        {userLevel === 'novice' ? '✨ Start Tour' : '🛠️ Review Workflows'}
                    </Button>
                </Link>
                <button onClick={handleDismiss} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-white/50 hover:text-white">
                    <Icons.close size={14} />
                </button>
            </div>
        </div>
    );
}
