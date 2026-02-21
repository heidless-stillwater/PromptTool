
interface PromptSetIDManagerProps {
    promptSetID?: string;
    isEditing: boolean;
    editingValue: string;
    isSaving: boolean;
    onStartEditing: () => void;
    onCancelEditing: () => void;
    onChangeValue: (value: string) => void;
    onSave: () => void;
}

export default function PromptSetIDManager({
    promptSetID,
    isEditing,
    editingValue,
    isSaving,
    onStartEditing,
    onCancelEditing,
    onChangeValue,
    onSave
}: PromptSetIDManagerProps) {
    return (
        <div className="pt-2 border-t border-border/50">
            <label className="text-xs text-foreground-muted uppercase tracking-wide flex items-center justify-between">
                Prompt Set ID
                {!isEditing && (
                    <button
                        onClick={onStartEditing}
                        className="text-primary hover:text-primary-hover font-bold"
                    >
                        Edit
                    </button>
                )}
            </label>
            {isEditing ? (
                <div className="mt-2 space-y-2">
                    <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => onChangeValue(e.target.value)}
                        placeholder="No Set ID"
                        className="w-full bg-background-secondary border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="flex-1 bg-primary text-white text-xs font-bold py-1.5 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={onCancelEditing}
                            disabled={isSaving}
                            className="px-3 bg-background-secondary text-foreground text-xs font-bold py-1.5 rounded-lg hover:bg-background-tertiary transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-sm mt-1 font-mono text-foreground-muted truncate" title={promptSetID}>
                    {promptSetID || 'No Set ID'}
                </p>
            )}
        </div>
    );
}

