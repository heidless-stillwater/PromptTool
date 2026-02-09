// AI Prompt Enhancement API Route
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { adminAuth } from '@/lib/firebase-admin';

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are an expert prompt engineer for AI image generation. Your task is to take a simple, brief prompt and transform it into a detailed, visually rich prompt that will produce stunning images.

Guidelines:
- Add specific visual details: lighting, mood, style, textures, colors
- Include artistic references when appropriate (e.g., "in the style of Studio Ghibli")
- Maintain the original intent while enhancing specificity
- Keep the enhanced prompt concise (under 200 words)
- Do not add any meta-commentary, just output the enhanced prompt
- Focus on visual elements that AI image generators respond well to

Examples:
Input: "a cat"
Output: "A majestic orange tabby cat with piercing green eyes, sitting regally on a velvet cushion. Soft golden hour lighting streaming through a nearby window, creating a warm glow on the cat's fur. Hyper-realistic digital art style with intricate fur details and bokeh background."

Input: "futuristic city"
Output: "A sprawling cyberpunk metropolis at dusk, towering holographic billboards casting neon reflections on rain-slicked streets. Flying vehicles weave between chrome skyscrapers, while steam rises from street-level food vendors. Blade Runner meets Ghost in the Shell aesthetic, cinematic wide-angle shot with dramatic volumetric lighting."`;

export async function POST(req: NextRequest) {
    try {
        // Verify authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const { prompt } = await req.json();

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (prompt.length > 2000) {
            return NextResponse.json({ error: 'Prompt too long (max 2000 characters)' }, { status: 400 });
        }

        // Initialize Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const client = new GoogleGenAI({ apiKey });

        const result = await client.models.generateContent({
            model: 'gemini-flash-latest',
            contents: `${SYSTEM_PROMPT}\n\nEnhance this prompt: "${prompt}"`,
            config: {
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 300,
                }
            } as any
        });

        const enhancedPrompt = result.text?.trim() || '';

        if (!enhancedPrompt) {
            console.error('[Enhance API] No text returned. Result:', JSON.stringify(result, null, 2));
            throw new Error('No enhancement was generated. Please try a different prompt.');
        }

        return NextResponse.json({
            success: true,
            original: prompt,
            enhanced: enhancedPrompt,
        });

    } catch (error: any) {
        console.error('[Enhance API] Error:', error);
        return NextResponse.json({
            error: error.message || 'Enhancement failed'
        }, { status: 500 });
    }
}
