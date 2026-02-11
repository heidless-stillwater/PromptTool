'use client';

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import NotificationBell from '@/components/NotificationBell';

export default function SettingsPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [socialLinks, setSocialLinks] = useState({
        twitter: '',
        instagram: '',
        website: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
            return;
        }

        if (profile) {
            setDisplayName(profile.displayName || '');
            setBio(profile.bio || '');
            setSocialLinks({
                twitter: profile.socialLinks?.twitter || '',
                instagram: profile.socialLinks?.instagram || '',
                website: profile.socialLinks?.website || ''
            });
        }
    }, [user, profile, loading, router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    displayName,
                    bio,
                    socialLinks
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast('Profile updated successfully!', 'success');
        } catch (error: any) {
            console.error('[Settings] Error updating profile:', error);
            showToast(error.message || 'Failed to update profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold gradient-text">
                        AI Image Studio
                    </Link>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <Link href="/league" className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                            <span>🏆</span> Community League
                        </Link>
                        <Link href="/dashboard" className="btn-secondary text-sm px-4 py-2">
                            ← Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold">Profile Settings</h1>
                        <p className="text-foreground-muted mt-2">Personalize how others see you in the community.</p>
                    </div>
                    {user && (
                        <Link
                            href={`/profile/${user.uid}`}
                            className="text-primary font-bold hover:underline flex items-center gap-2"
                        >
                            View Public Profile →
                        </Link>
                    )}
                </div>

                <form onSubmit={handleSave} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Basic Info */}
                    <div className="glass-card p-8 space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>👤</span> Public Identity
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold uppercase tracking-widest text-foreground-muted mb-2">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    maxLength={50}
                                    placeholder="Your public name"
                                    className="input-field"
                                />
                                <p className="text-[10px] text-foreground-muted mt-1 text-right">
                                    {displayName.length}/50
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase tracking-widest text-foreground-muted mb-2">
                                    About You (Bio)
                                </label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    maxLength={500}
                                    placeholder="Tell the community about yourself, your style, or your inspiration..."
                                    className="input-field h-32 resize-none"
                                />
                                <p className="text-[10px] text-foreground-muted mt-1 text-right">
                                    {bio.length}/500
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Social Links */}
                    <div className="glass-card p-8 space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>🔗</span> Social Presence
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold uppercase tracking-widest text-foreground-muted mb-2">
                                    X (Twitter) Handle
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted">@</span>
                                    <input
                                        type="text"
                                        value={socialLinks.twitter}
                                        onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                                        placeholder="username"
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase tracking-widest text-foreground-muted mb-2">
                                    Instagram Handle
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted">@</span>
                                    <input
                                        type="text"
                                        value={socialLinks.instagram}
                                        onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                                        placeholder="username"
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold uppercase tracking-widest text-foreground-muted mb-2">
                                    Personal Website
                                </label>
                                <input
                                    type="url"
                                    value={socialLinks.website}
                                    onChange={(e) => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                                    placeholder="https://yourportfolio.com"
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="btn-primary px-12 py-4 font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-3"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Save Profile Changes'
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
