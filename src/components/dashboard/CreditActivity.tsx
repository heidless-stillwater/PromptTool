'use client';

import { CreditTransaction, GeneratedImage } from '@/lib/types';

interface CreditActivityProps {
    isExpanded: boolean;
    setIsExpanded: (val: boolean) => void;
    loading: boolean;
    history: CreditTransaction[];
    recentImages: GeneratedImage[];
}

export default function CreditActivity({
    isExpanded,
    setIsExpanded,
    loading,
    history,
    recentImages
}: CreditActivityProps) {
    return (
        <section className="mb-12">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-6 glass-card rounded-2xl hover:border-primary/50 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="text-xl font-bold">Credit Activity</h3>
                        <p className="text-xs text-foreground-muted">View your recent credit usage and transactions</p>
                    </div>
                </div>
                <div className={`p-2 rounded-lg bg-background-secondary border border-border transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            <div className={`transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[500px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="spinner" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="card text-center py-8 text-foreground-muted">
                        No recent credit activity
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-background-secondary/50 sticky top-0 z-10">
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Preview</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {history.map((tx) => {
                                        const txDate = tx.createdAt?.toDate ? tx.createdAt.toDate().getTime() : new Date(tx.createdAt).getTime();
                                        const metadataImage = tx.metadata?.imageUrl;
                                        const matchingImage = metadataImage ? { imageUrl: metadataImage } : (tx.type === 'usage' ? recentImages.find(img => {
                                            const imgDate = img.createdAt?.toDate ? img.createdAt.toDate().getTime() : new Date(img.createdAt as any).getTime();
                                            return Math.abs(imgDate - txDate) < 10000;
                                        }) : null);

                                        return (
                                            <tr key={tx.id} className="hover:bg-background-secondary/30 transition-colors">
                                                <td className="px-6 py-4 text-sm text-foreground-muted whitespace-nowrap">
                                                    {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : new Date(tx.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {matchingImage ? (
                                                        <img
                                                            src={matchingImage.imageUrl}
                                                            alt="Generation preview"
                                                            className="w-10 h-10 rounded object-cover border border-border"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded bg-background-secondary border border-border flex items-center justify-center text-lg">
                                                            {tx.type === 'usage' ? '🎨' : '💎'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-sm font-medium">
                                                    <p className="line-clamp-1">{tx.description}</p>
                                                    {tx.type === 'usage' && tx.metadata?.quality && (
                                                        <span className="mt-1 inline-block px-1.5 py-0.5 bg-background-secondary border border-border rounded text-[10px] uppercase">
                                                            {tx.metadata.quality}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${tx.amount > 0 ? 'text-success' : 'text-error'}`}>
                                                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
