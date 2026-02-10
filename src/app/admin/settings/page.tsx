'use client';

import { useState } from 'react';
import StatusModal, { ModalStatus } from '@/components/StatusModal';

export default function AdminSettingsPage() {
    const [announcement, setAnnouncement] = useState('Welcome to the new AI Image Studio!');
    const [isSaving, setIsSaving] = useState(false);
    const [model, setModel] = useState('flash');
    const [safety, setSafety] = useState('medium');
    const [modalStatus, setModalStatus] = useState<ModalStatus>('idle');

    const handleSave = async () => {
        setIsSaving(true);
        setModalStatus('saving');

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSaving(false);
        setModalStatus('success');
    };

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StatusModal
                status={modalStatus}
                onClose={() => setModalStatus('idle')}
            />
            {/* Announcement Banner */}
            <div className="glass-card p-8">
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">📢</span>
                    <div>
                        <h3 className="text-xl font-bold">Global Announcement</h3>
                        <p className="text-sm text-foreground-muted">This message will appear on all user generation pages.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <textarea
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                        className="input-field h-24 resize-none"
                        placeholder="Enter announcement text..."
                    />
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="show-banner" defaultChecked className="rounded border-border" />
                        <label htmlFor="show-banner" className="text-sm font-medium">Display banner to all active users</label>
                    </div>
                </div>
            </div>

            {/* Model & Safety Config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-8">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span>🤖</span> Engine Selection
                    </h3>
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary cursor-pointer transition-all">
                            <input
                                type="radio"
                                name="model"
                                checked={model === 'flash'}
                                onChange={() => setModel('flash')}
                                className="text-primary focus:ring-primary"
                            />
                            <div>
                                <p className="text-sm font-bold uppercase tracking-wider">Gemini 2.5 Flash</p>
                                <p className="text-xs text-foreground-muted">Fastest, economical, stable.</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary cursor-pointer transition-all">
                            <input
                                type="radio"
                                name="model"
                                checked={model === 'pro'}
                                onChange={() => setModel('pro')}
                                className="text-primary focus:ring-primary"
                            />
                            <div>
                                <p className="text-sm font-bold uppercase tracking-wider text-accent font-black">Gemini 3.0 Pro (Exp)</p>
                                <p className="text-xs text-foreground-muted">Highest quality, slower generation.</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="glass-card p-8">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span>🛡️</span> Safety Thresholds
                    </h3>
                    <div className="space-y-4">
                        <select
                            value={safety}
                            onChange={(e) => setSafety(e.target.value)}
                            className="select-field"
                        >
                            <option value="strict">Strict (BLOCK_LOW_AND_ABOVE)</option>
                            <option value="medium">Standard (BLOCK_MEDIUM_AND_ABOVE)</option>
                            <option value="permissive">Permissive (BLOCK_ONLY_HIGH)</option>
                        </select>
                        <p className="text-[10px] text-foreground-muted leading-relaxed">
                            These settings apply globally but can be overridden by specific user profile rules.
                            Permissive mode may result in more blocked generations by the underlying API.
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary px-10 py-4 font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                >
                    {isSaving ? 'Updating System...' : 'Save Global Settings'}
                </button>
            </div>
        </div>
    );
}
