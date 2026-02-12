'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, getDocs, limit, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { UserProfile, BADGES, UserCredits } from '@/lib/types';
import ConfirmationModal from '@/components/ConfirmationModal';

interface AdminStats {
    totalUsers: number;
    proUsers: number;
    totalImages: number;
    totalCreditsUsed: number;
    totalLifetimeUsed: number;
}

interface LeaderInfo {
    uid: string;
    username: string;
    displayName: string;
    photoURL: string | null;
    score: number;
}

interface ExtendedUserProfile extends UserProfile {
    creditsBalance?: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        proUsers: 0,
        totalImages: 0,
        totalCreditsUsed: 0,
        totalLifetimeUsed: 0
    });
    const [loading, setLoading] = useState(true);
    const [awarding, setAwarding] = useState(false);
    const { user } = useAuth();
    const { showToast } = useToast();

    // User Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ExtendedUserProfile[]>([]);
    const [searching, setSearching] = useState(false);
    const [updatingBadges, setUpdatingBadges] = useState(false);

    // Rewards State
    const [rewardAmounts, setRewardAmounts] = useState<number[]>([500, 250, 100]);
    const [savingRewards, setSavingRewards] = useState(false);
    const [leaderPreview, setLeaderPreview] = useState<LeaderInfo[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [showAwardModal, setShowAwardModal] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // Fetch stats from server-side API (bypasses Firestore client rules)
                if (user) {
                    const token = await user.getIdToken();
                    const res = await fetch('/api/admin/stats', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setStats({
                            totalUsers: data.totalUsers,
                            proUsers: data.proUsers,
                            totalImages: data.totalImages,
                            totalCreditsUsed: data.totalCreditsHeld,
                            totalLifetimeUsed: data.totalLifetimeUsed,
                        });
                    }
                }

                // Fetch Rewards & Preview
                await fetchRewardsAndPreview();

            } catch (error) {
                console.error('Failed to fetch admin data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const fetchRewardsAndPreview = async () => {
        if (!user) return;
        setLoadingPreview(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/rewards-preview', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setLeaderPreview(data.leaders);
                setRewardAmounts(data.currentRewards);
            }
        } catch (error) {
            console.error('Failed to fetch rewards preview:', error);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleUpdateRewards = async () => {
        if (!user || savingRewards) return;
        setSavingRewards(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/update-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'rewards',
                    settings: { amounts: rewardAmounts }
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast('Reward amounts updated successfully', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update rewards', 'error');
        } finally {
            setSavingRewards(false);
        }
    };

    const handleUpdateUserDetails = async (userId: string, updates: { role?: string, creditsChange?: number }) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/update-user-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId, ...updates })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast(data.message || 'User updated', 'success');

            // Update local state
            setSearchResults(prev => prev.map(u => {
                if (u.uid !== userId) return u;
                return {
                    ...u,
                    role: updates.role ? (updates.role as any) : u.role,
                    creditsBalance: updates.creditsChange
                        ? (u.creditsBalance || 0) + updates.creditsChange
                        : u.creditsBalance
                };
            }));
        } catch (error: any) {
            showToast(error.message || 'Failed to update user', 'error');
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim() || searching) return;
        setSearching(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(
                usersRef,
                where('username', '>=', searchQuery.toLowerCase()),
                where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
                limit(10)
            );
            const snap = await getDocs(q);

            const results = await Promise.all(snap.docs.map(async d => {
                const userData = { uid: d.id, ...d.data() } as UserProfile;
                // Fetch credits
                let credits = 0;
                try {
                    const creditDoc = await getDoc(doc(db, 'users', d.id, 'data', 'credits'));
                    if (creditDoc.exists()) {
                        credits = (creditDoc.data() as UserCredits).balance;
                    }
                } catch (e) {
                    console.error('Failed to fetch credits for user', d.id, e);
                }

                return { ...userData, creditsBalance: credits } as ExtendedUserProfile;
            }));

            setSearchResults(results);
            if (results.length === 0) {
                showToast('No users found', 'info');
            }
        } catch (error: any) {
            showToast('Search failed: ' + error.message, 'error');
        } finally {
            setSearching(false);
        }
    };

    const handleToggleBadge = async (userId: string, currentBadges: string[], badgeId: string) => {
        if (!user || updatingBadges) return;
        setUpdatingBadges(true);
        try {
            const hasBadge = currentBadges.includes(badgeId);
            const newBadges = hasBadge
                ? currentBadges.filter(b => b !== badgeId)
                : [...currentBadges, badgeId];

            const token = await user.getIdToken();
            const res = await fetch('/api/admin/update-badges', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId, badges: newBadges })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast(data.message || 'Updated badges', 'success');
            setSearchResults(prev => prev.map(u => u.uid === userId ? { ...u, badges: newBadges } : u));
        } catch (error: any) {
            showToast(error.message || 'Failed to update badges', 'error');
        } finally {
            setUpdatingBadges(false);
        }
    };

    const handleAwardClick = () => {
        if (!user || awarding || leaderPreview.length === 0) return;
        setShowAwardModal(true);
    };

    const confirmAwardWeekly = async () => {
        if (!user || awarding) return;
        setShowAwardModal(false);
        setAwarding(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/award-weekly', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast(data.message, 'success');
            // Refresh preview
            await fetchRewardsAndPreview();
        } catch (error: any) {
            showToast(error.message || 'Failed to award rewards', 'error');
        } finally {
            setAwarding(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center py-20"><div className="spinner" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black gradient-text uppercase tracking-tight">Admin Dashboard</h1>
                    <p className="text-foreground-muted mt-1">System monitoring and community management</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="btn-secondary px-4 py-2 text-sm">
                        ← Dashboard
                    </Link>
                    <Link href="/admin/moderation" className="btn-secondary px-4 py-2 text-sm flex items-center gap-2 border-primary/20 text-primary hover:bg-primary/10">
                        <span>🛡️</span> Moderation
                    </Link>
                    <button
                        onClick={handleAwardClick}
                        disabled={awarding || leaderPreview.length === 0}
                        className="btn-primary flex items-center gap-2 px-6 py-2 shadow-lg shadow-primary/20"
                    >
                        {awarding ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🏆'}
                        Award Weekly Rewards
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="glass-card p-6 border-primary/20 bg-primary/5">
                    <p className="text-foreground-muted text-xs font-bold uppercase tracking-widest text-primary">Total Users</p>
                    <p className="text-4xl font-black mt-2">{stats.totalUsers}</p>
                </div>
                <div className="glass-card p-6 border-blue-500/20 bg-blue-500/5">
                    <p className="text-foreground-muted text-xs font-bold uppercase tracking-widest text-blue-500">Pro Members</p>
                    <p className="text-4xl font-black mt-2">{stats.proUsers}</p>
                </div>
                <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-foreground-muted text-xs font-bold uppercase tracking-widest text-emerald-500">Total Images</p>
                    <p className="text-4xl font-black mt-2">{stats.totalImages.toLocaleString()}</p>
                </div>
                <div className="glass-card p-6 border-purple-500/20 bg-purple-500/5">
                    <p className="text-foreground-muted text-xs font-bold uppercase tracking-widest text-purple-500">Credits Held</p>
                    <p className="text-4xl font-black mt-2">{stats.totalCreditsUsed.toLocaleString()}</p>
                </div>
                <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
                    <p className="text-foreground-muted text-xs font-bold uppercase tracking-widest text-amber-500">Credits Consumed</p>
                    <p className="text-4xl font-black mt-2">{stats.totalLifetimeUsed?.toLocaleString() || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Rewards Configuration */}
                <div className="glass-card rounded-2xl overflow-hidden border border-border flex flex-col">
                    <div className="p-6 border-b border-border bg-background-secondary/30">
                        <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                            <span>⚙️</span> Reward Settings
                        </h2>
                    </div>
                    <div className="p-6 space-y-6 flex-1">
                        <div className="space-y-4">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center font-black text-primary">
                                        {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'}
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-bold uppercase text-foreground-muted mb-1 block">Credits Prize</label>
                                        <input
                                            type="number"
                                            value={rewardAmounts[i]}
                                            onChange={(e) => {
                                                const newAmounts = [...rewardAmounts];
                                                newAmounts[i] = parseInt(e.target.value) || 0;
                                                setRewardAmounts(newAmounts);
                                            }}
                                            className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/50 font-bold"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleUpdateRewards}
                            disabled={savingRewards}
                            className="w-full btn-secondary py-3 font-bold"
                        >
                            {savingRewards ? 'Saving...' : 'Save Reward Settings'}
                        </button>
                    </div>
                </div>

                {/* Leaderboard Preview */}
                <div className="glass-card rounded-2xl overflow-hidden border border-border flex flex-col">
                    <div className="p-6 border-b border-border bg-background-secondary/30 flex items-center justify-between">
                        <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                            <span>📊</span> Leaderboard Preview
                        </h2>
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded uppercase">Last 7 Days</span>
                    </div>
                    <div className="p-6 space-y-4 flex-1">
                        {loadingPreview ? (
                            <div className="flex items-center justify-center py-10"><div className="spinner-sm" /></div>
                        ) : leaderPreview.length === 0 ? (
                            <div className="text-center py-10 text-foreground-muted italic">No activity recorded this week</div>
                        ) : (
                            leaderPreview.map((leader, i) => (
                                <div key={leader.uid} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background-secondary/10">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 text-center font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : 'text-amber-600'}`}>
                                            #{i + 1}
                                        </span>
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 border border-border">
                                            {leader.photoURL ? (
                                                <img src={leader.photoURL} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                                                    {leader.displayName[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">@{leader.username}</p>
                                            <p className="text-[10px] text-foreground-muted">{leader.score} votes</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-primary">+{rewardAmounts[i]}</p>
                                        <p className="text-[10px] text-foreground-muted uppercase">credits</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <p className="text-[10px] text-foreground-muted italic text-center mt-2">
                            * Scores are calculated based on votes received since {new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* User Manager */}
            <div className="glass-card rounded-2xl overflow-hidden border border-border shadow-2xl">
                <div className="p-8 border-b border-border bg-background-secondary/30">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">⚡</span>
                        <h2 className="text-2xl font-black uppercase tracking-tight">User Manager</h2>
                    </div>
                    <p className="text-foreground-muted">Manage user roles, credits, and badges.</p>
                </div>

                <div className="p-8 space-y-8">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="Enter username or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 bg-background-secondary border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={searching}
                            className="btn-primary px-8 py-3 font-bold"
                        >
                            {searching ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Search User'}
                        </button>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <h3 className="text-sm font-bold text-foreground-muted uppercase tracking-widest flex items-center gap-2">
                                Search Results ({searchResults.length})
                            </h3>
                            {searchResults.map(u => (
                                <div key={u.uid} className="flex flex-col gap-6 p-6 rounded-2xl border border-border bg-background-secondary/20 hover:border-primary/30 transition-all">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        {/* User Info */}
                                        <div className="flex items-center gap-4 min-w-[300px]">
                                            <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 border-2 border-border p-1">
                                                {u.photoURL ? (
                                                    <img src={u.photoURL} className="w-full h-full object-cover rounded-full" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                                                        {u.displayName?.[0] || u.username?.[0] || '?'}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold">@{u.username}</p>
                                                <p className="text-sm text-foreground-muted">{u.displayName} • {u.email}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${u.role === 'admin' || u.role === 'su' ? 'bg-error/10 border-error text-error' : 'bg-background border-border text-foreground-muted'}`}>
                                                        {u.role}
                                                    </span>
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${u.subscription === 'pro' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-background border-border text-foreground-muted'}`}>
                                                        {u.subscription}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap items-center gap-6 flex-1">
                                            {/* Role Management */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-foreground-muted">Role</label>
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleUpdateUserDetails(u.uid, { role: e.target.value as any })}
                                                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="su">Super User</option>
                                                </select>
                                            </div>

                                            {/* Credits Management */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-foreground-muted">Credits: <span className="text-primary">{u.creditsBalance}</span></label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const amount = prompt('Enter amount to ADD (e.g. 100):');
                                                            if (amount) handleUpdateUserDetails(u.uid, { creditsChange: parseInt(amount) });
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-bold"
                                                    >
                                                        + Add
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const amount = prompt('Enter amount to REMOVE (e.g. 100):');
                                                            if (amount) handleUpdateUserDetails(u.uid, { creditsChange: -parseInt(amount) });
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-error/10 text-error border border-error/30 hover:bg-error/20 text-xs font-bold"
                                                    >
                                                        - Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="border-t border-border/50 pt-4">
                                        <label className="text-[10px] font-bold uppercase text-foreground-muted block mb-2">Badges</label>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(BADGES).map(([id, badge]) => {
                                                const isActive = (u.badges || []).includes(id);
                                                return (
                                                    <button
                                                        key={id}
                                                        onClick={() => handleToggleBadge(u.uid, u.badges || [], id)}
                                                        disabled={updatingBadges}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border ${isActive
                                                            ? 'bg-primary/10 border-primary text-primary'
                                                            : 'bg-background hover:bg-background-secondary border-border text-foreground-muted opacity-50 hover:opacity-100'
                                                            }`}
                                                        title={badge.label}
                                                    >
                                                        <span>{badge.icon}</span>
                                                        <span>{badge.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={showAwardModal}
                title="🏆 Award Weekly Rewards"
                message="Are you sure you want to distribute credits to these creators? This action cannot be undone."
                confirmLabel="Yes, Award Credits"
                cancelLabel="Cancel"
                onConfirm={confirmAwardWeekly}
                onCancel={() => setShowAwardModal(false)}
                type="warning"
                isLoading={awarding}
            >
                <div className="mt-4 bg-background-secondary/50 rounded-xl p-4 border border-border space-y-2">
                    {leaderPreview.map((leader, i) => (
                        <div key={leader.uid} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <span className={`font-black w-6 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : 'text-amber-600'}`}>#{i + 1}</span>
                                <span className="text-sm font-medium">@{leader.username}</span>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-primary">+{rewardAmounts[i]}</span>
                            </div>
                        </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-border flex justify-between items-center text-sm font-bold">
                        <span>Total Distribution</span>
                        <span className="text-primary">{rewardAmounts.reduce((a, b) => a + (b || 0), 0)} credits</span>
                    </div>
                </div>
            </ConfirmationModal>
        </div>
    );
}
