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
    private apiKey: string;

    constructor(apiKey: string) {
        this.client = new GoogleGenAI({ apiKey });
        this.apiKey = apiKey;
    }

    async generateVideo(options: { prompt: string; aspectRatio: AspectRatio; onProgress?: (current: number, total: number) => void }): Promise<GenerateImageResult> {
        const { prompt, aspectRatio, onProgress } = options;
        const model = 'models/veo-2.0-generate-001';

        try {
            // Map aspect ratio for Veo
            // Veo 2.0 primarily supports 16:9 and 9:16. 1:1 often works.
            // 4:3 and 3:4 are generally not supported.
            const aspectRatioMap: Record<AspectRatio, string> = {
                '16:9': '16:9',
                '9:16': '9:16',
                '1:1': '1:1',
                '4:3': '16:9', // Fallback to 16:9
                '3:4': '9:16', // Fallback to 9:16
            };
            const veoAspectRatio = aspectRatioMap[aspectRatio] || '16:9';

            // 1. Initial Request
            // Using raw fetch because predictLongRunning is not standard in SDK yet
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:predictLongRunning?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instances: [
                        { prompt }
                    ],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: veoAspectRatio
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Veo API Error (${response.status}): ${errorText}`);
            }

            const initialData = await response.json();
            const operationName = initialData.name; // e.g., "models/.../operations/..."

            if (!operationName) {
                throw new Error('No operation name returned from Veo API');
            }

            // 2. Poll for completion
            let pollData;
            const startTime = Date.now();
            const timeout = 180000; // 3 minutes timeout (video gen is slow)

            while (true) {
                if (Date.now() - startTime > timeout) {
                    throw new Error('Video generation timed out');
                }

                // Wait 5 seconds between polls
                await new Promise(resolve => setTimeout(resolve, 5000));

                const pollResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${this.apiKey}`);
                if (!pollResponse.ok) {
                    throw new Error(`Polling failed: ${pollResponse.statusText}`);
                }

                pollData = await pollResponse.json();

                if (pollData.done) {
                    break;
                }

                // Optional progress update? 
                // Veo doesn't expose % progress easily, but we can fake it or just pulse.
                if (onProgress) onProgress(0, 1);
            }

            if (pollData.error) {
                throw new Error(`Veo Generation Failed: ${pollData.error.message || JSON.stringify(pollData.error)}`);
            }

            // 3. Extract Video
            // The result is usually in response.result (for older LRO) or response (for new LRO)
            // Based on test, it returns:
            // "response": { "@type": "...", "generateVideoResponse": { "generatedSamples": [ { "video": { "uri": "..." } } ] } }
            // Note: The field might be `result` or `response` depending on API version. 
            // Our test output showed `response` at top level inside the operation JSON, returning `uri`.

            const videoUri = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

            if (!videoUri) {
                console.error('Full Poll Data:', JSON.stringify(pollData, null, 2));
                throw new Error('No video URI found in completed operation');
            }

            // 4. Download Video Content
            // The URI is likely a public or authenticated download link.
            // Usually for Generative Language API, we can fetch it directly (maybe with key).
            const downloadUrl = `${videoUri}&key=${this.apiKey}`; // Try appending key just in case

            const videoRes = await fetch(downloadUrl);
            if (!videoRes.ok) {
                // Try without extra key param if 400/403?
                // Actually the URI from test output already has some params.
                // Let's assume standard fetch works.
                const retryRes = await fetch(videoUri);
                if (!retryRes.ok) {
                    throw new Error(`Failed to download video content: ${videoRes.statusText}`);
                }
                return {
                    success: true,
                    images: [{
                        data: Buffer.from(await retryRes.arrayBuffer()).toString('base64'),
                        mimeType: 'video/mp4'
                    }]
                };
            }

            const videoBuffer = await videoRes.arrayBuffer();

            return {
                success: true,
                images: [{
                    data: Buffer.from(videoBuffer).toString('base64'),
                    mimeType: 'video/mp4' // Verify header? usually video/mp4
                }]
            };

        } catch (error: any) {
            console.error('Veo video generation error:', error);
            return { success: false, error: error.message || 'Video generation failed' };
        }
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
                            responseModalities: ['IMAGE'],
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
