import { Icons } from '@/components/ui/Icons';

interface AttributionManagerProps {
    attributionName?: string;
    attributionUrl?: string;
    isEditing: boolean;
    editingName: string;
    editingUrl: string;
    isSaving: boolean;
    onStartEditing: () => void;
    onCancelEditing: () => void;
    onChangeName: (value: string) => void;
    onChangeUrl: (value: string) => void;
    onSave: () => void;
}

export default function AttributionManager({
    attributionName,
    attributionUrl,
    isEditing,
    editingName,
    editingUrl,
    isSaving,
    onStartEditing,
    onCancelEditing,
    onChangeName,
    onChangeUrl,
    onSave
}: AttributionManagerProps) {
    return (
        <div className="">
            <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black tracking-widest text-white/40 uppercase flex items-center gap-2">
                    <Icons.user size={10} className="text-primary/50" />
                    Attribution
                </label>
                {!isEditing && (
                    <button
                        onClick={onStartEditing}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                    >
                        Edit
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="mt-2 space-y-3 relative">
                    <div className="space-y-1">
                        <input
                            type="text"
                            value={editingName}
                            onChange={(e) => onChangeName(e.target.value)}
                            placeholder="Name to credit"
                            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm transition-all focus:outline-none focus:border-primary/50 placeholder:text-white/20"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1">
                        <input
                            type="text"
                            value={editingUrl}
                            onChange={(e) => onChangeUrl(e.target.value)}
                            placeholder="Source URL (https://...)"
                            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm transition-all focus:outline-none focus:border-primary/50 placeholder:text-white/20"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="flex-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={onCancelEditing}
                            disabled={isSaving}
                            className="px-3 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={onStartEditing}
                    className="mt-1 flex flex-col gap-1 p-3 bg-white/[0.03] border border-white/5 rounded-xl cursor-pointer hover:border-primary/30 transition-all group/attribution"
                >
                    <div className="flex items-center justify-between">
                        {attributionUrl ? (
                            <a
                                href={attributionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm text-primary hover:text-primary/80 font-bold transition-colors flex items-center gap-1.5"
                            >
                                {attributionName || 'Unknown source'}
                                <Icons.external size={12} />
                            </a>
                        ) : (
                            <p className="text-sm text-white/90 font-bold">{attributionName || 'No Attribution'}</p>
                        )}
                        <Icons.settings size={12} className="text-white/20 group-hover/attribution:text-primary transition-colors opacity-0 group-hover/attribution:opacity-100" />
                    </div>
                </div>
            )}
        </div>
    );
}
