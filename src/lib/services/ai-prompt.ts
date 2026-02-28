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
            const model = 'gemini-2.5-flash'; // Fast and capable for text expansion

            const systemInstruction = `
        You are a world-class prompt engineer for AI image generation (e.g., Midjourney, DALL-E, Stable Diffusion).
        Your goal is to take a simple, short user prompt and expand it into a detailed, descriptive, and visually stunning masterpiece.
        
        Guidelines:
        1. Keep the original core subject but surround it with rich details.
        2. Describe lighting (e.g., "cinematic lighting", "golden hour", "volumetric fog").
        3. Describe textures and materials (e.g., "weathered leather", "iridescent glass", "soft velvet").
        4. Mention camera settings or artistic styles (e.g., "macro photography", "hyper-realistic", "surrealism", "cyberpunk aesthetic").
        5. Use evocative adjectives.
        6. Keep the final result concise but high-impact (usually 50-100 words).
        7. Return ONLY the enhanced prompt. No introductions, no explanations.
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
    async compileNanobananaPrompt(subject: string, modifiers: { category: string, value: string }[], aspectRatio?: string, proSettings?: { mediaType?: string; quality?: string; guidanceScale?: number; negativePrompt?: string; }): Promise<string> {
        if (!subject || subject.trim().length === 0) {
            throw new Error("Core subject is required for Nanobanana compilation");
        }

        try {
            const model = 'gemini-2.5-flash';
            console.log(`[AI Prompt Service] Compiling Nanobanana prompt for subject: "${subject}" with ${modifiers.length} modifiers`);

            const systemInstruction = `
        You are a master AI prompt engineer for image generation models (Stable Diffusion, Midjourney, etc).
        We are using a structured building approach called "Nanobanana".
        The user provides a Core Subject, and an ordered list of Modifiers (Lighting, Camera, Style, Environment, etc).
        
        Your Mission:
        Weave the Core Subject and the Modifiers into a single, cohesive, vivid, highly optimized paragraph prompt.
        
        Rules:
        1. The ORDER of the modifiers in the prompt should reflect their priority (the order they appear in the user's list from top to bottom).
        2. Do not just append them mechanically with commas. Integrate them naturally, but ensure keywords are prominent.
        3. Keep it to a single paragraph. NO line breaks. NO markdown formatting.
        4. Return ONLY the final compiled prompt string. NO conversational fluff or explanations.
        5. IMPORTANT OVERRIDE RULE: The user has selected specific Pro Core Settings (like Modality, Quality, Aspect Ratio). These are the ultimate source of truth. If the original prompt or modifiers mention ANY values that contradict the user's Pro Core Settings, OVERRIDE THEM or completely REMOVE THEM from the compiled prompt. Ensure the final prompt strictly adheres to the user's selected constraints.
      `;

            let userPrompt = `Core Subject: "${subject}"\n`;
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
            userPrompt += `\nCompiled Prompt:`;

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
            const model = 'gemini-2.5-flash';
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
