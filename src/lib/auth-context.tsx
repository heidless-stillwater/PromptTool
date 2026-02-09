'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    User,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole, SubscriptionTier, AudienceMode, ADMIN_EMAILS, UserCredits, DAILY_ALLOWANCE } from './types';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    credits: UserCredits | null;
    loading: boolean;
    error: string | null;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    refreshCredits: () => Promise<void>;
    switchRole: (role: UserRole) => Promise<void>;
    setAudienceMode: (mode: AudienceMode) => Promise<void>;
    effectiveRole: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [credits, setCredits] = useState<UserCredits | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Determine effective role (considering role-switching)
    const effectiveRole: UserRole = profile?.actingAs || profile?.role || 'member';

    // Create or update user profile
    const createOrUpdateProfile = async (firebaseUser: User): Promise<UserProfile> => {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const existingProfile = userSnap.data() as UserProfile;
            // Update last login and any changed fields
            const updatedProfile: UserProfile = {
                ...existingProfile,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                subscription: existingProfile.subscription || 'free',
                audienceMode: existingProfile.audienceMode || 'casual',
                updatedAt: Timestamp.now(),
            };
            await setDoc(userRef, updatedProfile, { merge: true });
            return updatedProfile;
        }

        // New user - determine initial role
        const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email || '');
        const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: isAdmin ? 'admin' : 'member',
            subscription: 'free',
            audienceMode: 'casual',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await setDoc(userRef, newProfile);
        return newProfile;
    };

    // Create or reset user credits
    const createOrUpdateCredits = async (userId: string, subscription: SubscriptionTier): Promise<UserCredits> => {
        const creditsRef = doc(db, 'users', userId, 'data', 'credits');
        const creditsSnap = await getDoc(creditsRef);
        const now = Timestamp.now();

        if (creditsSnap.exists()) {
            const existingCredits = creditsSnap.data() as UserCredits;

            // Check if daily reset is needed
            const lastReset = existingCredits.lastDailyReset.toDate();
            const today = new Date();
            const isNewDay = lastReset.toDateString() !== today.toDateString();

            if (isNewDay) {
                const updatedCredits: UserCredits = {
                    ...existingCredits,
                    dailyAllowanceUsed: 0,
                    dailyAllowance: DAILY_ALLOWANCE[subscription],
                    lastDailyReset: now,
                };
                await setDoc(creditsRef, updatedCredits);
                return updatedCredits;
            }

            return existingCredits;
        }

        // New user credits
        const newCredits: UserCredits = {
            balance: 0,
            dailyAllowance: DAILY_ALLOWANCE[subscription],
            dailyAllowanceUsed: 0,
            lastDailyReset: now,
            expiresAt: null,
            totalPurchased: 0,
            totalUsed: 0,
        };

        await setDoc(creditsRef, newCredits);
        return newCredits;
    };

    // Manual refresh is now mostly redundant due to onSnapshot, but keeping for compatibility
    const refreshProfile = useCallback(async () => {
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            setProfile(userSnap.data() as UserProfile);
        }
    }, [user]);

    const refreshCredits = useCallback(async () => {
        if (!user) return;
        const creditsRef = doc(db, 'users', user.uid, 'data', 'credits');
        const creditsSnap = await getDoc(creditsRef);
        if (creditsSnap.exists()) {
            setCredits(creditsSnap.data() as UserCredits);
        }
    }, [user]);

    // Sign in with Google
    const signInWithGoogle = async () => {
        try {
            setError(null);
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err: any) {
            setError(err.message);
            console.error('Sign in error:', err);
        }
    };

    // Sign out
    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setProfile(null);
            setCredits(null);
        } catch (err: any) {
            setError(err.message);
            console.error('Sign out error:', err);
        }
    };

    // Switch role for admin/su users
    const switchRole = async (role: UserRole) => {
        if (!user || !profile) return;
        if (profile.role !== 'admin' && profile.role !== 'su') {
            setError('Only admin or su users can switch roles');
            return;
        }

        const userRef = doc(db, 'users', user.uid);
        const update = role === profile.role ? { actingAs: null } : { actingAs: role };
        await setDoc(userRef, update, { merge: true });
        await refreshProfile();
    };

    // Set audience mode (casual or professional)
    const setAudienceMode = async (mode: AudienceMode) => {
        if (!user || !profile) return;

        // Optimistic update for instant UI feedback
        const previousMode = profile.audienceMode;
        setProfile({ ...profile, audienceMode: mode });

        try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { audienceMode: mode }, { merge: true });
        } catch (err: any) {
            console.error('[Auth] Failed to set audience mode:', err);
            setError(err.message);
            // Revert optimistic update on failure
            setProfile({ ...profile, audienceMode: previousMode });
        }
    };

    // Auth and Data Listeners
    useEffect(() => {
        let unsubscribeProfile: (() => void) | null = null;
        let unsubscribeCredits: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            try {
                if (firebaseUser) {
                    setUser(firebaseUser);
                    console.log('[Auth] User logged in:', firebaseUser.uid);

                    // Ensure profile and credits exist
                    const initialProfile = await createOrUpdateProfile(firebaseUser);
                    await createOrUpdateCredits(firebaseUser.uid, initialProfile.subscription);

                    // Set up real-time listeners
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    unsubscribeProfile = onSnapshot(userRef, (doc) => {
                        if (doc.exists()) {
                            const data = doc.data() as UserProfile;
                            setProfile(data);
                        }
                    });

                    const creditsRef = doc(db, 'users', firebaseUser.uid, 'data', 'credits');
                    unsubscribeCredits = onSnapshot(creditsRef, (doc) => {
                        if (doc.exists()) {
                            const data = doc.data() as UserCredits;
                            setCredits(data);
                        }
                    });

                } else {
                    setUser(null);
                    setProfile(null);
                    setCredits(null);
                    if (unsubscribeProfile) unsubscribeProfile();
                    if (unsubscribeCredits) unsubscribeCredits();
                }
            } catch (err: any) {
                setError(err.message);
                console.error('Auth state error:', err);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
            if (unsubscribeCredits) unsubscribeCredits();
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                credits,
                loading,
                error,
                signInWithGoogle,
                signOut,
                refreshProfile,
                refreshCredits,
                switchRole,
                setAudienceMode,
                effectiveRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
