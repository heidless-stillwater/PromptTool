'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface PrototypeFlags {
    [key: string]: boolean;
}

/**
 * Hook to read and toggle prototype feature flags from Firestore.
 * Flags live in system/prototypes document.
 */
export function usePrototypeFlags() {
    const [flags, setFlags] = useState<PrototypeFlags>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFlags = async () => {
            try {
                const snap = await getDoc(doc(db, 'system', 'prototypes'));
                if (snap.exists()) {
                    setFlags(snap.data() as PrototypeFlags);
                }
            } catch (e) {
                console.warn('[Prototypes] Failed to fetch flags:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchFlags();
    }, []);

    const toggleFlag = async (slug: string) => {
        const newValue = !flags[slug];
        const updated = { ...flags, [slug]: newValue };
        setFlags(updated); // Optimistic

        try {
            await setDoc(doc(db, 'system', 'prototypes'), updated, { merge: true });
        } catch (e) {
            console.error('[Prototypes] Failed to toggle flag:', e);
            setFlags(flags); // Rollback
        }
    };

    const isActive = (slug: string) => flags[slug] === true;

    return { flags, loading, toggleFlag, isActive };
}
