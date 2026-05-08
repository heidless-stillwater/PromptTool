// NanoBanana (Gemini) Image Generation Service
import { GoogleGenAI } from '@google/genai';
import { AspectRatio, ImageQuality } from '../types';

// Model selection based on quality
const MODELS = {
    standard: 'gemini-2.5-flash-image',
    high: 'gemini-2.5-flash-image',
    ultra: 'gemini-3-pro-image-preview',
} as const;

// Resolution by quality
const RESOLUTIONS = {
    standard: undefined, // Default 1024px
    high: '2K',
    ultra: '4K',
} as const;

interface GenerateImageOptions {
    prompt: string;
    quality: ImageQuality;
    aspectRatio: AspectRatio;
    count?: number;
    seed?: number;
    negativePrompt?: string;
    guidanceScale?: number;
    referenceImage?: string;    // Base64 image data for Img2Img variations
    referenceMimeType?: string; // MIME type of reference image (default: image/png)
    onProgress?: (current: number, total: number) => void;
}

export interface ImageResult {
    data: string;
    mimeType: string;
}

export interface GenerateImageResult {
    success: boolean;
    images?: ImageResult[];
    error?: string;
}

export class NanoBananaService {
    private client: GoogleGenAI;

    constructor(apiKey: string) {
        this.client = new GoogleGenAI({ apiKey });
    }

    async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
        const { prompt, quality, aspectRatio, count = 1, seed, negativePrompt, guidanceScale, referenceImage, referenceMimeType, onProgress } = options;
        const model = MODELS[quality];
        const resolution = RESOLUTIONS[quality];

        const images: ImageResult[] = [];

        try {
            // Loop for multiple images (Batch Generation)
            for (let i = 0; i < count; i++) {
                let attempts = 0;
                const maxAttempts = 2; // Up to 2 retries for each image
                let foundImageInCandidate = false;
                let lastError: any = null;

                while (attempts < maxAttempts && !foundImageInCandidate) {
                    try {
                        attempts++;
                        // Build config
                        const config: any = {
                            responseModalities: ['Image'],
                            safetySettings: [
                                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                            ],
                        };

                        // Add generation config for advanced controls
                        const generationConfig: any = {};
                        if (seed !== undefined) {
                            // If count > 1 and seed is locked, we use the same seed.
                            // However, usually users want DIFFERENT images in a batch.
                            // If seed is provided, we'll add the index to it for variation unless we want them identical.
                            // For now, let's use the seed as a base.
                            generationConfig.seed = seed + (i * 100);
                        }
                        if (guidanceScale !== undefined) {
                            generationConfig.guidanceScale = guidanceScale;
                        }

                        if (Object.keys(generationConfig).length > 0) {
                            config.generationConfig = generationConfig;
                        }

                        // Add image config for aspect ratio and resolution
                        const imageConfig: any = {};

                        // Convert aspect ratio format
                        const aspectRatioMap: Record<AspectRatio, string> = {
                            '1:1': '1:1',
                            '4:3': '4:3',
                            '16:9': '16:9',
                            '9:16': '9:16',
                            '3:4': '3:4',
                        };
                        imageConfig.aspectRatio = aspectRatioMap[aspectRatio];

                        if (resolution) {
                            imageConfig.imageSize = resolution;
                        }

                        if (Object.keys(imageConfig).length > 0) {
                            config.imageConfig = imageConfig;
                        }

                        // Handle negative prompt if provided
                        let finalPrompt = prompt;
                        if (negativePrompt) {
                            finalPrompt = `${prompt}\n\nNegative Prompt: ${negativePrompt}`;
                        }

                        // Build contents - multimodal if reference image provided
                        let contents: any;
                        if (referenceImage) {
                            // Img2Img mode: include reference image + text prompt
                            const variationPrompt = `Create a variation of this image. ${finalPrompt}`;
                            contents = [
                                {
                                    inlineData: {
                                        mimeType: referenceMimeType || 'image/png',
                                        data: referenceImage,
                                    },
                                },
                                { text: variationPrompt },
                            ];
                        } else {
                            // Text-only mode
                            contents = finalPrompt;
                        }

                        const response = await this.client.models.generateContent({
                            model,
                            contents,
                            config,
                        });

                        const candidate = response.candidates?.[0];

                        if (candidate) {
                            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                                console.warn(`[NanoBanana] Generation stopped with reason: ${candidate.finishReason}`);
                                console.warn(`[NanoBanana] Full candidate:`, JSON.stringify(candidate, null, 2));

                                let blockReason = `Generation blocked: ${candidate.finishReason}`;
                                if (candidate.finishMessage) {
                                    blockReason += ` - ${candidate.finishMessage}`;
                                }
                                if (candidate.safetyRatings) {
                                    const highRiskFilters = candidate.safetyRatings
                                        .filter((r: any) => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW')
                                        .map((r: any) => `${r.category}: ${r.probability}`);
                                    if (highRiskFilters.length > 0) {
                                        blockReason += `. Safety Flags: ${highRiskFilters.join(', ')}`;
                                    }
                                }

                                lastError = new Error(blockReason);
                            }

                            // Extract image from response
                            const parts = candidate.content?.parts;

                            if (parts) {
                                for (const part of parts) {
                                    if (part.inlineData && part.inlineData.data) {
                                        images.push({
                                            data: part.inlineData.data,
                                            mimeType: part.inlineData.mimeType || 'image/png',
                                        });
                                        foundImageInCandidate = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!foundImageInCandidate) {
                            console.warn(`[NanoBanana] Attempt ${attempts} failed to find image in response for index ${i}`);
                            if (!lastError) {
                                lastError = new Error('No image data returned from API');
                            }
                        }
                    } catch (innerError: any) {
                        console.error(`[NanoBanana] Attempt ${attempts} failed for index ${i}:`, innerError.message);
                        lastError = innerError;
                        if (attempts >= maxAttempts) {
                            break;
                        }
                        // Short wait before retry
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }

                if (onProgress) {
                    onProgress(i + 1, count);
                }

                if (!foundImageInCandidate && i === 0 && images.length === 0) {
                    return { success: false, error: `Initial generation failed: ${lastError?.message || 'Unknown error'}` };
                }
            }

            if (images.length === 0) {
                return { success: false, error: 'No images generated' };
            }

            return { success: true, images };
        } catch (error: any) {
            console.error('NanoBanana generation error:', error);
            if (images.length > 0) {
                return { success: true, images };
            }
            return {
                success: false,
                error: error.message || 'Image generation failed'
            };
        }
    }
}

// Server-side singleton
let nanoBananaService: NanoBananaService | null = null;

export function getNanoBananaService(): NanoBananaService {
    if (!nanoBananaService) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }
        nanoBananaService = new NanoBananaService(apiKey);
    }
    return nanoBananaService;
}
