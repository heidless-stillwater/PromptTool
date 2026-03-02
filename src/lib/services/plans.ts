import { adminDb } from '../firebase-admin';
import { SUBSCRIPTION_PLANS, SubscriptionPlan, SubscriptionTier, ResourceQuotas } from '../types';

/**
 * Source of truth for plans. 
 * First checks Firestore for dynamic config, falls back to code constants.
 */
export async function getDynamicPlans(): Promise<Record<SubscriptionTier, SubscriptionPlan>> {
    try {
        const doc = await adminDb.collection('system').doc('plans_config').get();
        if (doc.exists) {
            return doc.data() as Record<SubscriptionTier, SubscriptionPlan>;
        }
    } catch (e) {
        console.error('[Plans Service] Error fetching dynamic plans:', e);
    }

    // Fallback to hardcoded constants
    return SUBSCRIPTION_PLANS;
}

/**
 * Updates the global plans configuration in Firestore.
 */
export async function updateDynamicPlans(plans: Record<SubscriptionTier, SubscriptionPlan>): Promise<void> {
    await adminDb.collection('system').doc('plans_config').set(plans);
    console.log('[Plans Service] Dynamic plans updated in Firestore.');
}

/**
 * Seeds Firestore with the current hardcoded plans.
 * Useful for initial setup or emergency resets.
 */
export async function syncPlansToFirestore(): Promise<void> {
    await updateDynamicPlans(SUBSCRIPTION_PLANS);
}

/**
 * Helper to get the resource quotas for a given subscription tier.
 */
export async function getQuotasForTier(tier: SubscriptionTier): Promise<ResourceQuotas> {
    const plans = await getDynamicPlans();
    return plans[tier]?.resourceQuotas || plans.free.resourceQuotas;
}
