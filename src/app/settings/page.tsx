'use client';

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import NotificationBell from '@/components/NotificationBell';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function SettingsPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [socialLinks, setSocialLinks] = useState({
        twitter: '',
        instagram: '',
        website: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [photoURL, setPhotoURL] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState('');
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
            return;
        }

        if (profile) {
            setDisplayName(profile.displayName || '');
            setUsername(profile.username || '');
            setBio(profile.bio || '');
            setPhotoURL(profile.photoURL || '');
            setBannerUrl(profile.bannerUrl || '');
            setSocialLinks({
                twitter: profile.socialLinks?.twitter || '',
                instagram: profile.socialLinks?.instagram || '',
                website: profile.socialLinks?.website || ''
            });
        }
    }, [user, profile, loading, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size should be less than 5MB', 'error');
                return;
            }
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) {
                showToast('Banner image should be less than 10MB', 'error');
                return;
            }
            setBannerFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setBannerPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        try {
            let currentPhotoURL = photoURL;

            // Upload new avatar if selected
            if (avatarFile) {
                const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${avatarFile.name}`);
                const snapshot = await uploadBytes(storageRef, avatarFile);
                currentPhotoURL = await getDownloadURL(snapshot.ref);
            }

            // Upload new banner if selected
            let currentBannerUrl = bannerUrl;
            if (bannerFile) {
                const bannerRef = ref(storage, `banners/${user.uid}/${Date.now()}_${bannerFile.name}`);
                const bannerSnapshot = await uploadBytes(bannerRef, bannerFile);
                currentBannerUrl = await getDownloadURL(bannerSnapshot.ref);
            }

            const token = await user.getIdToken();
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    displayName,
                    username,
                    bio,
                    socialLinks,
                    photoURL: currentPhotoURL,
                    bannerUrl: currentBannerUrl
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setPhotoURL(currentPhotoURL);
            setAvatarPreview(null);
            setAvatarFile(null);
            setBannerUrl(currentBannerUrl);
            setBannerPreview(null);
            setBannerFile(null);
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
                    {/* Banner */}
                    <div className="glass-card overflow-hidden">
                        <div className="relative group cursor-pointer">
                            <div className="w-full h-48 bg-gradient-to-r from-primary/20 via-purple-500/10 to-primary/5 overflow-hidden">
                                {(bannerPreview || bannerUrl) ? (
                                    <img
                                        src={bannerPreview || bannerUrl}
                                        alt="Profile Banner"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-foreground-muted text-sm">No banner image</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-sm font-bold uppercase tracking-widest">Change Banner</span>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleBannerChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <div className="px-8 py-3 flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span>🖼️</span> Profile Banner
                            </h2>
                            <p className="text-xs text-foreground-muted">Click to upload. 16:9 recommended. Max 10MB.</p>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="glass-card p-8 space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>👤</span> Public Identity
                        </h2>

                        <div className="space-y-4">
                            <div className="flex flex-col items-center sm:flex-row gap-6 mb-6">
                                <div className="relative group cursor-pointer">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-primary/5">
                                        <img
                                            src={avatarPreview || photoURL || `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random`}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-xs font-bold uppercase tracking-widest">Change</span>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                <div className="text-center sm:text-left">
                                    <h3 className="font-bold text-foreground">Profile Picture</h3>
                                    <p className="text-sm text-foreground-muted mt-1">
                                        Click image to upload. Max 5MB.
                                    </p>
                                </div>
                            </div>

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
                                    Unique Username (Handle)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted">@</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        maxLength={20}
                                        placeholder="your_handle"
                                        className="input-field pl-10"
                                    />
                                </div>
                                <p className="text-[10px] text-foreground-muted mt-1">
                                    Used for @mentions in comments. 3-20 characters, lowercase letters, numbers, and underscores only.
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
