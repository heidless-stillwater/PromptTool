import { Icons } from '@/components/ui/Icons';

interface PromptSetNameManagerProps {
    promptSetName?: string;
    isEditing: boolean;
    editingValue: string;
    isSaving: boolean;
    onStartEditing: () => void;
    onCancelEditing: () => void;
    onChangeValue: (value: string) => void;
    onSave: () => void;
}

export default function PromptSetNameManager({
    promptSetName,
    isEditing,
    editingValue,
    isSaving,
    onStartEditing,
    onCancelEditing,
    onChangeValue,
    onSave
}: PromptSetNameManagerProps) {
    return (
        <div className="">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-foreground-muted uppercase tracking-wide">Prompt Set Name</label>
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
                <div className="mt-2 space-y-2 relative">
                    <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => onChangeValue(e.target.value)}
                        placeholder="Enter Set Name"
                        className="w-full px-4 py-2.5 rounded-xl bg-background-secondary border border-border text-foreground text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-foreground-muted"
                        autoFocus
                    />
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
                            className="px-3 bg-background-secondary text-foreground text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-background-tertiary transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={onStartEditing}
                    className="mt-1 flex items-center justify-between p-3 bg-background-secondary border border-border/50 rounded-xl cursor-pointer hover:border-primary/50 transition-all group/sname"
                >
                    <p className="text-xs text-foreground-muted truncate" title={promptSetName}>
                        {promptSetName || 'No Set Name'}
                    </p>
                    <Icons.settings size={12} className="text-foreground-muted group-hover/sname:text-primary transition-colors opacity-0 group-hover/sname:opacity-100" />
                </div>
            )}
        </div>
    );
}

