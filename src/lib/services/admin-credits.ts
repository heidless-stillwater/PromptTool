import { adminDb } from '../firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { TransactionType } from '../types';

export class AdminCreditsService {
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    async addCredits(
        amount: number,
        type: TransactionType,
        description: string,
        metadata?: Record<string, any>
    ): Promise<{ success: boolean; newBalance: number }> {
        const creditsRef = adminDb.collection('users').doc(this.userId).collection('data').doc('credits');

        let finalBalance = amount;

        await adminDb.runTransaction(async (transaction) => {
            const creditsDoc = await transaction.get(creditsRef);
            let currentBalance = 0;
            let currentTotalPurchased = 0;

            if (creditsDoc.exists) {
                const data = creditsDoc.data() as any;
                currentBalance = data.balance || 0;
                currentTotalPurchased = data.totalPurchased || 0;
            }

            // Debt Recovery Calculation
            let recoveryAmount = 0;
            if (currentBalance < 0) {
                recoveryAmount = Math.min(Math.abs(currentBalance), amount);
            }

            const newBalance = currentBalance + amount;
            finalBalance = newBalance;
            const actualAdded = amount - recoveryAmount;

            transaction.set(creditsRef, {
                balance: newBalance,
                totalPurchased: currentTotalPurchased + amount,
                lastPurchaseAt: Timestamp.now(),
                isOxygenDeployed: false, // Refill resets the oxygen tank
            }, { merge: true });

            // Add Transaction Record
            const historyRef = adminDb.collection('users').doc(this.userId).collection('creditHistory').doc();
            transaction.set(historyRef, {
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
            });

            // If debt was cleared, add a specific recovery record for clarity
            if (recoveryAmount > 0) {
                const recoveryRef = adminDb.collection('users').doc(this.userId).collection('creditHistory').doc();
                transaction.set(recoveryRef, {
                    type: 'overdraft_recovery',
                    amount: -recoveryAmount,
                    description: `Overdraft Recovery from: ${description}`,
                    metadata: { originalPurchaseId: historyRef.id },
                    createdAt: Timestamp.now(),
                });
            }
        });

        return { success: true, newBalance: finalBalance };
    }
}
