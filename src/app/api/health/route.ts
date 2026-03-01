import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAIPromptService } from '@/lib/services/ai-prompt';

export const dynamic = 'force-dynamic';

export async function GET() {
    const healthStatus: any = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            database: 'unknown',
            ai: 'unknown'
        }
    };

    try {
        // 1. Check Firestore
        const start = Date.now();
        await adminDb.collection('system').doc('health').get();
        healthStatus.services.database = `ok (${Date.now() - start}ms)`;
    } catch (error: any) {
        healthStatus.status = 'degraded';
        healthStatus.services.database = `error: ${error.message}`;
    }

    try {
        // 2. Check AI Service (Sanity check)
        const aiService = getAIPromptService();
        if (aiService) {
            healthStatus.services.ai = 'ok';
        } else {
            throw new Error('AI Service not initialized');
        }
    } catch (error: any) {
        healthStatus.status = 'degraded';
        healthStatus.services.ai = `error: ${error.message}`;
    }

    const statusCode = healthStatus.status === 'ok' ? 200 : 503;
    return NextResponse.json(healthStatus, { status: statusCode });
}
