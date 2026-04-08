'use client';

import Link from 'next/link';
import { Icons } from '@/components/ui/Icons';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
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
        <Card variant="glass" className="rounded-[2.5rem] mb-12 relative overflow-hidden border-0 bg-background-secondary/30">
            {/* Banner */}
            <div className={cn(
                "w-full relative bg-background-tertiary overflow-hidden group",
                !author.bannerUrl ? "h-64" : ""
            )}>
                {author.bannerUrl ? (
                    <img
                        src={author.bannerUrl}
                        alt="Profile Banner"
                        className="w-full h-full object-cover block min-h-[200px] transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-purple-500/10 to-accent/5" />
                )}
                {/* Subtle top/bottom overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-black/20" />
            </div>

            <div className="px-10 pb-10 relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] -mr-48 -mt-24 rounded-full pointer-events-none" />

                <div className="relative flex flex-col md:flex-row items-center md:items-end gap-8 text-center md:text-left">
                    {/* Avatar */}
                    <div className="relative group/avatar -mt-24">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500" />
                        <UserAvatar 
                            src={author.photoURL} 
                            name={author.displayName || author.username} 
                            size="xl"
                            className="border-[6px] border-background shadow-2xl relative z-10"
                        />
                    </div>

                    <div className="flex-1 pb-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3">
                            <h1 className="text-4xl font-black tracking-tighter text-foreground">{author.displayName || 'Anonymous Author'}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                {(author.badges || []).map(badgeId => {
                                    const badge = BADGES[badgeId];
                                    if (!badge) return null;
                                    return (
                                        <Badge
                                            key={badgeId}
                                            variant="secondary"
                                            className={cn("gap-1.5 font-black uppercase tracking-widest text-[9px] px-2.5 py-1", badge.color.replace('text-', 'bg-').concat('/10 ').concat(badge.color))}
                                        >
                                            <span>{badge.icon}</span>
                                            <span>{badge.label}</span>
                                        </Badge>
                                    );
                                })}
                                {author.role === 'su' || author.role === 'admin' ? (
                                    <Badge variant="primary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 font-black uppercase tracking-widest text-[9px] px-2.5 py-1">
                                        <Icons.settings size={10} className="mr-1" /> STAFF
                                    </Badge>
                                ) : (
                                    <Badge variant="primary" className="bg-primary/10 text-primary border-primary/20 font-black uppercase tracking-widest text-[9px] px-2.5 py-1">
                                        <Icons.zap size={10} className="mr-1" /> CREATOR
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                            <div className="flex items-center gap-1.5 text-foreground-muted text-[10px] font-black uppercase tracking-widest">
                                <Icons.history size={12} className="opacity-50" />
                                <span>Member since {formatDate(author.createdAt)}</span>
                            </div>
                        </div>

                        {author.bio && (
                            <div className="relative group/bio max-w-2xl">
                                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                                <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap italic font-medium pl-4">
                                    &quot;{author.bio}&quot;
                                </p>
                            </div>
                        )}

                        {author.socialLinks && (
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 mt-8 pt-6 border-t border-border/50">
                                {author.socialLinks.twitter && (
                                    <a href={`https://x.com/${author.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-primary transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group/social">
                                        <div className="p-2 rounded-lg bg-background-secondary group-hover/social:bg-primary/10 transition-colors">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                        </div>
                                        {author.socialLinks.twitter}
                                    </a>
                                )}
                                {author.socialLinks.instagram && (
                                    <a href={`https://instagram.com/${author.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-accent transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group/social">
                                        <div className="p-2 rounded-lg bg-background-secondary group-hover/social:bg-accent/10 transition-colors">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5a4.25 4.25 0 0 0-4.25 4.25v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm5.25-.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" /></svg>
                                        </div>
                                        {author.socialLinks.instagram}
                                    </a>
                                )}
                                {author.socialLinks.website && (
                                    <a href={author.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-primary transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group/social">
                                        <div className="p-2 rounded-lg bg-background-secondary group-hover/social:bg-primary/10 transition-colors">
                                            <Icons.globe size={14} />
                                        </div>
                                        Website
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pb-2">
                        {currentUser?.uid === author.uid ? (
                            <Link href="/settings">
                                <Button variant="secondary" className="px-6 h-12 font-black uppercase tracking-[0.15em] text-[10px] border-primary/20 shadow-xl shadow-primary/5 hover:shadow-primary/10 transition-all">
                                    <Icons.settings size={14} className="mr-2" />
                                    Edit Profile
                                </Button>
                            </Link>
                        ) : currentUser && (
                            <Button
                                onClick={onToggleFollow}
                                disabled={followLoading}
                                variant={isFollowing ? 'secondary' : 'primary'}
                                className={cn(
                                    "px-8 h-12 font-black uppercase tracking-[0.2em] text-[11px] min-w-[180px] shadow-2xl transition-all duration-500",
                                    !isFollowing && "shadow-primary/20"
                                )}
                            >
                                {followLoading ? (
                                    <Icons.spinner className="w-5 h-5 animate-spin" />
                                ) : (
                                    isFollowing ? (
                                        <span className="flex items-center gap-2">
                                            <Icons.check size={14} /> Unfollow
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Icons.plus size={14} /> Follow Creator
                                        </span>
                                    )
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
