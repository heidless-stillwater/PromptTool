import { adminDb } from '../firebase-admin';
import { CreditSystemConfig, CreditPack } from '../types';

const CONFIG_DOC_PATH = 'system/credit_config';

/**
 * Service for managing global credit system configuration (SU/Admin only).
 */
export class CreditConfigService {
    /**
     * Get the current global credit configuration.
     * Falls back to a default configuration if none exists.
     */
    static async getConfig(): Promise<CreditSystemConfig> {
        try {
            const doc = await adminDb.doc(CONFIG_DOC_PATH).get();
            if (doc.exists) {
                return doc.data() as CreditSystemConfig;
            }
        } catch (e) {
            console.error('[CreditConfigService] Error fetching config:', e);
        }

        // Default Configuration
        return {
            packs: [
                {
                    id: 'starter_100',
                    name: 'Starter Pack',
                    credits: 100,
                    priceCents: 1000,
                },
                {
                    id: 'pro_300',
                    name: 'Pro Pack',
                    credits: 300,
                    priceCents: 2500,
                    isMostPopular: true,
                },
                {
                    id: 'value_750',
                    name: 'Value Pack',
                    credits: 750,
                    priceCents: 5000,
                }
            ],
            defaultOverdraftLimit: 3,
            overdraftGraceThreshold: -10,
            refillOptions: [50, 100, 300, 500],
            // Phase 5 Defaults
            autoRefillGlobalEnabled: true,
            minRefillAmount: 50,
            highlightOverdraftInvoices: true,
            systemMaxOverdraft: 20
        };
    }

    /**
     * Updates the global credit configuration.
     */
    static async updateConfig(config: Partial<CreditSystemConfig>): Promise<void> {
        await adminDb.doc(CONFIG_DOC_PATH).set(config, { merge: true });
        console.log('[CreditConfigService] Config updated.');
    }

    /**
     * Update or add a specific credit pack.
     */
    static async savePack(pack: CreditPack): Promise<void> {
        const config = await this.getConfig();
        const existingIndex = config.packs.findIndex(p => p.id === pack.id);

        if (existingIndex >= 0) {
            config.packs[existingIndex] = pack;
        } else {
            config.packs.push(pack);
        }

        await this.updateConfig({ packs: config.packs });
    }

    /**
     * remove a specific credit pack.
     */
    static async deletePack(packId: string): Promise<void> {
        const config = await this.getConfig();
        const newPacks = config.packs.filter(p => p.id !== packId);
        await this.updateConfig({ packs: newPacks });
    }
}
