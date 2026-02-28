'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { Icons } from '@/components/ui/Icons';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface MiniStats {
    recentEngagement: { date: string; value: number }[];
    topEntry: { id: string; prompt: string; imageUrl: string; score: number } | null;
    totalReach: number;
}

export default function MiniAnalytics({ userId }: { userId: string }) {
    const [stats, setStats] = useState<MiniStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMiniStats() {
            try {
                const entriesRef = collection(db, 'leagueEntries');
                const q = query(
                    entriesRef,
                    where('originalUserId', '==', userId),
                    orderBy('publishedAt', 'desc'),
                    limit(10)
                );
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setStats({ recentEngagement: [], topEntry: null, totalReach: 0 });
                    return;
                }

                let totalReach = 0;
                let topEntry: MiniStats['topEntry'] = null;
                const trend: { date: string; value: number }[] = [];

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const score = (data.voteCount || 0) + (data.commentCount || 0);
                    totalReach += score;

                    if (!topEntry || score > topEntry.score) {
                        topEntry = {
                            id: doc.id,
                            prompt: data.prompt,
                            imageUrl: data.imageUrl,
                            score
                        };
                    }

                    const date = new Date(data.publishedAt?.toDate ? data.publishedAt.toDate() : data.publishedAt)
                        .toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                    trend.push({ date, value: score });
                });

                setStats({
                    recentEngagement: trend.reverse(),
                    topEntry,
                    totalReach
                });
            } catch (err) {
                console.error('Error fetching mini stats:', err);
            } finally {
                setLoading(false);
            }
        }

        if (userId) fetchMiniStats();
    }, [userId]);

    if (loading || !stats || (stats.recentEngagement.length === 0 && !stats.topEntry)) {
        return null;
    }

    return (
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Icons.activity size={12} />
                    Engagement Pulse
                </h3>
                <span className="text-[10px] font-bold text-white/50">Last 10 entries</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Trend Chart */}
                <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.recentEngagement}>
                            <defs>
                                <linearGradient id="miniColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#818cf8"
                                fillOpacity={1}
                                fill="url(#miniColor)"
                                strokeWidth={2}
                                isAnimationActive={true}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                    <p className="text-[9px] font-bold text-center mt-1 text-white/50 uppercase tracking-widest">Velocity</p>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-col justify-center">
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-white">{stats.totalReach}</span>
                        <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Impact</span>
                    </div>
                    {stats.topEntry && (
                        <div className="mt-2 flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                            <img src={stats.topEntry.imageUrl} className="w-6 h-6 rounded object-cover" alt="" />
                            <div className="overflow-hidden">
                                <p className="text-[8px] font-black uppercase tracking-widest text-primary leading-none">Best Performer</p>
                                <p className="text-[9px] font-bold text-white/70 truncate max-w-[60px]">{stats.topEntry.score} pts</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
