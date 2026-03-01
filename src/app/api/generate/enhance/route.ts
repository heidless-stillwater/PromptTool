import { NextResponse } from 'next/server';
import { getAIPromptService } from '@/lib/services/ai-prompt';
import { enhancePromptSchema } from '@/lib/validations/generation';
import { withApiHandler } from '@/lib/api-handler';
import { rateLimit } from '@/lib/rate-limiter';

export const maxDuration = 30;

export const POST = withApiHandler({
    schema: enhancePromptSchema,
    requireAuth: true,
    handler: async (req, { body, userId }) => {
        // 1. Rate Limiting (5 requests per minute)
        const { success, remaining } = await rateLimit(userId!, {
            limit: 5,
            window: 60 * 1000,
            keyPrefix: 'enhance'
        });

        if (!success) {
            return NextResponse.json({
                success: false,
                error: 'Too many requests. Please wait a minute.',
                remaining: 0
            }, { status: 429 });
        }

        const { prompt, style, mood } = body;

        // 2. Enhance Prompt via Service
        const aiService = getAIPromptService();
        const enhancedPrompt = await aiService.enhancePrompt(prompt, style, mood);

        return NextResponse.json({
            success: true,
            original: prompt,
            enhanced: enhancedPrompt,
            remaining
        });
    }
});
