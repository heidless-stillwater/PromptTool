'use client';

import Link from 'next/link';
import GlobalSearch from '@/components/GlobalSearch';
import NotificationBell from '@/components/NotificationBell';

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
}

export default function DashboardHeader({
    user,
    profile,
    availableCredits,
    isAdminOrSu,
    effectiveRole,
    switchRole,
    setAudienceMode,
    signOut
}: DashboardHeaderProps) {
    return (
        <header className="sticky top-0 z-50 glass-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/dashboard" className="text-xl font-bold gradient-text">
                    AI Image Studio
                </Link>

                <div className="flex items-center gap-4">
                    <Link href="/collections" className="text-sm font-medium hover:text-primary transition-colors hidden md:block">
                        My Collections
                    </Link>
                    <GlobalSearch />
                    <NotificationBell />

                    <Link href="/pricing" className="credit-badge hover:border-primary/50 transition-colors group">
                        <svg className="group-hover:scale-110 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v12M6 12h12" />
                        </svg>
                        <span>{availableCredits} credits</span>
                        <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Get More</span>
                    </Link>

                    {isAdminOrSu && (
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="btn-secondary text-xs px-3 py-2 flex items-center gap-2 border-primary/20 hover:border-primary/50 transition-all">
                                <span>🛡️</span>
                                <span className="hidden sm:inline">Admin Panel</span>
                            </Link>
                            <div className="relative">
                                <select
                                    value={effectiveRole}
                                    onChange={(e) => switchRole(e.target.value)}
                                    className="select-field text-sm py-2 pr-8"
                                >
                                    <option value={profile.role}>View as {profile.role}</option>
                                    <option value="member">View as Member</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold text-center">Audience Mode</span>
                        <div className="flex bg-background-secondary rounded-lg p-1 border border-border/50">
                            <button
                                onClick={() => setAudienceMode('casual')}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${profile.audienceMode === 'casual'
                                    ? 'bg-primary text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                                    : 'text-foreground-muted hover:text-foreground'}`}
                            >
                                Casual
                            </button>
                            <button
                                onClick={() => setAudienceMode('professional')}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${profile.audienceMode === 'professional'
                                    ? 'bg-accent text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                                    : 'text-foreground-muted hover:text-foreground'}`}
                            >
                                Pro
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href={`/profile/${user.uid}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            {profile.photoURL && (
                                <img
                                    src={profile.photoURL}
                                    alt={profile.displayName || 'User'}
                                    className="w-10 h-10 rounded-full border-2 border-primary"
                                />
                            )}
                            <div className="hidden md:block">
                                <p className="text-sm font-medium">{profile.displayName}</p>
                                <p className="text-xs text-foreground-muted capitalize">{profile.subscription} plan</p>
                            </div>
                        </Link>
                        <Link href="/settings" className="btn-secondary text-sm px-4 py-2 ml-2 flex items-center justify-center">
                            ⚙️
                        </Link>
                        <button onClick={signOut} className="btn-secondary text-sm px-4 py-2 ml-2">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
