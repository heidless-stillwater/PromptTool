'use client';

import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';

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
            const res = await fetch('/api/user/profile/', {
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
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Icons.spinner className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Loading Settings</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <Card variant="glass" className="sticky top-0 z-50 border-x-0 border-t-0 rounded-none border-b border-border p-0">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="secondary" size="icon" className="w-9 h-9">
                                <Icons.arrowLeft size={18} />
                            </Button>
                        </Link>
                        <Link href="/dashboard" className="text-xl font-black tracking-tighter gradient-text hover:opacity-80 transition-opacity">
                            STILLWATER<span className="text-foreground"> STUDIO</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/league">
                            <Button variant="secondary" size="sm" className="h-9 gap-2 font-black uppercase tracking-widest text-[10px]">
                                <Icons.trophy size={14} className="text-primary" />
                                <span className="hidden sm:inline">League</span>
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-border/50 mx-1" />
                        <Link href="/dashboard">
                            <Button variant="primary" size="sm" className="h-9 px-4 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                                Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>

            <main className="max-w-4xl mx-auto px-4 py-16">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 relative">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 blur-[100px] -ml-32 -mt-32 rounded-full pointer-events-none" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-1 h-4 bg-primary rounded-full" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted">Account Controls</h2>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter uppercase">Profile <span className="text-primary">Settings</span></h1>
                        <p className="text-foreground-muted mt-3 text-sm max-w-lg">Manage your public identity, social presence, and creator preferences across the Stillwater ecosystem.</p>
                    </div>

                    {user?.email && (
                        <Card variant="glass" className="p-6 border-primary/20 shadow-2xl shadow-primary/5 flex items-center gap-5 md:self-end">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <Icons.user size={24} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">Authenticated via Google</p>
                                <p className="text-sm font-black text-foreground">{user.email}</p>
                            </div>
                        </Card>
                    )}
                </div>

                <form onSubmit={handleSave} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {/* Banner */}
                    <Card className="overflow-hidden border-border/50 group">
                        <div
                            className={cn(
                                "relative cursor-pointer bg-background-tertiary overflow-hidden transition-all duration-500",
                                !(bannerPreview || bannerUrl) ? 'h-64' : 'h-auto min-h-[240px]'
                            )}
                        >
                            <div className="w-full h-full">
                                {(bannerPreview || bannerUrl) ? (
                                    <img
                                        src={bannerPreview || bannerUrl}
                                        alt="Profile Banner"
                                        className="w-full h-full object-cover block transition-transform duration-700 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background-tertiary to-background-secondary p-8 text-center gap-4">
                                        <div className="w-16 h-16 rounded-3xl bg-background flex items-center justify-center shadow-lg border border-border/50">
                                            <Icons.image size={32} className="text-primary/40" />
                                        </div>
                                        <p className="text-foreground-muted text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Click to upload brand banner</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                                            <Icons.plus className="text-white" size={24} />
                                        </div>
                                        <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Update Banner</span>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleBannerChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                        </div>
                        <div className="px-8 py-5 flex items-center justify-between bg-background-secondary/50">
                            <div className="flex items-center gap-3">
                                <Icons.image className="text-primary" size={18} />
                                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Profile Banner</h2>
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted opacity-60">16:9 Recommended • PNG/JPG • Max 10MB</p>
                        </div>
                    </Card>

                    {/* Basic Info */}
                    <Card className="p-10 border-border/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -mr-32 -mt-32 rounded-full pointer-events-none" />

                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-4 bg-primary rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Public Identity</h2>
                            </div>
                            {user && (
                                <Link href={`/profile/${user.uid}`}>
                                    <Button variant="secondary" size="sm" className="h-9 gap-2 font-black uppercase tracking-widest text-[9px] border-primary/20">
                                        View Live Profile <Icons.external size={12} />
                                    </Button>
                                </Link>
                            )}
                        </div>

                        <div className="space-y-8">
                            <div className="flex flex-col items-center sm:flex-row gap-8 mb-4">
                                <div className="relative group cursor-pointer avatar-upload">
                                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-[6px] border-background bg-background-tertiary relative z-10 shadow-xl group-hover:rotate-3 transition-transform duration-500">
                                        <img
                                            src={avatarPreview || photoURL || `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random`}
                                            alt="Avatar"
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <Icons.plus className="text-white mb-1" size={16} />
                                            <span className="text-white text-[9px] font-black uppercase tracking-widest">Update</span>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                </div>
                                <div className="text-center sm:text-left flex-1 space-y-2">
                                    <h3 className="font-black uppercase tracking-widest text-sm text-foreground">Creator Avatar</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-60">
                                        Max 5MB • PNG/JPG/WebP • Square Recommended
                                    </p>
                                    {profile?.email && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background-secondary border border-border/50">
                                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                            <span className="text-[9px] text-foreground-muted font-black uppercase tracking-widest">
                                                Verified: {profile.email}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted ml-1">
                                        Display Name
                                    </label>
                                    <Input
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        maxLength={50}
                                        placeholder="Stillwater Creator"
                                        className="h-12 bg-background-secondary/50"
                                    />
                                    <div className="flex justify-end">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted opacity-40">{displayName.length}/50</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted ml-1">
                                        Unique Username
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black z-10">@</div>
                                        <Input
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                            maxLength={20}
                                            placeholder="your_handle"
                                            className="h-12 pl-10 bg-background-secondary/50"
                                        />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted opacity-60 leading-relaxed px-1">
                                        Lowercase letters, numbers, and underscores only.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted ml-1">
                                    Creator Bio
                                </label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    maxLength={500}
                                    placeholder="Share your creative vision, preferred styles, or artistic journey with the community..."
                                    className="w-full bg-background-secondary/50 border border-border rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all outline-none min-h-[140px] resize-none leading-relaxed"
                                />
                                <div className="flex justify-end">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted opacity-40">{bio.length}/500</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Social Links */}
                    <Card className="p-10 border-border/50">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="w-1 h-4 bg-primary rounded-full" />
                            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Social Presence</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted ml-1">
                                    X (Twitter) Handle
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none z-10">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                    </div>
                                    <Input
                                        value={socialLinks.twitter}
                                        onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value.replace(/^@/, '') }))}
                                        placeholder="username"
                                        className="h-12 pl-12 bg-background-secondary/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted ml-1">
                                    Instagram Handle
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none z-10">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5a4.25 4.25 0 0 0-4.25 4.25v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm5.25-.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" /></svg>
                                    </div>
                                    <Input
                                        value={socialLinks.instagram}
                                        onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value.replace(/^@/, '') }))}
                                        placeholder="username"
                                        className="h-12 pl-12 bg-background-secondary/50"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted ml-1">
                                    Personal Portfolio Website
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none z-10">
                                        <Icons.globe size={16} />
                                    </div>
                                    <Input
                                        type="url"
                                        value={socialLinks.website}
                                        onChange={(e) => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                                        placeholder="https://yourportfolio.com"
                                        className="h-12 pl-12 bg-background-secondary/50"
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Save Button */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-60">
                            Confirm all changes before committing to live profile.
                        </p>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            variant="primary"
                            className="w-full sm:w-auto px-12 h-14 font-black uppercase tracking-[0.25em] text-[11px] shadow-2xl shadow-primary/30 group"
                        >
                            {isSaving ? (
                                <>
                                    <Icons.spinner className="w-5 h-5 animate-spin mr-3" />
                                    Synchronizing...
                                </>
                            ) : (
                                <>
                                    Sync Profile Changes
                                    <Icons.check className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    );
}
