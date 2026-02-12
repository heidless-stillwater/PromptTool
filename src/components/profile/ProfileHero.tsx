'use client';

import Link from 'next/link';
import { UserProfile, BADGES } from '@/lib/types';

interface ProfileHeroProps {
    author: UserProfile;
    currentUser: any;
    isFollowing: boolean;
    followLoading: boolean;
    onToggleFollow: () => void;
    formatDate: (ts: any) => string;
}

export default function ProfileHero({
    author,
    currentUser,
    isFollowing,
    followLoading,
    onToggleFollow,
    formatDate
}: ProfileHeroProps) {
    return (
        <div className="glass-card rounded-3xl mb-12 relative overflow-hidden">
            {/* Banner */}
            <div className="w-full h-48 relative">
                {author.bannerUrl ? (
                    <img
                        src={author.bannerUrl}
                        alt="Profile Banner"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-primary/20 via-purple-500/10 to-primary/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>

            <div className="p-8 -mt-16 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full" />

                <div className="relative flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    {/* Avatar */}
                    {author.photoURL ? (
                        <img
                            src={author.photoURL}
                            alt={author.displayName || 'Author'}
                            className="w-32 h-32 rounded-full border-4 border-primary/30 shadow-2xl"
                        />
                    ) : (
                        <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center text-5xl font-bold text-primary border-4 border-primary/30 shadow-2xl">
                            {(author.displayName || 'A').charAt(0).toUpperCase()}
                        </div>
                    )}

                    <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <h1 className="text-4xl font-bold">{author.displayName || 'Anonymous Author'}</h1>
                            <div className="flex flex-wrap items-center gap-2 self-center md:self-auto">
                                {(author.badges || []).map(badgeId => {
                                    const badge = BADGES[badgeId];
                                    if (!badge) return null;
                                    return (
                                        <span
                                            key={badgeId}
                                            title={badge.label}
                                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-background border border-border shadow-sm ${badge.color}`}
                                        >
                                            <span>{badge.icon}</span>
                                            <span className="hidden sm:inline">{badge.label}</span>
                                        </span>
                                    );
                                })}
                                {author.role === 'su' || author.role === 'admin' ? (
                                    <span className="bg-yellow-500/20 text-yellow-500 text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md border border-yellow-500/30">
                                        Staff
                                    </span>
                                ) : (
                                    <span className="bg-primary/10 text-primary text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md border border-primary/20">
                                        Creator
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-foreground-muted mt-2">Member since {formatDate(author.createdAt)}</p>

                        {author.bio && (
                            <p className="text-foreground mt-4 max-w-2xl leading-relaxed whitespace-pre-wrap italic opacity-90">
                                &quot;{author.bio}&quot;
                            </p>
                        )}

                        {author.socialLinks && (
                            <div className="flex flex-wrap items-center gap-6 mt-6">
                                {author.socialLinks.twitter && (
                                    <a href={`https://x.com/${author.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-primary transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                        {author.socialLinks.twitter}
                                    </a>
                                )}
                                {author.socialLinks.instagram && (
                                    <a href={`https://instagram.com/${author.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-accent transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5a4.25 4.25 0 0 0-4.25 4.25v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm5.25-.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" /></svg>
                                        {author.socialLinks.instagram}
                                    </a>
                                )}
                                {author.socialLinks.website && (
                                    <a href={author.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-primary transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                        <span>🌐</span>
                                        Website
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {currentUser?.uid === author.uid ? (
                        <Link href="/settings" className="btn-secondary px-6 py-3 font-bold border-primary/20">
                            Edit My Profile
                        </Link>
                    ) : currentUser && (
                        <button
                            onClick={onToggleFollow}
                            disabled={followLoading}
                            className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${isFollowing
                                ? 'bg-background-secondary border border-border text-foreground-muted hover:bg-error/10 hover:text-error hover:border-error/30'
                                : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'
                                }`}
                        >
                            {followLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                isFollowing ? 'Unfollow' : 'Follow Creator'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
