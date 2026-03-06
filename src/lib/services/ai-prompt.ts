import { GoogleGenAI } from '@google/genai';

export class AIPromptService {
    private client: GoogleGenAI;

    constructor(apiKey: string) {
        this.client = new GoogleGenAI({ apiKey });
    }

    /**
     * Enhances a simple prompt into a detailed masterpiece for image generation.
     */
    async enhancePrompt(prompt: string, style?: string, mood?: string): Promise<string> {
        if (!prompt || prompt.trim().length === 0) {
            throw new Error("Prompt is required for enhancement");
        }

        try {
            const model = 'gemini-3.1-flash-lite-preview'; // Flash Lite 3.1 is available

            const systemInstruction = `
        You are a world-class prompt engineer for AI image generation (e.g., Midjourney, DALL-E, Stable Diffusion).
        Your goal is to take a simple, short user prompt and expand it into a detailed, descriptive, and visually stunning masterpiece.
        
        Guidelines for Literal Expansion:
        1. PERSERVE SUBJECT: The core subject must remain the singular focus.
        2. NO HALLUCINATION: You are forbidden from adding any artistic styles, moods, lighting, or technical settings (e.g., Photography, Oil Painting, Cinematic) that are NOT present in the input parameters.
        3. NO META-TALK: Do not use phrases like "rendered in", "the scene is", "captured in", or "evokes a". Skip all narrative connective tissue.
        4. MATERIAL ADJECTIVES ONLY: Use only physical, literal adjectives to describe the subject (e.g., "weathered", "metallic", "translucent") based on the prompt text.
        5. OUTPUT ONLY: Return only the descriptive string. No preamble.
      `;

            let userPrompt = `Original Prompt: "${prompt}"\n`;
            if (style) userPrompt += `Target Art Style: ${style}\n`;
            if (mood) userPrompt += `Target Mood/Vibe: ${mood}\n`;
            userPrompt += `\nEnhanced Descriptive Prompt:`;

            const response = await this.client.models.generateContent({
                model,
                contents: [
                    { role: 'user', parts: [{ text: userPrompt }] }
                ],
                config: {
                    systemInstruction: { parts: [{ text: systemInstruction }] }
                }
            });

            const enhancedText = response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!enhancedText) {
                throw new Error("Failed to generate enhanced prompt");
            }

            return enhancedText.trim();
        } catch (error: any) {
            console.error('[AI Prompt Service] Error:', error);
            throw new Error(error.message || "Failed to enhance prompt");
        }
    }

    /**
     * Compiles a highly structured prompt using the "Nanobanana" recipe format.
     * Takes a core subject and an ordered array of modifiers. Order dictates priority.
     */
    async compileNanobananaPrompt(subject: string, modifiers: { category: string, value: string }[], aspectRatio?: string, proSettings?: { mediaType?: string; quality?: string; guidanceScale?: number; negativePrompt?: string; }, variables?: Record<string, string>): Promise<string> {
        if (!subject || subject.trim().length === 0) {
            throw new Error("Core subject is required for Nanobanana compilation");
        }

        try {
            const model = 'gemini-3.1-flash-lite-preview';
            console.log(`[AI Prompt Service] Compiling Nanobanana prompt for subject: "${subject}" with ${modifiers.length} modifiers`);

            const systemInstruction = `
        You are a master AI prompt engineer for image generation models (Stable Diffusion, Midjourney, etc).
        We are using a structured building approach called "Nanobanana".
        The user provides a Core Subject, and an ordered list of Modifiers (Lighting, Camera, Style, Environment, etc).
        
        Your Mission:
        Weave the Core Subject and the Modifiers into a single, cohesive, vivid, highly optimized paragraph prompt.
        
        Rules for Passive Compilation:
        1. LITERAL WEAVE: You are a passive compiler. You take the Core Subject and the Modifiers and weave them together with minimal logical connection.
        2. NO CREATIVITY: You must NOT introduce any art styles, moods, motifs, or concepts not present in the DNA constituent list. If a category is empty (e.g. no Mood modifier), you must NOT invent a mood.
        3. NO META-PHRASING: Eliminate phrases like "captured in a", "rendered as", "evokes a", "overall aesthetic is", "scene is bathed in". These are forbidden tokens.
        4. ZERO INJECTION: You are strictly prohibited from adding independent concepts, objects, attributes, or stylistic details. The output must strictly encompass only what is provided. Do NOT extrapolate or hallucinate details.
        5. SOURCE FIDELITY: Every word in the output should have a direct mapping to an input constituent.
      `;

            let userPrompt = `Core Subject: "${subject}"\n`;

            if (variables && Object.keys(variables).length > 0) {
                userPrompt += `\nActive DNA Variables (Current Definitions):\n`;
                Object.entries(variables).forEach(([name, value]) => {
                    userPrompt += `- [${name}] = "${value}"\n`;
                });
                userPrompt += `\nReminder: Use these values for context but PRESERVE the [${Object.keys(variables).join('], [')}] tokens in the output.\n`;
            }

            if (aspectRatio) {
                userPrompt += `\nTarget Aspect Ratio (Overrides any conflicting aspect ratio!): ${aspectRatio}\n`;
            }
            if (proSettings) {
                userPrompt += `\nPro Core Settings (Overrides any conflicting keywords!):\n`;
                if (proSettings.mediaType) userPrompt += `- Modality: ${proSettings.mediaType}\n`;
                if (proSettings.quality) userPrompt += `- Quality: ${proSettings.quality}\n`;
                if (proSettings.guidanceScale) userPrompt += `- Guidance Scale (CFG): ${proSettings.guidanceScale} (Higher means strict adherence to prompt)\n`;
                if (proSettings.negativePrompt) userPrompt += `- Negative Prompt (EXCLUDE THESE!): ${proSettings.negativePrompt}\n`;
            }

            if (modifiers && modifiers.length > 0) {
                userPrompt += `\nModifiers (in order of priority, highest first):\n`;
                modifiers.forEach((mod, index) => {
                    userPrompt += `${index + 1}. [${mod.category}] ${mod.value}\n`;
                });
            }

            userPrompt += `\nCompiled Paragraph Prompt (Start now):`;

            const response = await this.client.models.generateContent({
                model,
                contents: [
                    { role: 'user', parts: [{ text: userPrompt }] }
                ],
                config: {
                    systemInstruction: { parts: [{ text: systemInstruction }] }
                }
            });

            const compiledText = response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!compiledText) {
                console.error('[AI Prompt Service] No compiled text in response:', response);
                throw new Error("Failed to compile nanobanana prompt");
            }

            console.log('[AI Prompt Service] Successfully compiled prompt:', compiledText.substring(0, 50) + '...');
            return compiledText.trim();
        } catch (error: any) {
            console.error('[AI Prompt Service] Nanobanana Compilation Error Detail:', error);
            throw new Error(error.message || "Failed to compile nanobanana prompt");
        }
    }

    /**
     * Suggests relevant tags based on a list of image prompts.
     */
    async suggestTags(prompts: string[]): Promise<string[]> {
        if (!prompts || prompts.length === 0) {
            return [];
        }

        try {
            const model = 'gemini-3.1-flash-lite-preview';
            const systemInstruction = `
        You are an expert content curator for an AI image gallery.
        Given a list of image prompts, suggest 5-8 relevant, descriptive tags.
        Tags should be single words or short phrases, lowercase, and no '#' symbol.
        Return ONLY a JSON array of strings.
      `;

            const response = await this.client.models.generateContent({
                model,
                contents: [
                    { role: 'user', parts: [{ text: `Image Prompts:\n${prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nSuggested Tags:` }] }
                ],
                config: {
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    responseMimeType: 'application/json'
                }
            });

            const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!responseText) return [];

            const tags = JSON.parse(responseText);
            return Array.isArray(tags) ? tags : [];
        } catch (error: any) {
            console.error('[AI Prompt Service] Suggest Tags Error:', error);
            return [];
        }
    }
}

// Singleton helper
let aiPromptService: AIPromptService | null = null;

export function getAIPromptService(): AIPromptService {
    if (!aiPromptService) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }
        aiPromptService = new AIPromptService(apiKey);
    }
    return aiPromptService;
}
