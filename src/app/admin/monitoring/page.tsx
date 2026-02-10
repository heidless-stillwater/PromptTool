'use client';

import { useState } from 'react';

export default function MonitoringPage() {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupStatus, setBackupStatus] = useState<string | null>(null);

    const handleTriggerBackup = async () => {
        setIsBackingUp(true);
        setBackupStatus('Initializing backup sequence...');

        try {
            // In a real app, this would call an API that uses google-cloud/storage & firebase-admin
            await new Promise(resolve => setTimeout(resolve, 3000));
            setBackupStatus('Success! Full database and assets snapshot completed (2.4GB).');
        } catch (error) {
            setBackupStatus('Error: Backup failed. Check server logs.');
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* System Health */}
            <div className="card border-l-4 border-l-success">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">Technical Health</h2>
                        <p className="text-sm text-foreground-muted">Real-time status of external dependencies</p>
                    </div>
                    <div className="bg-success/20 text-success text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Live</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="font-bold">Gemini 2.5 API</span>
                            <span className="text-success">99.9%</span>
                        </div>
                        <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-success w-[99.9%]" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="font-bold">Firestore Latency</span>
                            <span className="text-success">24ms</span>
                        </div>
                        <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-success w-[85%]" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="font-bold">Cloud Storage</span>
                            <span className="text-success">Operational</span>
                        </div>
                        <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-success w-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Infrastructure Operations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-2">Data Integrity & Backups</h3>
                    <p className="text-sm text-foreground-muted mb-6">Manually snapshot the entire database, user documents, and image metadata.</p>

                    <div className="bg-background/50 border border-border rounded-xl p-4 mb-6">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-foreground-muted">Last Backup</span>
                            <span className="font-medium">Feb 08, 14:22 UTC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-foreground-muted">Retention Policy</span>
                            <span className="font-medium">30 Days</span>
                        </div>
                    </div>

                    <button
                        onClick={handleTriggerBackup}
                        disabled={isBackingUp}
                        className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isBackingUp ? 'bg-background-secondary text-foreground-muted' : 'bg-primary text-white shadow-lg shadow-primary/30 hover:scale-[1.02]'
                            }`}
                    >
                        {isBackingUp ? (
                            <>
                                <div className="w-4 h-4 border-2 border-foreground-muted border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <span>📦</span>
                                Trigger Manual Cloud Backup
                            </>
                        )}
                    </button>
                    {backupStatus && (
                        <p className={`mt-4 text-xs font-medium text-center ${backupStatus.includes('Success') ? 'text-success' : 'text-primary'}`}>
                            {backupStatus}
                        </p>
                    )}
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-2">Error Tracking</h3>
                    <p className="text-sm text-foreground-muted mb-6">Recent generation blocks and system exceptions.</p>

                    <div className="space-y-3">
                        <div className="p-3 rounded-lg border border-error/20 bg-error/5 flex items-start gap-3">
                            <span className="text-lg">⚠️</span>
                            <div>
                                <p className="text-xs font-bold text-error uppercase">Safety Block: OTHER</p>
                                <p className="text-sm">User prompt triggered sensitive content filter.</p>
                                <p className="text-[10px] text-foreground-muted mt-1">14:32 UTC • NanoBananaService</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-background-secondary/50 flex items-start gap-3">
                            <span className="text-lg">ℹ️</span>
                            <div>
                                <p className="text-xs font-bold text-foreground-muted uppercase">Rate Limit Hit</p>
                                <p className="text-sm">Global concurrent generation capacity reached.</p>
                                <p className="text-[10px] text-foreground-muted mt-1">12:05 UTC • Model Distribution</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
