'use client';

import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Icons } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { useSettings } from '@/lib/context/SettingsContext';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
    user: any;
    profile: any;
    credits: any;
    effectiveRole: string;
    availableCredits: number;
    isAdminOrSu: boolean;
    switchRole: (role: any) => void;
    setAudienceMode: (mode: 'casual' | 'professional') => void;
    signOut: () => void;
    onHistoryOpen?: () => void;
}

export default function DashboardHeader({
    user,
    profile,
    availableCredits,
    isAdminOrSu,
    effectiveRole,
    switchRole,
    setAudienceMode,
    signOut,
    onHistoryOpen
}: DashboardHeaderProps) {
    const { helpModeEnabled, toggleHelpMode, userLevel, setUserLevel } = useSettings();
    return (
        <div className="sticky top-0 z-50 bg-[#050508]/60 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="max-w-[1920px] mx-auto px-8 py-5 flex items-center justify-between">
                <Link href="/dashboard" className="group flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-all duration-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                        <Icons.zap size={20} className="text-primary fill-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Studio Generator</span>
                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">Intelligence Engine</span>
                    </div>
                </Link>

                <div className="flex items-center gap-10">
                    <div className="hidden lg:flex items-center gap-8 mr-4">
                        <Link href="/gallery" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-all">
                            Vault
                        </Link>
                        <Link href="/community" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-accent transition-all">
                            Commons
                        </Link>
                    </div>

                    {/* Proficiency Selector (Novice/Journeyman/Master) */}
                    <div className="hidden md:flex items-center gap-2 p-1 bg-white/[0.03] border border-white/5 rounded-xl backdrop-blur-md">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20 px-2">Level</span>
                        <button
                            onClick={() => setUserLevel('novice')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300",
                                userLevel === 'novice'
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "text-white/30 hover:text-white hover:bg-white/5"
                            )}
                        >
                            Novice
                        </button>
                        <button
                            onClick={() => setUserLevel('journeyman')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300",
                                userLevel === 'journeyman'
                                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                                    : "text-white/30 hover:text-white hover:bg-white/5"
                            )}
                        >
                            Journeyman
                        </button>
                        <button
                            onClick={() => setUserLevel('master')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300",
                                userLevel === 'master'
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                                    : "text-white/30 hover:text-white hover:bg-white/5"
                            )}
                        >
                            Master
                        </button>
                    </div>


                    <div className="flex items-center gap-4">
                        <NotificationBell />

                        <Link href="/pricing">
                            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-xl hover:border-primary/40 transition-all duration-500 cursor-pointer group hover:bg-white/[0.05]">
                                <Icons.plus className="group-hover:rotate-90 transition-transform text-primary" size={12} />
                                <span className="font-black text-[10px] tracking-[0.1em] uppercase text-white/80">{availableCredits} ENERGY</span>
                                <div className="h-4 w-px bg-white/10 mx-1" />
                                <span className="text-[9px] text-primary font-black uppercase tracking-widest">Refill</span>
                            </div>
                        </Link>
                    </div>

                    {isAdminOrSu && (
                        <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                            <Link href="/prototypes">
                                <Button variant="ghost" size="sm" className="h-10 px-4 bg-purple-500/5 border border-purple-500/10 hover:bg-purple-500/10 text-purple-400 rounded-xl text-[9px] font-black uppercase tracking-[0.2em]">
                                    🧪 Labs
                                </Button>
                            </Link>
                            <Select
                                value={effectiveRole}
                                onChange={(e) => switchRole(e.target.value)}
                                className="text-[9px] py-1.5 h-10 min-w-[150px] bg-white/[0.03] border-white/5 rounded-xl font-black uppercase tracking-[0.1em] text-white/40 focus:ring-0 focus:border-white/20"
                            >
                                <option value={profile.role}>VIEW: {profile.role}</option>
                                <option value="member">VIEW: MEMBER</option>
                            </Select>
                        </div>
                    )}

                    {user && profile && (
                        <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                            <Link href={`/profile/${user.uid}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity p-0.5">
                                <div className="relative">
                                    {profile.photoURL && profile.photoURL !== 'null' ? (
                                        <img
                                            src={profile.photoURL}
                                            alt=""
                                            className="w-10 h-10 rounded-xl border border-white/10 shadow-lg object-cover ring-2 ring-transparent group-hover:ring-primary/40 transition-all"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-black text-primary border border-primary/20 shadow-inner">
                                            {(profile.displayName || profile.username || 'A').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black" />
                                </div>
                                <div className="hidden xl:flex flex-col">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white leading-tight">{profile.displayName || 'Architect'}</p>
                                    <p className="text-[8px] text-white/20 uppercase font-black tracking-tighter mt-1">{profile.role || 'Member'}</p>
                                </div>
                            </Link>

                            <div className="flex items-center gap-2">
                                {onHistoryOpen && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={onHistoryOpen}
                                        className="h-10 gap-2 font-black px-4 bg-white/[0.03] border-white/5 hover:bg-white/[0.08] text-[10px] uppercase tracking-widest"
                                    >
                                        <Icons.history size={16} />
                                        <span className="hidden md:inline">History</span>
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleHelpMode}
                                    className={cn(
                                        "w-10 h-10 rounded-xl transition-all duration-300 border",
                                        helpModeEnabled
                                            ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                            : "bg-white/[0.03] border-white/5 text-white/30 hover:text-white"
                                    )}
                                >
                                    <Icons.info size={18} />
                                </Button>
                                <Link href="/settings">
                                    <Button variant="ghost" size="icon" className="w-10 h-10 bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] rounded-xl text-white/30 hover:text-white transition-all">
                                        <Icons.settings size={18} />
                                    </Button>
                                </Link>
                                <Button variant="ghost" size="icon" onClick={signOut} className="w-10 h-10 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 rounded-xl text-red-400/40 hover:text-red-400 transition-all">
                                    <Icons.logout size={18} />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
