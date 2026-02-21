import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteField, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GeneratedImage } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';

export function useImageDetails(
    image: GeneratedImage,
    onUpdate: (updatedImage: GeneratedImage) => void
) {
    const { user } = useAuth();
    const { showToast } = useToast();

    // Prompt Set ID State
    const [isEditingPromptSetID, setIsEditingPromptSetID] = useState(false);
    const [editingPromptSetID, setEditingPromptSetID] = useState('');
    const [isSavingPromptSetID, setIsSavingPromptSetID] = useState(false);

    // Tags State
    const [newImageTag, setNewImageTag] = useState('');
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);

    // League State
    const [publishingId, setPublishingId] = useState<string | null>(null);

    // Initialize editing state when image changes
    useEffect(() => {
        setEditingPromptSetID(image.promptSetID || '');
        setNewImageTag('');
    }, [image.id, image.promptSetID]);

    const updatePromptSetID = async () => {
        if (!user) return;

        setIsSavingPromptSetID(true);
        try {
            const cleanID = editingPromptSetID.trim();
            const imageRef = doc(db, 'users', user.uid, 'images', image.id);

            await updateDoc(imageRef, {
                promptSetID: cleanID || deleteField()
            });

            onUpdate({ ...image, promptSetID: cleanID || undefined });
            setIsEditingPromptSetID(false);
            showToast('Prompt Set ID updated', 'success');
        } catch (error) {
            console.error('Error updating promptSetID:', error);
            showToast('Failed to update Prompt Set ID', 'error');
        } finally {
            setIsSavingPromptSetID(false);
        }
    };

    const addTag = async () => {
        if (!user || !newImageTag.trim()) return;

        const tag = newImageTag.trim().toLowerCase();
        if (image.tags?.includes(tag)) {
            setNewImageTag('');
            return;
        }

        setIsUpdatingTags(true);
        try {
            const imageRef = doc(db, 'users', user.uid, 'images', image.id);
            await updateDoc(imageRef, {
                tags: arrayUnion(tag)
            });

            onUpdate({ ...image, tags: [...(image.tags || []), tag] });
            setNewImageTag('');
            showToast('Tag added', 'success');
        } catch (error) {
            console.error('Failed to add tag:', error);
            showToast('Failed to add tag', 'error');
        } finally {
            setIsUpdatingTags(false);
        }
    };

    const removeTag = async (tag: string) => {
        if (!user) return;

        setIsUpdatingTags(true);
        try {
            const imageRef = doc(db, 'users', user.uid, 'images', image.id);
            await updateDoc(imageRef, {
                tags: arrayRemove(tag)
            });

            onUpdate({ ...image, tags: (image.tags || []).filter(t => t !== tag) });
            showToast('Tag removed', 'success');
        } catch (error) {
            console.error('Failed to remove tag:', error);
            showToast('Failed to remove tag', 'error');
        } finally {
            setIsUpdatingTags(false);
        }
    };

    const toggleLeague = async () => {
        if (!user) return;
        const action = image.publishedToLeague ? 'unpublish' : 'publish';
        if (action === 'unpublish' && !confirm('Remove this image from the Community League?')) return;

        setPublishingId(image.id);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/league/publish/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ imageId: image.id, action }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            onUpdate({
                ...image,
                publishedToLeague: action === 'publish',
                leagueEntryId: action === 'publish' ? data.leagueEntryId : undefined,
            });

            showToast(
                action === 'publish' ? '🏆 Published to Community League!' : 'Removed from Community League',
                'success'
            );
        } catch (error: any) {
            console.error('[Gallery] League toggle error:', error);
            showToast(error.message || 'Failed to update league status', 'error');
        } finally {
            setPublishingId(null);
        }
    };

    const toggleCollection = async (collectionId: string) => {
        if (!user) return;

        const currentIds = image.collectionIds || [];
        if (!image.collectionIds && image.collectionId) {
            currentIds.push(image.collectionId);
        }

        const isAdding = !currentIds.includes(collectionId);
        let newIds: string[];

        if (isAdding) {
            newIds = [...currentIds, collectionId];
        } else {
            newIds = currentIds.filter(id => id !== collectionId);
        }

        try {
            // Optimistic update
            onUpdate({ ...image, collectionIds: newIds, collectionId: undefined });

            const imageRef = doc(db, 'users', user.uid, 'images', image.id);
            await updateDoc(imageRef, {
                collectionIds: newIds,
                collectionId: deleteField()
            });

            showToast(isAdding ? 'Added to collection' : 'Removed from collection', 'success');
        } catch (error) {
            console.error('Error toggling collection:', error);
            showToast('Failed to update collection', 'error');
        }
    };

    const downloadImage = async (format: 'png' | 'jpeg' = 'png') => {
        try {
            console.log('[Gallery] Initiating download for image:', image.id);
            const filename = `studio-image-${image.id}.${format}`;
            const proxyUrl = `/api/download/?url=${encodeURIComponent(image.imageUrl)}&filename=${encodeURIComponent(filename)}`;

            const link = document.createElement('a');
            link.href = proxyUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (user) {
                const imageRef = doc(db, 'users', user.uid, 'images', image.id);
                await updateDoc(imageRef, {
                    downloadCount: increment(1),
                });
            }
        } catch (error) {
            console.error('[Gallery] Download error:', error);
            window.open(image.imageUrl, '_blank');
        }
    };

    return {
        // State
        isEditingPromptSetID,
        setIsEditingPromptSetID,
        editingPromptSetID,
        setEditingPromptSetID,
        isSavingPromptSetID,
        newImageTag,
        setNewImageTag,
        isUpdatingTags,
        publishingId,

        // Actions
        updatePromptSetID,
        addTag,
        removeTag,
        toggleLeague,
        toggleCollection,
        downloadImage
    };
}
