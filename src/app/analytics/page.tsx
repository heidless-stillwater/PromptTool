'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsStats {
    totalUpvotes: number;
    totalComments: number;
    totalEntries: number;
    totalReach: number; // Sum of upvotes + comments
}

interface ChartDataPoint {
    date: string;
    engagement: number;
    entries: number;
}

export default function AnalyticsPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<AnalyticsStats>({
        totalUpvotes: 0,
        totalComments: 0,
        totalEntries: 0,
        totalReach: 0
    });
    const [entryData, setEntryData] = useState<any[]>([]);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        async function fetchAnalytics() {
            if (!user) return;

            try {
                // Fetch all league entries by this user
                const entriesRef = collection(db, 'leagueEntries');
                const q = query(entriesRef, where('originalUserId', '==', user.uid));
                const snapshot = await getDocs(q);

                let upvotes = 0;
                let comments = 0;
                const entries = snapshot.docs.map(doc => {
                    const data = doc.data();
                    upvotes += data.voteCount || 0;
                    comments += data.commentCount || 0;
                    return { id: doc.id, ...data } as any;
                });

                // Process time-series data for the last 30 days
                const last30Days = [...Array(30)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    return d.toISOString().split('T')[0];
                }).reverse();

                const statsByDate = last30Days.reduce((acc, date) => {
                    acc[date] = {
                        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        engagement: 0,
                        entries: 0
                    };
                    return acc;
                }, {} as any);

                entries.forEach(entry => {
                    const date = new Date(entry.publishedAt?.toDate ? entry.publishedAt.toDate() : entry.publishedAt)
                        .toISOString().split('T')[0];
                    if (statsByDate[date]) {
                        statsByDate[date].engagement += (entry.voteCount || 0) + (entry.commentCount || 0);
                        statsByDate[date].entries += 1;
                    }
                });

                // Sort by performance
                entries.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

                setStats({
                    totalUpvotes: upvotes,
                    totalComments: comments,
                    totalEntries: snapshot.size,
                    totalReach: upvotes + comments
                });
                setEntryData(entries);
                setChartData(Object.values(statsByDate));

            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setIsFetching(false);
            }
        }

        if (user) {
            fetchAnalytics();
        }
    }, [user]);

    if (loading || isFetching) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!user || !profile) return null;

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-background-secondary rounded-xl transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold">Creator Analytics</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="card bg-primary/5 border-primary/20">
                        <p className="text-sm font-bold uppercase tracking-widest text-primary mb-1">Total Reach</p>
                        <p className="text-4xl font-black">{stats.totalReach}</p>
                        <p className="text-xs text-foreground-muted mt-2">Combined engagement</p>
                    </div>
                    <div className="card">
                        <p className="text-sm font-bold uppercase tracking-widest text-foreground-muted mb-1">Upvotes</p>
                        <p className="text-4xl font-black">❤️ {stats.totalUpvotes}</p>
                        <p className="text-xs text-foreground-muted mt-2">Total likes received</p>
                    </div>
                    <div className="card">
                        <p className="text-sm font-bold uppercase tracking-widest text-foreground-muted mb-1">Comments</p>
                        <p className="text-4xl font-black">💬 {stats.totalComments}</p>
                        <p className="text-xs text-foreground-muted mt-2">Discussion contribution</p>
                    </div>
                    <div className="card">
                        <p className="text-sm font-bold uppercase tracking-widest text-foreground-muted mb-1">League Entries</p>
                        <p className="text-4xl font-black">🏆 {stats.totalEntries}</p>
                        <p className="text-xs text-foreground-muted mt-2">Content published</p>
                    </div>
                </div>

                {/* Visualizations */}
                <section className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Engagement Trends</h2>
                        <span className="text-sm text-foreground-muted font-medium">Last 30 days</span>
                    </div>
                    <div className="glass-card h-[350px] w-full pt-8 pb-4 pr-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorEngage" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        fontSize: '12px'
                                    }}
                                    itemStyle={{ color: '#ec4899', fontWeight: 'bold' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="engagement"
                                    stroke="#ec4899"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorEngage)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Content Performance */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Content Performance</h2>
                        <span className="text-sm text-foreground-muted font-medium">Sorted by engagement</span>
                    </div>

                    {entryData.length === 0 ? (
                        <div className="card text-center py-20 grayscale opacity-50">
                            <div className="text-6xl mb-4">📉</div>
                            <h3 className="text-xl font-bold mb-2">No data yet</h3>
                            <p className="text-foreground-muted mb-6">Publish images to the League to start seeing analytics!</p>
                            <Link href="/league" className="btn-primary inline-block">Visit League</Link>
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-background-secondary/50">
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Preview</th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Prompt</th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">Upvotes</th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">Comments</th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Engagement</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {entryData.map((entry) => {
                                            const engagement = (entry.voteCount || 0) + (entry.commentCount || 0);
                                            const maxEngagement = stats.totalReach || 1;
                                            const barWidth = Math.max(5, (engagement / maxEngagement) * 100);

                                            return (
                                                <tr key={entry.id} className="hover:bg-primary/5 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="w-16 h-10 rounded-lg overflow-hidden border border-border group-hover:scale-110 transition-transform">
                                                            <img src={entry.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-medium line-clamp-1 max-w-xs">{entry.prompt}</p>
                                                        <p className="text-[10px] text-foreground-muted uppercase tracking-tighter mt-0.5">
                                                            {new Date(entry.publishedAt?.toDate ? entry.publishedAt.toDate() : entry.publishedAt).toLocaleDateString()}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold">
                                                        {entry.voteCount || 0}
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold">
                                                        {entry.commentCount || 0}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <div className="flex-1 max-w-[100px] h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary rounded-full"
                                                                    style={{ width: `${barWidth}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-black w-8 text-right">{engagement}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
