import { accreditationDb } from '../firebase-admin';

/**
 * Sovereign Compliance Sentinel (PromptTool)
 * Monitors the clinical audit status of the suite to enforce real-time gating.
 */
export class ComplianceService {
    /**
     * Verifies if the suite is in a 'Sovereign Gated' state.
     * Checks critical policies (Online Safety Act) for technical enforcement drifts.
     */
    static async verifySovereignGate(): Promise<{ gated: boolean; message?: string }> {
        try {
            // 1. Fetch Online Safety Act Registry
            const osaRef = accreditationDb.collection('policies').where('slug', '==', 'online-safety-act').limit(1);
            const osaSnap = await osaRef.get();

            if (osaSnap.empty) {
                console.warn('[ComplianceService] Sovereign Registry Missing: Online Safety Act not found.');
                return { gated: false }; // Fail-open (or closed based on user preference, choosing open for now)
            }

            const osaData = osaSnap.docs[0].data();
            const status = osaData.status;

            // 2. Verification Logic:
            // If the policy is RED, enforcement is ACTIVE.
            if (status === 'red') {
                return { 
                    gated: true, 
                    message: 'Access Restricted: The Stillwater Sovereign Hub has detected a critical legislative drift (Online Safety Act). Remediate at the Accreditation Hub to restore access.' 
                };
            }

            // 3. Drill-down: Check if AV Gateway (Step 3) is recorded as technical green
            const checks = osaData.checks || [];
            const avCheck = checks.find((c: any) => c.id === 'probe-av-gateway' || c.id === 'osa-step-3');
            
            if (avCheck && avCheck.status === 'red') {
                return { 
                    gated: true, 
                    message: 'Infrastructural Lock: The Age Verification Gateway is failing verification. AI generation is gated until technical integrity is restored.' 
                };
            }

            return { gated: false };

        } catch (error: any) {
            console.error('[ComplianceService] Sovereign Probe Failure:', error.message);
            // In case of system failure, we fail-open but log the event.
            return { gated: false };
        }
    }
}
