// Credit Management Service
import { doc, getDoc, setDoc, collection, addDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import {
    UserCredits,
    CreditTransaction,
    TransactionType,
    CREDIT_COSTS,
    getGenerationCost,
    ImageQuality,
    SubscriptionTier
} from '../types';

export class CreditsService {
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    // Get current credits
    async getCredits(): Promise<UserCredits | null> {
        const creditsRef = doc(db, 'users', this.userId, 'data', 'credits');
        const snap = await getDoc(creditsRef);
        return snap.exists() ? (snap.data() as UserCredits) : null;
    }

    // Get available credits (pure balance in new model)
    async getAvailableCredits(): Promise<number> {
        const credits = await this.getCredits();
        if (!credits) return 0;

        return credits.balance;
    }

    // Check if user can afford generation (including overdraft buffer if authorized)
    async canAfford(quality: ImageQuality, modelType: 'standard' | 'pro' = 'standard'): Promise<boolean> {
        const cost = getGenerationCost('image', quality, modelType);
        const credits = await this.getCredits();
        if (!credits) return false;

        const available = await this.getAvailableCredits();

        // Check if pure balance/allowance covers it
        if (available >= cost) return true;

        // Check if Oxygen Tank can cover the gap
        const canUseOxygen = credits.isOxygenAuthorized && !credits.isOxygenDeployed;
        const overdraftRemaining = credits.maxOverdraft || 3;

        return canUseOxygen && (available + overdraftRemaining >= cost);
    }

    /**
     * Compute available credits from a UserCredits snapshot (no extra Firestore reads).
     * Used inside transactions to avoid the double-read anti-pattern.
     */
    private static computeAvailable(credits: UserCredits): number {
        return credits.balance;
    }

    // Deduct credits with Oxygen Tank support
    async deductCredits(
        quality: ImageQuality,
        description: string,
        modelType: 'standard' | 'pro' = 'standard'
    ): Promise<{ success: boolean; newBalance: number; error?: string; isOxygenActive?: boolean }> {
        const cost = getGenerationCost('image', quality, modelType);
        const creditsRef = doc(db, 'users', this.userId, 'data', 'credits');

        try {
            return await runTransaction(db, async (transaction) => {
                const creditsDoc = await transaction.get(creditsRef);

                if (!creditsDoc.exists()) {
                    throw new Error('Credits not found');
                }

                const credits = creditsDoc.data() as UserCredits;
                // PERF FIX: compute from the transaction snapshot — no extra getDoc round-trip
                const available = CreditsService.computeAvailable(credits);

                let isOxygenActive = false;

                // 1. Check if user can afford it
                if (available < cost) {
                    // Check Oxygen Tank
                    const canUseOxygen = credits.isOxygenAuthorized && !credits.isOxygenDeployed;
                    const overdraftThreshold = credits.maxOverdraft || 3;

                    if (canUseOxygen && (available + overdraftThreshold >= cost)) {
                        isOxygenActive = true;
                    } else {
                        throw new Error(`Insufficient credits. Need ${cost}, have ${available}`);
                    }
                }

                // 2. Perform Deduction (Sub-zero Ledger)
                const balanceDeduction = cost;

                const newCredits: UserCredits = {
                    ...credits,
                    balance: credits.balance - balanceDeduction,
                    totalUsed: credits.totalUsed + cost,
                    isOxygenDeployed: isOxygenActive ? true : (credits.isOxygenDeployed || false)
                };

                transaction.set(creditsRef, newCredits);

                // 3. Record Transaction
                const txRef = doc(collection(db, 'users', this.userId, 'creditHistory'));
                const txRecord: Omit<CreditTransaction, 'id'> = {
                    type: 'usage',
                    amount: -cost,
                    description,
                    metadata: {
                        quality,
                        balanceDeduction,
                        isOxygenActive
                    },
                    createdAt: Timestamp.now(),
                };
                transaction.set(txRef, { ...txRecord, id: txRef.id });

                return {
                    success: true,
                    newBalance: newCredits.balance,
                    isOxygenActive
                };
            });
        } catch (error: any) {
            return { success: false, newBalance: 0, error: error.message };
        }
    }

    // Add credits with Debt Recovery logic
    async addCredits(
        amount: number,
        type: TransactionType,
        description: string,
        metadata?: Record<string, any>
    ): Promise<{ success: boolean; newBalance: number }> {
        const creditsRef = doc(db, 'users', this.userId, 'data', 'credits');

        return await runTransaction(db, async (transaction) => {
            const creditsDoc = await transaction.get(creditsRef);

            if (!creditsDoc.exists()) {
                throw new Error('Credits not found');
            }

            const credits = creditsDoc.data() as UserCredits;

            // Debt Recovery Calculation
            let recoveryAmount = 0;
            if (credits.balance < 0) {
                recoveryAmount = Math.min(Math.abs(credits.balance), amount);
            }

            const newBalance = credits.balance + amount;
            const actualAdded = amount - recoveryAmount;

            transaction.update(creditsRef, {
                balance: newBalance,
                totalPurchased: credits.totalPurchased + amount,
                lastPurchaseAt: Timestamp.now(),
                isOxygenDeployed: false, // Refill resets the oxygen tank
            });

            // Add Transaction Record
            const txRef = doc(collection(db, 'users', this.userId, 'creditHistory'));
            const txRecord: Omit<CreditTransaction, 'id'> = {
                type,
                amount,
                description,
                metadata: {
                    ...metadata,
                    recoveryAmount,
                    actualAdded,
                    wasDebtCleared: recoveryAmount > 0
                },
                createdAt: Timestamp.now(),
            };
            transaction.set(txRef, { ...txRecord, id: txRef.id });

            // If debt was cleared, add a specific recovery record for clarity in UI/Admin
            if (recoveryAmount > 0) {
                const recoveryTxRef = doc(collection(db, 'users', this.userId, 'creditHistory'));
                const recoveryTx: Omit<CreditTransaction, 'id'> = {
                    type: 'overdraft_recovery',
                    amount: -recoveryAmount,
                    description: `Overdraft Recovery from purchase: ${description}`,
                    metadata: { originalPurchaseId: txRef.id },
                    createdAt: Timestamp.now(),
                };
                transaction.set(recoveryTxRef, { ...recoveryTx, id: recoveryTxRef.id });
            }

            return { success: true, newBalance };
        });
    }

    // Oxygen Tank Management
    async setOxygenAuthorization(authorized: boolean): Promise<void> {
        const creditsRef = doc(db, 'users', this.userId, 'data', 'credits');
        await setDoc(creditsRef, {
            isOxygenAuthorized: authorized,
        }, { merge: true });
    }

    // Removed daily allowance update as it's no longer used
    async updateSubscription(newTier: SubscriptionTier): Promise<void> {
        // No-op or update any other subscription-specific metadata if needed
    }
}
