'use client';

import Link from 'next/link';

interface DashboardStatsProps {
    availableCredits: number;
    dailyRemaining: number;
    balance: number;
    imageCount: number;
    subscription: string;
}

export default function DashboardStats({
    availableCredits,
    dailyRemaining,
    balance,
    imageCount,
    subscription
}: DashboardStatsProps) {
    return (
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
                            {dailyRemaining} daily + {balance} purchased
                        </p>
                    </div>
                    {subscription !== 'pro' && (
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
                <p className="text-3xl font-bold">{imageCount}</p>
                <p className="text-sm text-foreground-muted">Total generations</p>
            </div>

            <div className="card">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground-muted">Current Plan</span>
                    <span className="text-2xl">⭐</span>
                </div>
                <p className="text-3xl font-bold capitalize">{subscription}</p>
                <p className="text-sm text-foreground-muted">
                    {subscription === 'free' ? 'Upgrade for more features' : 'Premium features active'}
                </p>
            </div>
        </div>
    );
}
