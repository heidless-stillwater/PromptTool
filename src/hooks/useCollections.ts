'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, useCollectionsQuery } from './queries/useQueryHooks';
import { useToast } from '@/components/Toast';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    orderBy,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { Collection } from '@/lib/types';

export function useCollections() {
    const { user, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Use TanStack Query as the source of truth
    const {
        data: collections = [],
        isLoading: queryLoading,
        refetch: refresh
    } = useCollectionsQuery(user?.uid);

    const [isCreating, setIsCreating] = useState(false);

    const invalidateQuery = useCallback(() => {
        if (user) {
            queryClient.invalidateQueries({ queryKey: queryKeys.collections.all(user.uid) });
        }
    }, [user, queryClient]);

    const handleCreate = async (name: string, privacy: 'public' | 'private' = 'private') => {
        if (name.length > 50) {
            showToast('Collection name is too long (max 50 chars)', 'error');
            return;
        }

        // Hard Cap: Check collection limit (from query data)
        const tier = (user as any)?.subscription || 'free';
        const { SUBSCRIPTION_PLANS } = await import('@/lib/types');
        const plan = (SUBSCRIPTION_PLANS as any)[tier] || SUBSCRIPTION_PLANS.free;
        const maxCollections = plan.resourceQuotas.maxCollections;

        if (maxCollections !== -1 && collections.length >= maxCollections) {
            showToast(`Collection limit reached (${maxCollections}). Upgrade for more!`, 'error');
            return;
        }

        if (!user) return; // Final safety check for TS

        setIsCreating(true);
        try {
            const newCollection = {
                userId: user.uid,
                name: name.trim(),
                imageCount: 0,
                privacy: privacy,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'users', user.uid, 'collections'), newCollection);

            const created: Collection = {
                id: docRef.id,
                ...newCollection,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any;

            // Optimistically update the query data if we wanted, but simple invalidation is safer here
            invalidateQuery();
            showToast('Collection created', 'success');
            return created;
        } catch (error) {
            console.error('Failed to create collection:', error);
            showToast('Failed to create collection', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'collections', id));
            invalidateQuery();
            showToast('Collection deleted', 'success');
        } catch (error) {
            console.error('Failed to delete collection:', error);
            showToast('Failed to delete collection', 'error');
        }
    };

    const handleRename = async (id: string, newName: string) => {
        if (!user || !newName.trim()) return;

        if (newName.length > 50) {
            showToast('Name too long', 'error');
            return;
        }

        try {
            const docRef = doc(db, 'users', user.uid, 'collections', id);
            await updateDoc(docRef, {
                name: newName.trim(),
                updatedAt: serverTimestamp()
            });

            invalidateQuery();
            showToast('Collection renamed', 'success');
        } catch (error) {
            console.error('Failed to rename collection:', error);
            showToast('Failed to rename collection', 'error');
        }
    };

    const handleTogglePrivacy = async (id: string, currentPrivacy: 'public' | 'private') => {
        if (!user) return;
        const newPrivacy = currentPrivacy === 'public' ? 'private' : 'public';
        try {
            const docRef = doc(db, 'users', user.uid, 'collections', id);
            await updateDoc(docRef, {
                privacy: newPrivacy,
                updatedAt: serverTimestamp()
            });

            invalidateQuery();
            showToast(`Collection is now ${newPrivacy}`, 'success');
        } catch (error) {
            console.error('Failed to update privacy:', error);
            showToast('Failed to update privacy', 'error');
        }
    };

    return {
        collections,
        isLoading: queryLoading || (authLoading && !user),
        isCreating,
        handleCreate,
        handleDelete,
        handleRename,
        handleTogglePrivacy,
        refresh
    };
}
