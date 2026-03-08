import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteField, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GeneratedImage } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { useCreateCollectionMutation } from './queries/useQueryHooks';

export function useImageDetails(
    image: GeneratedImage,
    onUpdate: (updatedImage: GeneratedImage) => void
) {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();

    // Prompt Set ID State
    const [isEditingPromptSetID, setIsEditingPromptSetID] = useState(false);
    const [editingPromptSetID, setEditingPromptSetID] = useState('');
    const [isSavingPromptSetID, setIsSavingPromptSetID] = useState(false);

    // Prompt Set Name State
    const [isEditingPromptSetName, setIsEditingPromptSetName] = useState(false);
    const [editingPromptSetName, setEditingPromptSetName] = useState('');
    const [isSavingPromptSetName, setIsSavingPromptSetName] = useState(false);

    // Attribution State
    const [isEditingAttribution, setIsEditingAttribution] = useState(false);
    const [editingAttributionName, setEditingAttributionName] = useState('');
    const [editingAttributionUrl, setEditingAttributionUrl] = useState('');
    const [isSavingAttribution, setIsSavingAttribution] = useState(false);

    // Originator State
    const [isEditingOriginator, setIsEditingOriginator] = useState(false);
    const [editingOriginatorName, setEditingOriginatorName] = useState('');
    const [editingOriginatorUrl, setEditingOriginatorUrl] = useState('');
    const [isSavingOriginator, setIsSavingOriginator] = useState(false);

    // Tags State
    const [newImageTag, setNewImageTag] = useState('');
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);

    // Community State
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
    const createCollectionMutation = useCreateCollectionMutation();

    // Suggestions for Prompt Set ID
    const [existingPromptSetIDs, setExistingPromptSetIDs] = useState<{ id: string, thumbUrl: string }[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    useEffect(() => {
        if (!isEditingPromptSetID || !user) return;

        const fetchExistingIDs = async () => {
            setIsLoadingSuggestions(true);
            try {
                const { collection, getDocs, orderBy, query, limit } = await import('firebase/firestore');
                const imagesRef = collection(db, 'users', user.uid, 'images');
                // Limit to 5000 to cover more history while keeping it relatively performant
                const q = query(imagesRef, orderBy('createdAt', 'desc'), limit(5000));
                const snapshot = await getDocs(q);

                const idMap = new Map<string, string>();
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const sid = data.promptSetID || data.settings?.promptSetID;
                    if (sid && !idMap.has(sid)) {
                        idMap.set(sid, data.imageUrl);
                    }
                });

                const suggestions = Array.from(idMap.entries()).map(([id, thumbUrl]) => ({
                    id,
                    thumbUrl
                }));

                setExistingPromptSetIDs(suggestions);
            } catch (err) {
                console.error('Error fetching promptSetID suggestions:', err);
            } finally {
                setIsLoadingSuggestions(false);
            }
        };

        fetchExistingIDs();
    }, [isEditingPromptSetID, user]);

    useEffect(() => {
        setEditingPromptSetID(image.promptSetID || '');
        setEditingPromptSetName(image.promptSetName || '');
        setEditingAttributionName(image.attributionName || '');
        setEditingAttributionUrl(image.attributionUrl || '');
        setEditingOriginatorName(image.originatorName || '');
        setEditingOriginatorUrl(image.originatorUrl || '');
        setNewImageTag('');
    }, [image.id, image.promptSetID, image.promptSetName, image.attributionName, image.attributionUrl, image.originatorName, image.originatorUrl]);

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

    const updatePromptSetName = async () => {
        if (!user) return;

        setIsSavingPromptSetName(true);
        try {
            const cleanName = editingPromptSetName.trim();
            const imageRef = doc(db, 'users', user.uid, 'images', image.id);

            await updateDoc(imageRef, {
                promptSetName: cleanName || deleteField()
            });

            onUpdate({ ...image, promptSetName: cleanName || undefined });
            setIsEditingPromptSetName(false);
            showToast('Prompt Set Name updated', 'success');
        } catch (error) {
            console.error('Error updating promptSetName:', error);
            showToast('Failed to update Prompt Set Name', 'error');
        } finally {
            setIsSavingPromptSetName(false);
        }
    };

    const updateAttribution = async () => {
        if (!user) return;

        setIsSavingAttribution(true);
        try {
            const cleanName = editingAttributionName.trim();
            const cleanUrl = editingAttributionUrl.trim();
            const imageRef = doc(db, 'users', user.uid, 'images', image.id);

            await updateDoc(imageRef, {
                attributionName: cleanName || deleteField(),
                attributionUrl: cleanUrl || deleteField()
            });

            // Sync to community if published
            if (image.publishedToCommunity && image.communityEntryId) {
                const communityRef = doc(db, 'leagueEntries', image.communityEntryId);
                await updateDoc(communityRef, {
                    attributionName: cleanName || null,
                    attributionUrl: cleanUrl || null
                }).catch(err => console.error('[ImageDetails] Failed to sync attribution to community:', err));
            }

            onUpdate({
                ...image,
                attributionName: cleanName || undefined,
                attributionUrl: cleanUrl || undefined
            });
            setIsEditingAttribution(false);
            showToast('Attribution updated', 'success');
        } catch (error) {
            console.error('Error updating attribution:', error);
            showToast('Failed to update attribution', 'error');
        } finally {
            setIsSavingAttribution(false);
        }
    };

    const updateOriginator = async () => {
        if (!user) return;

        setIsSavingOriginator(true);
        try {
            const cleanName = editingOriginatorName.trim();
            const cleanUrl = editingOriginatorUrl.trim();
            const imageRef = doc(db, 'users', user.uid, 'images', image.id);

            await updateDoc(imageRef, {
                originatorName: cleanName || deleteField(),
                originatorUrl: cleanUrl || deleteField()
            });

            // Sync to community if published
            if (image.publishedToCommunity && image.communityEntryId) {
                const communityRef = doc(db, 'leagueEntries', image.communityEntryId);
                await updateDoc(communityRef, {
                    originatorName: cleanName || null,
                    originatorUrl: cleanUrl || null
                }).catch(err => console.error('[ImageDetails] Failed to sync originator to community:', err));
            }

            onUpdate({
                ...image,
                originatorName: cleanName || undefined,
                originatorUrl: cleanUrl || undefined
            });
            setIsEditingOriginator(false);
            showToast('Originator updated', 'success');
        } catch (error) {
            console.error('Error updating originator:', error);
            showToast('Failed to update originator', 'error');
        } finally {
            setIsSavingOriginator(false);
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

    const toggleCommunity = async () => {
        if (!user) return;
        if (image.publishedToCommunity) {
            setShowUnpublishConfirm(true);
        } else {
            performCommunityToggle('publish');
        }
    };

    const performCommunityToggle = async (action: 'publish' | 'unpublish') => {
        if (!user) return;
        setPublishingId(image.id);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/community/publish/', {
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
                publishedToCommunity: action === 'publish',
                communityEntryId: action === 'publish' ? data.communityEntryId : undefined,
            });

            showToast(
                action === 'publish' ? '🏆 Published to Community Hub!' : 'Removed from Community Hub',
                'success'
            );
        } catch (error: any) {
            console.error('[Gallery] Community toggle error:', error);
            showToast(error.message || 'Failed to update community status', 'error');
        } finally {
            setPublishingId(null);
            setShowUnpublishConfirm(false);
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

    const createCollection = async (name: string) => {
        if (!user || !name.trim()) return;
        return createCollectionMutation.mutateAsync(name, {
            onSuccess: (data) => {
                showToast(`Collection "${data.name}" created`, 'success');
            },
            onError: (error) => {
                console.error('Error creating collection:', error);
                showToast('Failed to create collection', 'error');
            }
        });
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

    const toggleExemplar = async () => {
        if (!user || !isAdmin) return;

        const newValue = !image.isExemplar;
        try {
            let updatedImage = { ...image, isExemplar: newValue };
            let newlyPublished = false;

            // Auto-publish if making it an exemplar and it's not already published
            if (newValue && !image.publishedToCommunity) {
                const token = await user.getIdToken();
                const res = await fetch('/api/community/publish/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ imageId: image.id, action: 'publish' }),
                });
                const data = await res.json();

                if (res.ok && data.communityEntryId) {
                    updatedImage.publishedToCommunity = true;
                    updatedImage.communityEntryId = data.communityEntryId;
                    newlyPublished = true;
                } else {
                    console.error('[ImageDetails] Auto-publish for exemplar failed:', data.error);
                }
            }

            const imageRef = doc(db, 'users', image.userId || user.uid, 'images', image.id);
            await updateDoc(imageRef, {
                isExemplar: newValue
            });

            // Sync to community if published (either previously or newly auto-published)
            if (updatedImage.publishedToCommunity && updatedImage.communityEntryId) {
                const communityRef = doc(db, 'leagueEntries', updatedImage.communityEntryId);
                await updateDoc(communityRef, {
                    isExemplar: newValue
                }).catch(err => console.error('[ImageDetails] Failed to sync Exemplar to community:', err));
            }

            onUpdate(updatedImage);
            showToast(newValue ? (newlyPublished ? '🏅 Published & Marked as Exemplar' : '🏅 Marked as Exemplar') : 'Exemplar status removed', 'success');
        } catch (error) {
            console.error('Failed to toggle Exemplar:', error);
            showToast('Failed to update Exemplar status', 'error');
        }
    };

    return {
        // State
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
        isEditingAttribution,
        setIsEditingAttribution,
        editingAttributionName,
        setEditingAttributionName,
        editingAttributionUrl,
        setEditingAttributionUrl,
        isSavingAttribution,
        isEditingOriginator,
        setIsEditingOriginator,
        editingOriginatorName,
        setEditingOriginatorName,
        editingOriginatorUrl,
        setEditingOriginatorUrl,
        isSavingOriginator,
        existingPromptSetIDs,
        isLoadingSuggestions,
        newImageTag,
        setNewImageTag,
        isUpdatingTags,
        publishingId,
        showUnpublishConfirm,
        setShowUnpublishConfirm,
        isAdmin,

        // Actions
        updatePromptSetID,
        updatePromptSetName,
        updateAttribution,
        updateOriginator,
        addTag,
        removeTag,
        toggleCommunity,
        confirmUnpublish: () => performCommunityToggle('unpublish'),
        toggleCollection,
        createCollection,
        downloadImage,
        toggleExemplar
    };
}
