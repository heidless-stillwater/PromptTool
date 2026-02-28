'use client';

import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import WalletWisdom from './WalletWisdom';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useTour } from '@/context/TourContext';
import CommunityPulse from '@/components/dashboard/CommunityPulse';
import Exemplars from '@/components/dashboard/Exemplars';
import Gallery from '@/components/dashboard/Gallery';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import UserPulseStats from '@/components/dashboard/UserPulseStats';

interface CasualModeViewProps {
    dashboardData: any;
}

export default function CasualModeView({ dashboardData }: CasualModeViewProps) {
    const { profile, credits, recentImages } = dashboardData;
    const router = useRouter();
    const [isTourModalOpen, setIsTourModalOpen] = useState(false);
    const { startTour } = useTour();

    return (
        <div className="space-y-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Refined Header like Community */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-widest">
                        <Icons.zap className="text-primary w-8 h-8" />
                        Neural Workstation
                    </h1>
                    <p className="text-white/40 mt-2 font-bold uppercase tracking-widest text-[10px]">
                        Architect high-fidelity intelligence. Your neural studio is primed.
                    </p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <Button
                        onClick={() => router.push('/generate')}
                        className="bg-primary text-white hover:bg-primary/90 px-8 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105"
                    >
                        <Icons.plus size={16} className="mr-2" />
                        Enter Studio
                    </Button>
                    <Link href="/community">
                        <Button
                            variant="secondary"
                            className="bg-background-secondary border border-border/50 hover:bg-background-tertiary px-8 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all"
                        >
                            <Icons.globe size={16} className="mr-2" />
                            Global Showcase
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Live Stats like Community Pulse */}
            <UserPulseStats dashboardData={dashboardData} />

            {/* Support Level: Wallet Wisdom */}
            <div id="wallet-wisdom" className="relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="py-12">
                    <WalletWisdom credits={credits} />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Community Engagement */}
            <div className="space-y-24">
                <div id="community-pulse">
                    <div className="flex items-center gap-4 mb-10 px-4">
                        <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Global Showcase</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
                    </div>
                    <CommunityPulse entries={dashboardData.recentCommunityEntries} />
                </div>

                <div id="your-gallery">
                    <div className="flex items-center gap-4 mb-10 px-4">
                        <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Private Vault</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
                    </div>
                    <Gallery images={recentImages} />
                </div>

                <div id="curated-exemplars">
                    <div className="flex items-center gap-4 mb-10 px-4">
                        <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Neural Prototypes</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
                    </div>
                    <Exemplars entries={dashboardData.exemplars} />
                </div>
            </div>

            {/* Support Level: Guided Tour Invite */}
            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="flex items-center gap-8 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-primary-light border border-white/5 shadow-inner">
                        <Icons.info size={24} />
                    </div>
                    <div>
                        <p className="font-black uppercase tracking-[0.2em] text-[12px] text-white mb-2">Architectural Onboarding</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 leading-relaxed max-w-md">Initialize your workflow with a comprehensive 1-minute briefing on system capabilities.</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="relative z-10 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20 whitespace-nowrap bg-black/40 text-[10px] font-black uppercase tracking-[0.2em] px-10 h-14 rounded-2xl transition-all"
                    onClick={() => setIsTourModalOpen(true)}
                >
                    Initialize Briefing
                </Button>
            </div>

            <ConfirmationModal
                isOpen={isTourModalOpen}
                title="Start Guided Tour?"
                message="This 1-minute tour will show you how to master the studio generator and manage your creative energy."
                confirmLabel="Start Tour"
                cancelLabel="Maybe Later"
                onConfirm={() => {
                    setIsTourModalOpen(false);
                    startTour();
                }}
                onCancel={() => setIsTourModalOpen(false)}
            />
        </div>
    );
}
