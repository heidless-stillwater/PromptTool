import { NextResponse } from 'next/server';
import { getAIPromptService } from '@/lib/services/ai-prompt';

export const maxDuration = 60; // Extra time for Gemini

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { subject, modifiers } = body;

        if (!subject || typeof subject !== 'string') {
            return NextResponse.json({ error: 'Core subject is required' }, { status: 400 });
        }

        const aiPromptService = getAIPromptService();
        const compiledPrompt = await aiPromptService.compileNanobananaPrompt(subject, modifiers || []);

        return NextResponse.json({ compiledPrompt });
    } catch (error: any) {
        console.error('[Nanobanana Compile API] Failed:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to compile nanobanana prompt' },
            { status: 500 }
        );
    }
}
