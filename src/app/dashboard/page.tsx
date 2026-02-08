'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GeneratedImage, CREDIT_COSTS } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
    const { user, profile, credits, loading, signOut, switchRole, effectiveRole } = useAuth();
    const router = useRouter();
    const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
    const [loadingImages, setLoadingImages] = useState(true);

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
                        <div className="credit-badge">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v12M6 12h12" />
                            </svg>
                            <span>{availableCredits} credits</span>
                        </div>

                        {/* Role Switcher (Admin only) */}
                        {isAdminOrSu && (
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
                        )}

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
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-foreground-muted">Available Credits</span>
                            <span className="text-2xl">💎</span>
                        </div>
                        <p className="text-3xl font-bold">{availableCredits}</p>
                        <p className="text-sm text-foreground-muted">
                            {dailyRemaining} daily + {credits?.balance || 0} purchased
                        </p>
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
                                        <p className="text-sm line-clamp-2">{image.prompt}</p>
                                        <p className="text-xs text-foreground-muted mt-2">
                                            {image.settings.quality} • {image.settings.aspectRatio}
                                        </p>
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
