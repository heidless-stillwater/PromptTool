import { GeneratedImage, Collection } from '@/lib/types';
import { formatDate } from '@/lib/date-utils';
import { useState } from 'react';
import CollectionSelector from './CollectionSelector';
import TagManager from './TagManager';
import PromptSetIDManager from './PromptSetIDManager';
import PromptSetNameManager from './PromptSetNameManager';
import AttributionManager from './AttributionManager';
import OriginatorManager from './OriginatorManager';
import ActionsBar from './ActionsBar';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

interface ImageMetadataSidebarProps {
    image: GeneratedImage;
    onClose: () => void;
    collections: Collection[];
    onToggleCollection: (collectionId: string) => void;
    onCreateCollection: (name: string) => void;
    // Prompt Set ID
    isEditingPromptSetID: boolean;
    editingPromptSetID: string;
    isSavingPromptSetID: boolean;
    onStartEditingPromptSetID: () => void;
    onCancelEditingPromptSetID: () => void;
    onChangeEditingPromptSetID: (val: string) => void;
    onSavePromptSetID: () => void;
    // Prompt Set Name
    isEditingPromptSetName: boolean;
    editingPromptSetName: string;
    isSavingPromptSetName: boolean;
    onStartEditingPromptSetName: () => void;
    onCancelEditingPromptSetName: () => void;
    onChangeEditingPromptSetName: (val: string) => void;
    onSavePromptSetName: () => void;
    // Attribution
    isEditingAttribution: boolean;
    editingAttributionName: string;
    editingAttributionUrl: string;
    isSavingAttribution: boolean;
    onStartEditingAttribution: () => void;
    onCancelEditingAttribution: () => void;
    onChangeEditingAttributionName: (val: string) => void;
    onChangeEditingAttributionUrl: (val: string) => void;
    onSaveAttribution: () => void;
    // Originator
    isEditingOriginator: boolean;
    editingOriginatorName: string;
    editingOriginatorUrl: string;
    isSavingOriginator: boolean;
    onStartEditingOriginator: () => void;
    onCancelEditingOriginator: () => void;
    onChangeEditingOriginatorName: (val: string) => void;
    onChangeEditingOriginatorUrl: (val: string) => void;
    onSaveOriginator: () => void;
    existingPromptSetIDs: { id: string, thumbUrl: string }[];
    isLoadingSuggestions: boolean;
    // Tags
    newImageTag: string;
    isUpdatingTags: boolean;
    onAddTag: () => void;
    onRemoveTag: (tag: string) => void;
    onChangeNewTag: (val: string) => void;
    // Actions
    onCopyPrompt: () => void;
    onCopySeed: () => void;
    onGenerateVariation: () => void;
    isAdmin?: boolean;
    onToggleExemplar?: () => void;
}

export default function ImageMetadataSidebar({
    image,
    onClose,
    collections,
    onToggleCollection,
    onCreateCollection,
    isEditingPromptSetID,
    editingPromptSetID,
    isSavingPromptSetID,
    onStartEditingPromptSetID,
    onCancelEditingPromptSetID,
    onChangeEditingPromptSetID,
    onSavePromptSetID,
    isEditingPromptSetName,
    editingPromptSetName,
    isSavingPromptSetName,
    onStartEditingPromptSetName,
    onCancelEditingPromptSetName,
    onChangeEditingPromptSetName,
    onSavePromptSetName,
    isEditingAttribution,
    editingAttributionName,
    editingAttributionUrl,
    isSavingAttribution,
    onStartEditingAttribution,
    onCancelEditingAttribution,
    onChangeEditingAttributionName,
    onChangeEditingAttributionUrl,
    onSaveAttribution,
    isEditingOriginator,
    editingOriginatorName,
    editingOriginatorUrl,
    isSavingOriginator,
    onStartEditingOriginator,
    onCancelEditingOriginator,
    onChangeEditingOriginatorName,
    onChangeEditingOriginatorUrl,
    onSaveOriginator,
    existingPromptSetIDs,
    isLoadingSuggestions,
    newImageTag,
    isUpdatingTags,
    onAddTag,
    onRemoveTag,
    onChangeNewTag,
    onCopyPrompt,
    onCopySeed,
    onGenerateVariation,
    isAdmin,
    onToggleExemplar
}: ImageMetadataSidebarProps) {
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const [isGeneralExpanded, setIsGeneralExpanded] = useState(false);
    const [isOriginExpanded, setIsOriginExpanded] = useState(false);

    // 100 character threshold for truncating
    const CHARACTER_LIMIT = 100;
    const shouldTruncate = image.prompt.length > CHARACTER_LIMIT;

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar border-t md:border-t-0 md:border-l border-white/5 bg-transparent min-h-0 min-w-[320px] max-w-sm flex flex-col gap-6 text-white pb-12">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[10px] uppercase tracking-widest text-primary font-black">Image Details</h2>
                </div>

                <div className="mb-6">
                    <PromptSetNameManager
                        promptSetName={image.promptSetName}
                        isEditing={isEditingPromptSetName}
                        editingValue={editingPromptSetName}
                        isSaving={isSavingPromptSetName}
                        onStartEditing={onStartEditingPromptSetName}
                        onCancelEditing={onCancelEditingPromptSetName}
                        onChangeValue={onChangeEditingPromptSetName}
                        onSave={onSavePromptSetName}
                    />
                </div>

                <div className="group/prompt relative bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[8px] uppercase tracking-widest text-foreground-muted">Prompt</label>
                        <button
                            onClick={onCopyPrompt}
                            className="text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover/prompt:opacity-100 transition-opacity hover:text-primary/80"
                        >
                            Copy Prompt
                        </button>
                    </div>
                    <div className={cn(
                        "text-sm leading-relaxed text-white/90 font-medium italic",
                        isPromptExpanded ? "max-h-[300px] overflow-y-auto custom-scrollbar pr-2" : ""
                    )}>
                        &quot;{isPromptExpanded || !shouldTruncate
                            ? image.prompt
                            : `${image.prompt.slice(0, CHARACTER_LIMIT)}...`}&quot;
                    </div>
                    {shouldTruncate && (
                        <button
                            onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                            className="text-[10px] text-primary hover:text-primary/80 uppercase tracking-widest font-black mt-2 transition-colors"
                        >
                            {isPromptExpanded ? "Show Less" : "Read More"}
                        </button>
                    )}

                    <Button
                        variant={image.status === 'draft' ? "outline" : "primary"}
                        size="sm"
                        onClick={onGenerateVariation}
                        className={cn(
                            "w-full mt-4 text-[10px] uppercase font-black tracking-widest h-9",
                            image.status === 'draft' ? "border-primary/50 text-primary hover:bg-primary/10" : ""
                        )}
                    >
                        <Icons.wand size={14} className="mr-2" />
                        {image.status === 'draft' ? "Resume Variation" : "New Variation"}
                    </Button>
                </div>
            </div>

            <div className="space-y-4 flex-1">
                <div className="pt-4 border-t border-white/5">
                    <CollectionSelector
                        collections={collections}
                        selectedIds={image.collectionIds || (image.collectionId ? [image.collectionId] : [])}
                        onToggle={onToggleCollection}
                        onCreate={onCreateCollection}
                    />
                </div>

                <div className="pt-4 border-t border-white/5">
                    <TagManager
                        tags={image.tags || []}
                        newTag={newImageTag}
                        isUpdating={isUpdatingTags}
                        onAdd={onAddTag}
                        onRemove={onRemoveTag}
                        onChangeNewTag={onChangeNewTag}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">Quality</label>
                        <p className="text-sm mt-1 capitalize text-white/90 font-bold">{image.settings.quality}</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">Aspect</label>
                        <p className="text-sm mt-1 text-white/90 font-bold">{image.settings.aspectRatio}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">Credits</label>
                        <p className="text-sm mt-1 text-white/90 font-bold">{image.creditsCost}</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">Downloads</label>
                        <p className="text-sm mt-1 text-white/90 font-bold">{image.downloadCount || 0}</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">Created</label>
                    <p className="text-sm mt-1 text-white/90 font-bold">{formatDate(image.createdAt)}</p>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <button
                        onClick={() => setIsGeneralExpanded(!isGeneralExpanded)}
                        className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors py-2"
                    >
                        <span className="flex items-center gap-2">
                            <Icons.settings size={12} className="text-primary/50" />
                            Generation Details
                        </span>
                        <Icons.chevronDown
                            size={14}
                            className={cn("transition-transform duration-200", isGeneralExpanded ? "rotate-180" : "")}
                        />
                    </button>

                    {isGeneralExpanded && (
                        <div className="mt-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
                            <div>
                                <PromptSetIDManager
                                    promptSetID={image.promptSetID}
                                    isEditing={isEditingPromptSetID}
                                    editingValue={editingPromptSetID}
                                    isSaving={isSavingPromptSetID}
                                    existingPromptSetIDs={existingPromptSetIDs}
                                    isLoadingSuggestions={isLoadingSuggestions}
                                    onStartEditing={onStartEditingPromptSetID}
                                    onCancelEditing={onCancelEditingPromptSetID}
                                    onChangeValue={onChangeEditingPromptSetID}
                                    onSave={onSavePromptSetID}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="group/seed relative">
                                    <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase flex justify-between items-center">
                                        Seed
                                        {image.settings?.seed && (
                                            <button
                                                onClick={onCopySeed}
                                                className="text-[8px] font-black uppercase tracking-widest text-primary opacity-0 group-hover/seed:opacity-100 transition-opacity hover:text-primary/80"
                                            >
                                                Copy
                                            </button>
                                        )}
                                    </label>
                                    <p className="text-sm mt-1 text-white/90 font-bold pr-2 truncate">{image.settings?.seed || 'Auto'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black tracking-widest text-white/40 mb-1 uppercase block">Guidance</label>
                                    <p className="text-sm mt-1 text-white/90 font-bold">{image.settings?.guidanceScale || 7.5}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-white/5">
                    <button
                        onClick={() => setIsOriginExpanded(!isOriginExpanded)}
                        className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors py-2"
                    >
                        <span className="flex items-center gap-2">
                            <Icons.user size={12} className="text-primary/50" />
                            Credit & Origin
                        </span>
                        <Icons.chevronDown
                            size={14}
                            className={cn("transition-transform duration-200", isOriginExpanded ? "rotate-180" : "")}
                        />
                    </button>

                    {isOriginExpanded && (
                        <div className="mt-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
                            <AttributionManager
                                attributionName={image.attributionName}
                                attributionUrl={image.attributionUrl}
                                isEditing={isEditingAttribution}
                                editingName={editingAttributionName}
                                editingUrl={editingAttributionUrl}
                                isSaving={isSavingAttribution}
                                onStartEditing={onStartEditingAttribution}
                                onCancelEditing={onCancelEditingAttribution}
                                onChangeName={onChangeEditingAttributionName}
                                onChangeUrl={onChangeEditingAttributionUrl}
                                onSave={onSaveAttribution}
                            />

                            <OriginatorManager
                                originatorName={image.originatorName}
                                originatorUrl={image.originatorUrl}
                                isEditing={isEditingOriginator}
                                editingName={editingOriginatorName}
                                editingUrl={editingOriginatorUrl}
                                isSaving={isSavingOriginator}
                                onStartEditing={onStartEditingOriginator}
                                onCancelEditing={onCancelEditingOriginator}
                                onChangeName={onChangeEditingOriginatorName}
                                onChangeUrl={onChangeEditingOriginatorUrl}
                                onSave={onSaveOriginator}
                            />
                        </div>
                    )}
                </div>


                {isAdmin && (
                    <div className="pt-4 border-t border-border/50">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onToggleExemplar}
                            className={`w-full justify-between h-9 text-[10px] uppercase font-black tracking-widest transition-all ${image.isExemplar ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10" : "text-foreground-muted hover:bg-background-secondary"
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Icons.exemplar size={14} className={image.isExemplar ? "fill-current" : ""} />
                                <span>Exemplar Status</span>
                            </div>
                            {image.isExemplar ? "Active" : "Off"}
                        </Button>
                    </div>
                )}

            </div>
        </div>
    );
}

