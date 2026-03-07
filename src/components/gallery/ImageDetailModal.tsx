import { GeneratedImage, Collection } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { useImageDetails } from '@/hooks/useImageDetails';
import ImageDisplay from './image-detail/ImageDisplay';
import ImageMetadataSidebar from './image-detail/ImageMetadataSidebar';
import ConfirmationModal from '@/components/ConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '@/components/ui/Icons';

interface ImageDetailModalProps {
    selectedImage: GeneratedImage;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    collections: Collection[];
    onUpdate: (updatedImage: GeneratedImage) => void;
    onDelete: (imageId: string) => void;
    deletingId: string | null;
}

export default function ImageDetailModal({
    selectedImage,
    onClose,
    onNext,
    onPrev,
    collections,
    onUpdate,
    onDelete,
    deletingId
}: ImageDetailModalProps) {
    const { showToast } = useToast();

    const {
        isEditingPromptSetID,
        setIsEditingPromptSetID,
        editingPromptSetID,
        setEditingPromptSetID,
        isSavingPromptSetID,
        isEditingPromptSetName,
        setIsEditingPromptSetName,
        editingPromptSetName,
        setEditingPromptSetName,
        isSavingPromptSetName,
        existingPromptSetIDs,
        isLoadingSuggestions,
        newImageTag,
        setNewImageTag,
        isUpdatingTags,
        publishingId,
        updatePromptSetID,
        updatePromptSetName,
        addTag,
        removeTag,
        toggleCommunity,
        toggleCollection,
        createCollection,
        downloadImage,
        isAdmin,
        toggleExemplar,
        showUnpublishConfirm,
        setShowUnpublishConfirm,
        confirmUnpublish
    } = useImageDetails(selectedImage, onUpdate);

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(selectedImage.prompt);
        showToast('Prompt copied to clipboard', 'success');
    };

    const handleCopySeed = () => {
        if (selectedImage.settings?.seed) {
            navigator.clipboard.writeText(String(selectedImage.settings.seed));
            showToast('Seed copied to clipboard', 'success');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white z-[1010]"
            >
                <Icons.close size={24} />
            </button>

            <div
                className="bg-black/50 border border-white/5 rounded-3xl w-full h-full flex flex-col overflow-hidden relative max-w-7xl mx-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col md:flex-row min-h-0 flex-1">
                    <ImageDisplay
                        image={selectedImage}
                        onPrev={onPrev}
                        onNext={onNext}
                        onEdit={() => window.location.href = `/edit?imageId=${selectedImage.id}`}
                        onPublishToggle={toggleCommunity}
                        onDownload={() => downloadImage()}
                        onDelete={() => onDelete(selectedImage.id)}
                        publishingId={publishingId}
                        deletingId={deletingId}
                    />

                    <ImageMetadataSidebar
                        image={selectedImage}
                        onClose={onClose}
                        collections={collections}
                        onToggleCollection={toggleCollection}
                        onCreateCollection={createCollection}
                        // Prompt Set ID
                        isEditingPromptSetID={isEditingPromptSetID}
                        editingPromptSetID={editingPromptSetID}
                        isSavingPromptSetID={isSavingPromptSetID}
                        existingPromptSetIDs={existingPromptSetIDs}
                        isLoadingSuggestions={isLoadingSuggestions}
                        onStartEditingPromptSetID={() => setIsEditingPromptSetID(true)}
                        onCancelEditingPromptSetID={() => {
                            setIsEditingPromptSetID(false);
                            setEditingPromptSetID(selectedImage.promptSetID || '');
                        }}
                        onChangeEditingPromptSetID={setEditingPromptSetID}
                        onSavePromptSetID={updatePromptSetID}
                        // Prompt Set Name
                        isEditingPromptSetName={isEditingPromptSetName}
                        editingPromptSetName={editingPromptSetName}
                        isSavingPromptSetName={isSavingPromptSetName}
                        onStartEditingPromptSetName={() => setIsEditingPromptSetName(true)}
                        onCancelEditingPromptSetName={() => {
                            setIsEditingPromptSetName(false);
                            setEditingPromptSetName(selectedImage.promptSetName || '');
                        }}
                        onChangeEditingPromptSetName={setEditingPromptSetName}
                        onSavePromptSetName={updatePromptSetName}
                        // Tags
                        newImageTag={newImageTag}
                        isUpdatingTags={isUpdatingTags}
                        onAddTag={addTag}
                        onRemoveTag={removeTag}
                        onChangeNewTag={setNewImageTag}
                        onCopyPrompt={handleCopyPrompt}
                        onCopySeed={handleCopySeed}
                        onGenerateVariation={() => {
                            const sid = selectedImage.promptSetID || selectedImage.settings?.promptSetID;
                            window.location.href = `/generate?ref=${selectedImage.id}${sid ? `&sid=${sid}` : ''}&tab=current`;
                        }}
                        isAdmin={isAdmin}
                        onToggleExemplar={toggleExemplar}
                    />
                </div>
            </div>

            {/* Unpublish Confirmation Modal */}
            <ConfirmationModal
                isOpen={showUnpublishConfirm}
                title="Remove from Community Hub"
                message="Are you sure you want to remove this image from the Community Hub? This will delete all associated votes and comments."
                confirmLabel="Remove from Hub"
                cancelLabel="Keep it"
                onConfirm={confirmUnpublish}
                onCancel={() => setShowUnpublishConfirm(false)}
                type="danger"
                isLoading={publishingId !== null}
            />
        </motion.div>
    );
}
