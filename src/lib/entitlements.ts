import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export type AppSuiteType = 'resources' | 'studio' | 'prompttool' | 'registry';

/**
 * ENTITLEMENT HELPER (PromptTool Version)
 * Checks access against the global Identity Store (database: '(default)').
 * Supports both 'studio' and 'prompttool' as equivalent keys for PromptTool access.
 */
export async function checkAppAccess(uid: string, app: AppSuiteType): Promise<boolean> {
    try {
        const apps = getApps();
        const firebaseApp = apps.length > 0 ? apps[0] : null;

        if (!firebaseApp) {
            console.error('Firebase app not initialized in checkAppAccess');
            return false;
        }

        // Target the (default) database where PromptResources stores identity/subscription data
        const identityDb = getFirestore(firebaseApp, '(default)');
        const userDoc = await identityDb.collection('users').doc(uid).get();

        if (!userDoc.exists) return false;
        const data = userDoc.data();

        // 1. Admins always have access
        if (data?.role === 'admin' || data?.role === 'su') return true;

        // 2. Read activeSuites from any of the three possible Firestore fields:
        //    - suiteSubscription  (new unified field, written by PromptResources Stripe webhook)
        //    - subscriptionMetadata (legacy field used in earlier integration)
        //    - subscription (fallback object, may have activeSuites)
        const subscriptionObj =
            data?.suiteSubscription ||
            data?.subscriptionMetadata ||
            (typeof data?.subscription === 'object' ? data?.subscription : null);

        const activeSuites: string[] = subscriptionObj?.activeSuites || [];

        // Direct match
        if (activeSuites.includes(app)) return true;

        // 3. studio ↔ prompttool are interchangeable for PromptTool access
        if (app === 'studio' && activeSuites.includes('prompttool')) return true;
        if (app === 'prompttool' && activeSuites.includes('studio')) return true;

        // 4. Legacy SubscriptionTier fallback
        const tier = typeof data?.subscription === 'string' ? data.subscription : null;
        if ((app === 'studio' || app === 'prompttool') &&
            (tier === 'pro' || tier === 'standard')) {
            return true;
        }

        return false;
    } catch (error) {
        console.error(`Entitlement check failed for ${uid} on app ${app}:`, error);
        return false;
    }
}
