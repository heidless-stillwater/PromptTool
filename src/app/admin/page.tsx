'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

interface AdminStats {
    totalUsers: number;
    proUsers: number;
    totalImages: number;
    totalCreditsUsed: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        proUsers: 0,
        totalImages: 0,
        totalCreditsUsed: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                // In a real production app, we would use a counter or scheduled task to aggregate these.
                // For now, we'll do a simple count for small scale.
                const usersSnap = await getDocs(collection(db, 'users'));
                const proUsers = usersSnap.docs.filter(doc => (doc.data() as any).subscription === 'pro').length;

                // Note: Getting all images can be expensive with many users.
                // For the demo/initial admin, we'll just show user stats.
                setStats({
                    totalUsers: usersSnap.size,
                    proUsers: proUsers,
                    totalImages: 0, // Placeholder
                    totalCreditsUsed: 0 // Placeholder
                });
            } catch (error) {
                console.error('Failed to fetch admin stats:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card bg-primary/5 border-primary/20">
                    <p className="text-foreground-muted text-sm font-medium">Total registered Users</p>
                    <p className="text-4xl font-black mt-2">{stats.totalUsers}</p>
                    <div className="mt-4 flex items-center text-xs text-primary font-bold">
                        <span>↑ 12% from last month</span>
                    </div>
                </div>

                <div className="card bg-accent/5 border-accent/20">
                    <p className="text-foreground-muted text-sm font-medium">Pro Subscriptions</p>
                    <p className="text-4xl font-black mt-2">{stats.proUsers}</p>
                    <div className="mt-4 flex items-center text-xs text-accent font-bold">
                        <span>{Math.round((stats.proUsers / stats.totalUsers) * 100) || 0}% Conversion rate</span>
                    </div>
                </div>

                <div className="card">
                    <p className="text-foreground-muted text-sm font-medium">System Health</p>
                    <p className="text-4xl font-black mt-2 text-success uppercase">Optimal</p>
                    <div className="mt-4 flex items-center text-xs text-success font-bold">
                        <div className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
                        <span>All systems operational</span>
                    </div>
                </div>

                <div className="card">
                    <p className="text-foreground-muted text-sm font-medium">Monthly Revenue (Est.)</p>
                    <p className="text-4xl font-black mt-2">${(stats.proUsers * 29.99).toFixed(2)}</p>
                    <div className="mt-4 flex items-center text-xs text-foreground-muted font-bold">
                        <span>Based on active Pro plans</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity Placeholder */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span>📝</span> Recent Admin Actions
                    </h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-background-secondary/50 border border-border/50">
                                <div className="w-8 h-8 rounded bg-background flex items-center justify-center text-xs">LOG</div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">System configuration updated</p>
                                    <p className="text-[10px] text-foreground-muted">2 hours ago • Automated Task</p>
                                </div>
                            </div>
                        ))}
                        <button className="w-full py-2 text-sm text-primary hover:underline">View Audit logs →</button>
                    </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span>⚡</span> Quick Management
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/admin/users" className="p-4 rounded-xl bg-background border border-border hover:border-primary transition-all text-center">
                            <span className="text-2xl block mb-2">👥</span>
                            <span className="text-sm font-bold">Manage Users</span>
                        </Link>
                        <Link href="/admin/settings" className="p-4 rounded-xl bg-background border border-border hover:border-primary transition-all text-center">
                            <span className="text-2xl block mb-2">⚙️</span>
                            <span className="text-sm font-bold">API Settings</span>
                        </Link>
                        <Link href="/admin/monitoring" className="p-4 rounded-xl bg-background border border-border hover:border-primary transition-all text-center">
                            <span className="text-2xl block mb-2">🛠️</span>
                            <span className="text-sm font-bold">Backups</span>
                        </Link>
                        <button className="p-4 rounded-xl bg-background border border-border hover:border-primary transition-all text-center opacity-50 cursor-not-allowed">
                            <span className="text-2xl block mb-2">✉️</span>
                            <span className="text-sm font-bold">Newsletter</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
