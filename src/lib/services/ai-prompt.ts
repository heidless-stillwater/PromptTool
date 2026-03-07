import { GoogleGenAI } from '@google/genai';

export class AIPromptService {
    private client: GoogleGenAI;

    constructor(apiKey: string) {
        this.client = new GoogleGenAI({ apiKey });
    }

    /**
     * Enhances a simple prompt into a detailed masterpiece for image generation.
     */
    async enhancePrompt(prompt: string, style?: string, mood?: string, modifiers?: { category: string, value: string }[]): Promise<string> {
        if (!prompt || prompt.trim().length === 0) {
            throw new Error("Prompt is required for enhancement");
        }

        try {
            const model = 'gemini-3.1-flash-lite-preview';

            const systemInstruction = `
        You are a world-class prompt engineer for AI image generation.
        Your goal is to take a prompt and expand it into a detailed, descriptive, and visually stunning masterpiece.
        
        Guidelines for DNA Integrity:
        1. PERSERVE SUBJECT: The core subject must remain the focus.
        2. NO HALLUCINATION: Do NOT add artistic styles or technical settings that are NOT present in the input parameters.
        3. DNA ANCHORS: Architectural tokens in square brackets like [style:cyberpunk] or [BUILDING_NAME:Tower of London] must be preserved EXACTLY as written. 
           If modifiers or variables are provided in the input, ensure they are represented as "[KEY:VALUE]" in your output.
        4. WEAVING: Integrate these anchors naturally into the descriptive narrative.
        5. VARIABLE ARCHITECTURE: Preservation of [SUBJECT], [TEXTURE], [BUILDING_NAME], etc. is mandatory. NEVER resolve them into plain text.
        6. OUTPUT ONLY: Return only the descriptive string.
      `;

            let userPrompt = `Original Prompt: "${prompt}"\n`;
            if (modifiers && modifiers.length > 0) {
                userPrompt += `\nDNA Helix Modifiers (Ensure these anchors are used in the output):\n`;
                modifiers.forEach(mod => {
                    userPrompt += `- [${mod.category.toLowerCase()}:${mod.value.toLowerCase()}]\n`;
                });
            } else {
                if (style) userPrompt += `Target Art Style: ${style}\n`;
                if (mood) userPrompt += `Target Mood/Vibe: ${mood}\n`;
            }

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
        Weave the Core Subject and the Modifiers into a single, highly descriptive, vivid, and beautifully crafted paragraph prompt.
        
        DNA Anchor Protocol:
        1. COHESIVE NARRATIVE: Integrate all elements into a natural-sounding, descriptive narrative.
        2. NO HALLUCINATION: Do NOT introduce elements absent from the input.
        3. NO META-FLUFF: Eliminate prefixes like "An image of".
        4. DNA MODIFIERS: Write DNA Helix modifiers using literal "[category:value]" (e.g., "[style:cyberpunk]").
        5. VARIABLE ARCHITECTURE: User-defined variables (e.g., [BUILDING_NAME]) MUST be treated as immutable architectural anchors. 
           CRITICAL: If a variable has a value defined (e.g., [BUILDING_NAME] = "Tower of London"), your output MUST use the format: "[BUILDING_NAME:Tower of London]". 
           NEVER resolve a variable into plain text. The brackets MUST remain in the output.
        6. NO CLI PARAMETERS: Do NOT append parameters like "--ar 1:1".
      `;

            let userPrompt = `Core Subject: "${subject}"\n`;

            const activeModifierKeys = new Set(modifiers?.map(m => m.category.toUpperCase()) || []);

            if (variables && Object.keys(variables).length > 0) {
                let hasCustomVars = false;
                let varText = `\nActive DNA Variables (Current State):\n`;

                Object.entries(variables).forEach(([name, value]) => {
                    // Prevent DNA Helix modifiers from being doubly injected as custom variables
                    if (!activeModifierKeys.has(name.toUpperCase())) {
                        const tag = value ? `[${name.toUpperCase()}:${value}]` : `[${name.toUpperCase()}]`;
                        varText += `- Represent this variable in output as: "${tag}"\n`;
                        hasCustomVars = true;
                    }
                });

                if (hasCustomVars) {
                    userPrompt += varText;
                }
            }

            if (aspectRatio) {
                userPrompt += `\nTarget Aspect Ratio: ${aspectRatio}\n`;
            }
            if (proSettings) {
                userPrompt += `\nPro Core Settings (Use for context, do not output labels):\n`;
                if (proSettings.mediaType) userPrompt += `- Modality: ${proSettings.mediaType}\n`;
                if (proSettings.quality) userPrompt += `- Quality: ${proSettings.quality}\n`;
            }

            if (modifiers && modifiers.length > 0) {
                userPrompt += `\nDNA Helix Modifiers (Use THESE EXACT TOKENS in your output):\n`;
                modifiers.forEach((mod) => {
                    const tag = `[${mod.category.toLowerCase()}:${mod.value.toLowerCase()}]`;
                    userPrompt += `- Use "${tag}" for ${mod.category}\n`;
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
