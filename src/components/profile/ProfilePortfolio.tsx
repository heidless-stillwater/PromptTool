'use client';

import Link from 'next/link';
import { LeagueEntry } from '@/lib/types';
import ConfirmationModal from '@/components/ConfirmationModal';

interface ProfilePortfolioProps {
    entries: LeagueEntry[];
    currentUser: any;
    selectedEntry: LeagueEntry | null;
    setSelectedEntry: (entry: LeagueEntry | null) => void;
    showReportModal: boolean;
    setShowReportModal: (show: boolean) => void;
    isReporting: boolean;
    onConfirmReport: () => void;
    queryError: string | null;
}

export default function ProfilePortfolio({
    entries,
    currentUser,
    selectedEntry,
    setSelectedEntry,
    showReportModal,
    setShowReportModal,
    isReporting,
    onConfirmReport,
    queryError
}: ProfilePortfolioProps) {
    return (
        <>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-3xl">🖼️</span>
                Creation Portfolio
            </h2>

            {queryError && (
                <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>
                        <strong>Error loading profile entries:</strong> {queryError}
                        {queryError.includes('index') && (
                            <span className="block mt-1 opacity-80">Firestore indexes may still be building or need manual deployment.</span>
                        )}
                    </p>
                </div>
            )}

            {entries.length === 0 ? (
                <div className="text-center py-16 glass-card rounded-2xl">
                    <div className="text-6xl mb-4 opacity-30">🏜️</div>
                    <h2 className="text-xl font-semibold mb-2">Portfolio is empty</h2>
                    <p className="text-foreground-muted">
                        This author hasn&apos;t published any images to the league yet.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {entries.map((entry) => (
                        <div
                            key={entry.id}
                            className="glass-card rounded-2xl overflow-hidden group hover:ring-2 hover:ring-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
                            onClick={() => setSelectedEntry(entry)}
                        >
                            <div className="aspect-square relative overflow-hidden">
                                <img
                                    src={entry.imageUrl}
                                    alt={entry.prompt}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <div className="flex items-center gap-4 text-white">
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <span>❤️</span> {entry.voteCount}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <span>💬</span> {entry.commentCount}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Detail Modal */}
            {selectedEntry && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 sm:p-8"
                    onClick={() => setSelectedEntry(null)}
                >
                    <div
                        className="bg-background rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                            onClick={() => setSelectedEntry(null)}
                        >
                            ✕
                        </button>

                        <img
                            src={selectedEntry.imageUrl}
                            alt={selectedEntry.prompt}
                            className="w-full aspect-square object-cover"
                        />
                        <div className="p-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-2">Prompt Details</h3>
                            <p className="text-sm font-medium mb-6 leading-relaxed italic border-l-2 border-primary/30 pl-4">
                                &quot;{selectedEntry.prompt}&quot;
                            </p>

                            <div className="flex items-center justify-between pt-6 border-t border-border">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2 text-foreground font-bold">
                                            <span className="text-xl">❤️</span> {selectedEntry.voteCount}
                                        </div>
                                        <div className="flex items-center gap-2 text-foreground font-bold">
                                            <span className="text-xl">💬</span> {selectedEntry.commentCount}
                                        </div>
                                    </div>

                                    {currentUser && currentUser.uid !== selectedEntry.originalUserId && (
                                        <button
                                            onClick={() => setShowReportModal(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-foreground-muted hover:text-error hover:bg-error/10 border border-border hover:border-error/30 transition-all group/report"
                                            title="Report content"
                                        >
                                            <svg className="w-5 h-5 group-hover/report:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 01-2 2zm9-13.5V9" />
                                            </svg>
                                            <span className="text-xs font-bold">Report</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/league?entry=${selectedEntry.id}`}
                                        className="btn-secondary text-xs px-4 py-2 flex items-center gap-2"
                                        onClick={() => setSelectedEntry(null)}
                                    >
                                        View in League →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={showReportModal}
                title="Report Content"
                message="Are you sure you want to report this content for moderation? This action will notify our staff to review the entry."
                confirmLabel="Report"
                onConfirm={onConfirmReport}
                onCancel={() => setShowReportModal(false)}
                isLoading={isReporting}
                type="warning"
            />
        </>
    );
}
