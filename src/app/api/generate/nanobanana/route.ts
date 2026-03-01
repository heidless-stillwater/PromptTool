import { NextResponse } from 'next/server';
import { getAIPromptService } from '@/lib/services/ai-prompt';
import { withApiHandler } from '@/lib/api-handler';
import { rateLimit } from '@/lib/rate-limiter';

import { nanobananaSchema } from '@/lib/validations/generation';

export const maxDuration = 60; // Extra time for Gemini

export const POST = withApiHandler({
    schema: nanobananaSchema,
    requireAuth: true,
    handler: async (req, { body, userId }) => {
        const { subject, modifiers, aspectRatio, proSettings } = body;

        if (!subject || typeof subject !== 'string') {
            return NextResponse.json({ success: false, error: 'Core subject is required' }, { status: 400 });
        }

        // Rate Limiting (10 requests per minute for compilation)
        const { success, remaining } = await rateLimit(userId!, {
            limit: 10,
            window: 60 * 1000,
            keyPrefix: 'compile'
        });

        if (!success) {
            return NextResponse.json({
                success: false,
                error: 'Too many requests. Please wait a minute.',
                remaining: 0
            }, { status: 429 });
        }

        const aiPromptService = getAIPromptService();
        const compiledPrompt = await aiPromptService.compileNanobananaPrompt(subject, modifiers || [], aspectRatio, proSettings);

        return NextResponse.json({
            success: true,
            compiledPrompt,
            remaining
        });
    }
});
