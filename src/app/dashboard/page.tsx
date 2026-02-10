'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GeneratedImage, CREDIT_COSTS, CreditTransaction } from '@/lib/types';
import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';

export default function DashboardPage() {
    const { user, profile, credits, loading, signOut, switchRole, effectiveRole, setAudienceMode } = useAuth();
    const router = useRouter();
    const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
    const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
    const [loadingImages, setLoadingImages] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);


    // Fetch recent images
    useEffect(() => {
        async function fetchImages() {
            if (!user) return;

            try {
                const imagesRef = collection(db, 'users', user.uid, 'images');
                const q = query(imagesRef, orderBy('createdAt', 'desc'), limit(12));
                const snapshot = await getDocs(q);

                const images = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as GeneratedImage));

                setRecentImages(images);
            } catch (error) {
                console.error('Failed to fetch images:', error);
            } finally {
                setLoadingImages(false);
            }
        }

        if (user) {
            fetchImages();
        }
    }, [user]);
    // Fetch credit history
    useEffect(() => {
        async function fetchHistory() {
            if (!user) return;

            try {
                const historyRef = collection(db, 'users', user.uid, 'creditHistory');
                const q = query(historyRef, orderBy('createdAt', 'desc'), limit(10));
                const snapshot = await getDocs(q);

                const history = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as CreditTransaction));

                setCreditHistory(history);
            } catch (error) {
                console.error('Failed to fetch credit history:', error);
            } finally {
                setLoadingHistory(false);
            }
        }

        if (user) {
            fetchHistory();
        }
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!user || !profile) {
        return null;
    }

    const availableCredits = credits
        ? credits.balance + Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    const dailyRemaining = credits
        ? Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    const isAdminOrSu = profile.role === 'admin' || profile.role === 'su';

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold gradient-text">
                        AI Image Studio
                    </Link>

                    <div className="flex items-center gap-4">
                        {/* Credits Display */}
                        <Link href="/pricing" className="credit-badge hover:border-primary/50 transition-colors group">
                            <svg className="group-hover:scale-110 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v12M6 12h12" />
                            </svg>
                            <span>{availableCredits} credits</span>
                            <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Get More</span>
                        </Link>

                        {/* Role Switcher & Admin Link (Admin only) */}
                        {isAdminOrSu && (
                            <div className="flex items-center gap-3">
                                <Link href="/admin" className="btn-secondary text-xs px-3 py-2 flex items-center gap-2 border-primary/20 hover:border-primary/50 transition-all">
                                    <span>🛡️</span>
                                    <span className="hidden sm:inline">Admin Panel</span>
                                </Link>
                                <div className="relative">
                                    <select
                                        value={effectiveRole}
                                        onChange={(e) => switchRole(e.target.value as any)}
                                        className="select-field text-sm py-2 pr-8"
                                    >
                                        <option value={profile.role}>View as {profile.role}</option>
                                        <option value="member">View as Member</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Audience Mode Toggle */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold text-center">Audience Mode</span>
                            <div className="flex bg-background-secondary rounded-lg p-1 border border-border/50">
                                <button
                                    onClick={() => setAudienceMode('casual')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${profile.audienceMode === 'casual'
                                        ? 'bg-primary text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                                        : 'text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    Casual
                                </button>
                                <button
                                    onClick={() => setAudienceMode('professional')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${profile.audienceMode === 'professional'
                                        ? 'bg-accent text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                                        : 'text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    Pro
                                </button>
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center gap-3">
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
                            <button onClick={signOut} className="btn-secondary text-sm px-4 py-2">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Content based on Audience Mode */}
                <div className={`mb-8 p-6 rounded-2xl border transition-all duration-500 ${profile.audienceMode === 'casual'
                    ? 'bg-primary/5 border-primary/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]'
                    : 'bg-accent/5 border-accent/20 shadow-[inset_0_0_20px_rgba(217,70,239,0.05)]'
                    }`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${profile.audienceMode === 'casual' ? 'bg-primary text-white' : 'bg-accent text-white'
                                    }`}>
                                    {profile.audienceMode} mode active
                                </span>
                                <h2 className="text-2xl font-bold">
                                    {profile.audienceMode === 'casual' ? 'Ready to have some fun?' : 'Precision Image Studio'}
                                </h2>
                            </div>
                            <p className="text-foreground-muted max-w-xl">
                                {profile.audienceMode === 'casual'
                                    ? 'In Casual mode, we guide you through creating prompts using our Build-a-Prompt tool. It is perfect for fast, high-quality results without the technical jargon.'
                                    : 'Professional mode gives you full tool access, granular settings, and a free-form text environment for absolute creative control.'}
                            </p>
                        </div>
                        <Link
                            href="/generate"
                            className={`btn-primary flex items-center gap-3 py-4 px-8 text-lg font-bold group transition-all duration-300 ${profile.audienceMode === 'professional' ? '!bg-accent !shadow-accent/30' : ''
                                }`}
                        >
                            <span>{profile.audienceMode === 'casual' ? 'Start Creating' : 'New Generation'}</span>
                            <svg className="group-hover:translate-x-1 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-foreground-muted">Available Credits</span>
                            <span className="text-2xl">💎</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-bold">{availableCredits}</p>
                                <p className="text-sm text-foreground-muted">
                                    {dailyRemaining} daily + {credits?.balance || 0} purchased
                                </p>
                            </div>
                            {profile.subscription !== 'pro' && (
                                <Link href="/pricing" className="btn-secondary py-2 px-4 text-xs font-bold">
                                    Upgrade
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-foreground-muted">Images Created</span>
                            <span className="text-2xl">🎨</span>
                        </div>
                        <p className="text-3xl font-bold">{recentImages.length}</p>
                        <p className="text-sm text-foreground-muted">Total generations</p>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-foreground-muted">Current Plan</span>
                            <span className="text-2xl">⭐</span>
                        </div>
                        <p className="text-3xl font-bold capitalize">{profile.subscription}</p>
                        <p className="text-sm text-foreground-muted">
                            {profile.subscription === 'free' ? 'Upgrade for more features' : 'Premium features active'}
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4 mb-8">
                    <Link href="/generate" className="btn-primary flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Create New Image
                    </Link>

                    <Link href="/gallery" className="btn-secondary flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </svg>
                        View Gallery
                    </Link>

                    {profile.subscription === 'free' && (
                        <Link href="/pricing" className="btn-secondary flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            Upgrade Plan
                        </Link>
                    )}
                </div>

                {/* Credit Costs Reference */}
                <div className="glass-card p-6 mb-8">
                    <h3 className="text-lg font-semibold mb-4">Credit Costs</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                            <div>
                                <p className="font-medium">Standard</p>
                                <p className="text-sm text-foreground-muted">1024px resolution</p>
                            </div>
                            <span className="text-lg font-bold text-primary">{CREDIT_COSTS.standard} credit</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                            <div>
                                <p className="font-medium">High</p>
                                <p className="text-sm text-foreground-muted">2K resolution</p>
                            </div>
                            <span className="text-lg font-bold text-primary">{CREDIT_COSTS.high} credits</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                            <div>
                                <p className="font-medium">Ultra</p>
                                <p className="text-sm text-foreground-muted">4K resolution (Pro only)</p>
                            </div>
                            <span className="text-lg font-bold text-accent">{CREDIT_COSTS.ultra} credits</span>
                        </div>
                    </div>
                </div>

                {/* Credit History Accordion */}
                <section className="mb-12">
                    <button
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                        className="w-full flex items-center justify-between p-6 glass-card rounded-2xl hover:border-primary/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-bold">Credit Activity</h3>
                                <p className="text-xs text-foreground-muted">View your recent credit usage and transactions</p>
                            </div>
                        </div>
                        <div className={`p-2 rounded-lg bg-background-secondary border border-border transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </button>

                    <div className={`transition-all duration-500 overflow-hidden ${isHistoryExpanded ? 'max-h-[1000px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                        {loadingHistory ? (
                            <div className="flex justify-center py-8">
                                <div className="spinner" />
                            </div>
                        ) : creditHistory.length === 0 ? (
                            <div className="card text-center py-8 text-foreground-muted">
                                No recent credit activity
                            </div>
                        ) : (
                            <div className="glass-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border bg-background-secondary/50">
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Description</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {creditHistory.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-background-secondary/30 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-foreground-muted whitespace-nowrap">
                                                        {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : new Date(tx.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium">
                                                        {tx.description}
                                                        {tx.type === 'usage' && tx.metadata?.quality && (
                                                            <span className="ml-2 px-1.5 py-0.5 bg-background-secondary border border-border rounded text-[10px] uppercase">
                                                                {tx.metadata.quality}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className={`px-6 py-4 text-sm font-bold text-right ${tx.amount > 0 ? 'text-success' : 'text-error'}`}>
                                                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Recent Images */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Recent Creations</h2>
                        {recentImages.length > 0 && (
                            <Link href="/gallery" className="text-primary hover:text-primary-hover transition-colors">
                                View All →
                            </Link>
                        )}
                    </div>

                    {loadingImages ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner" />
                        </div>
                    ) : recentImages.length === 0 ? (
                        <div className="card text-center py-16">
                            <div className="text-6xl mb-4">🎨</div>
                            <h3 className="text-xl font-semibold mb-2">No images yet</h3>
                            <p className="text-foreground-muted mb-6">Create your first AI-generated masterpiece!</p>
                            <Link href="/generate" className="btn-primary inline-block">
                                Start Creating
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {recentImages.map((image) => (
                                <div key={image.id} className="card group cursor-pointer overflow-hidden p-0">
                                    <div className="aspect-[4/3] bg-background-secondary overflow-hidden">
                                        <img
                                            src={image.imageUrl}
                                            alt={image.prompt.slice(0, 50)}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <p className="text-sm line-clamp-2">{image.prompt}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-foreground-muted">
                                                {image.settings.quality} • {image.settings.aspectRatio}
                                            </p>
                                            <ShareButtons imageUrl={image.imageUrl} prompt={image.prompt} className="scale-75 origin-right" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
