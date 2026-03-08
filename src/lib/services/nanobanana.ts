// NanoBanana (Gemini) Image Generation Service
import { GoogleGenAI } from '@google/genai';
import { AspectRatio, ImageQuality } from '../types';

// Model selection based on quality and tier
const MODELS = {
    standard: 'models/gemini-2.5-flash-image',
    pro: 'models/nano-banana-pro-preview',
} as const;

// Resolution by quality (Upgraded for NanoBanana 2)
const RESOLUTIONS = {
    standard: undefined, // Default 1024px
    high: '2K',
    ultra: '4K',
} as const;

interface GenerateImageOptions {
    prompt: string;
    modelType?: 'standard' | 'pro';
    quality: ImageQuality;
    aspectRatio: AspectRatio;
    count?: number;
    seed?: number;
    negativePrompt?: string;
    guidanceScale?: number;
    referenceImages?: { data: string, mimeType?: string, usage: 'style' | 'content' }[];
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

    async generateVideo(options: {
        prompt: string;
        aspectRatio: AspectRatio;
        count?: number;
        onProgress?: (current: number, total: number) => void
    }): Promise<GenerateImageResult> {
        const { prompt, aspectRatio, count = 1, onProgress } = options;
        const model = 'models/veo-2.0-generate-001';

        try {
            // Map aspect ratio for Veo
            const aspectRatioMap: Record<AspectRatio, string> = {
                '16:9': '16:9',
                '9:16': '9:16',
                '1:1': '1:1',
                '4:3': '16:9',
                '3:4': '9:16',
            };
            const veoAspectRatio = aspectRatioMap[aspectRatio] || '16:9';

            const results: ImageResult[] = [];

            // Execute Veo requests concurrently as it only accepts 1 instance per long-running operation
            const operationPromises = Array.from({ length: count }).map(async (_, index) => {
                const requestBody = {
                    instances: [{ prompt: prompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: veoAspectRatio
                    }
                };

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:predictLongRunning?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Veo API Error (${response.status}): ${errorText}`);
                }

                const initialData = await response.json();
                const operationName = initialData.name;

                if (!operationName) {
                    throw new Error('No operation name returned from Veo API');
                }

                return { operationName, index };
            });

            // Dispatch all generation operations
            const operations = await Promise.all(operationPromises);

            // Poll for all operations to complete
            const pollStart = Date.now();
            const timeout = 600000; // 10 minutes timeout

            const pollPromises = operations.map(async ({ operationName, index }) => {
                while (true) {
                    if (Date.now() - pollStart > timeout) {
                        throw new Error(`Video generation timed out for operation ${index}`);
                    }

                    await new Promise(resolve => setTimeout(resolve, 5000));

                    const pollResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${this.apiKey}`);
                    if (!pollResponse.ok) {
                        throw new Error(`Polling failed for operation ${index}: ${pollResponse.statusText}`);
                    }

                    const pollData = await pollResponse.json();

                    if (pollData.done) {
                        if (pollData.error) {
                            throw new Error(`Veo Generation Failed for operation ${index}: ${pollData.error.message || JSON.stringify(pollData.error)}`);
                        }

                        // Extract Video
                        const sample = pollData.response?.generateVideoResponse?.generatedSamples?.[0];
                        if (!sample || !sample.video?.uri) {
                            throw new Error(`No video generated in completed operation ${index}`);
                        }

                        // Download Video Content
                        const videoUri = sample.video.uri;
                        let videoRes = await fetch(videoUri.includes('?') ? `${videoUri}&key=${this.apiKey}` : `${videoUri}?key=${this.apiKey}`);

                        if (!videoRes.ok) {
                            videoRes = await fetch(videoUri); // fallback
                        }

                        if (videoRes.ok) {
                            const buffer = await videoRes.arrayBuffer();
                            return {
                                data: Buffer.from(buffer).toString('base64'),
                                mimeType: 'video/mp4'
                            };
                        } else {
                            throw new Error(`Failed to download video for operation ${index}: ${videoRes.status} ${videoRes.statusText}`);
                        }
                    }
                }
            });

            const completedVideos = await Promise.all(pollPromises);

            completedVideos.forEach((video, i) => {
                results.push(video);
                if (onProgress) onProgress(i + 1, count);
            });

            return {
                success: true,
                images: results
            };

        } catch (error: any) {
            console.error('Veo video generation error:', error);
            return { success: false, error: error.message || 'Video generation failed' };
        }
    }

    async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
        const { prompt, modelType = 'standard', quality, aspectRatio, count = 1, seed, negativePrompt, guidanceScale, referenceImages, onProgress } = options;
        const model = MODELS[modelType];
        const resolution = RESOLUTIONS[quality];

        const images: ImageResult[] = [];

        try {
            // Loop for multiple images (Batch Generation)
            for (let i = 0; i < count; i++) {
                let attempts = 0;
                const maxAttempts = 3; // Up to 3 retries for each image
                let foundImageInCandidate = false;
                let lastError: any = null;

                while (attempts < maxAttempts && !foundImageInCandidate) {
                    try {
                        attempts++;
                        // Add generation config for advanced controls
                        const generationConfig: any = {
                            responseModalities: ["IMAGE"],
                        };
                        if (seed !== undefined) {
                            generationConfig.seed = seed + i * 100;
                        }
                        if (guidanceScale !== undefined) {
                            generationConfig.guidanceScale = guidanceScale;
                        }

                        // Build config
                        const config: any = {
                            generationConfig,
                            safetySettings: [
                                {
                                    category: "HARM_CATEGORY_HATE_SPEECH",
                                    threshold: "BLOCK_ONLY_HIGH",
                                },
                                {
                                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                                    threshold: "BLOCK_ONLY_HIGH",
                                },
                                {
                                    category: "HARM_CATEGORY_HARASSMENT",
                                    threshold: "BLOCK_ONLY_HIGH",
                                },
                                {
                                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                    threshold: "BLOCK_ONLY_HIGH",
                                },
                            ],
                        };

                        // Add image config for aspect ratio
                        const imageConfig: any = {};

                        // Convert aspect ratio format
                        const aspectRatioMap: Record<AspectRatio, string> = {
                            "1:1": "1:1",
                            "4:3": "4:3",
                            "16:9": "16:9",
                            "9:16": "9:16",
                            "3:4": "3:4",
                        };
                        if (aspectRatio && aspectRatioMap[aspectRatio]) {
                            imageConfig.aspectRatio = aspectRatioMap[aspectRatio];
                        }

                        if (Object.keys(imageConfig).length > 0) {
                            config.imageConfig = imageConfig;
                        }

                        // Handle negative prompt if provided
                        let finalPrompt = prompt;
                        if (negativePrompt) {
                            finalPrompt = `${prompt}\n\nNegative Prompt: ${negativePrompt}`;
                        }

                        // Build contents - multimodal if reference images provided
                        let contents: any[] = [];

                        if (referenceImages && referenceImages.length > 0) {
                            // NanoBanana 2 native multimodal support
                            referenceImages.forEach((ref) => {
                                contents.push({
                                    inlineData: {
                                        mimeType: ref.mimeType || "image/png",
                                        data: ref.data,
                                    },
                                    // Use role or tag if supported, for now just include the data
                                });
                            });

                            // Adjust prompt for Img2Img/Style mode
                            const hasStyleRef = referenceImages.some(
                                (r) => r.usage === "style",
                            );
                            const basePrefix = hasStyleRef
                                ? "Using the provided style reference image(s), generate a new image: "
                                : "Create a variation incorporating these reference image(s): ";

                            contents.push({
                                text: `${basePrefix}${finalPrompt}`,
                            });
                        } else {
                            // Text-only mode
                            contents = [{ text: finalPrompt }];
                        }

                        const response =
                            await this.client.models.generateContent({
                                model,
                                contents,
                                config,
                            });

                        const candidate = response.candidates?.[0];

                        if (candidate) {
                            if (
                                candidate.finishReason &&
                                candidate.finishReason !== "STOP"
                            ) {
                                console.warn(
                                    `[NanoBanana] Generation stopped with reason: ${candidate.finishReason}`,
                                );
                                console.warn(
                                    `[NanoBanana] Full candidate:`,
                                    JSON.stringify(candidate, null, 2),
                                );

                                let blockReason = `Generation blocked: ${candidate.finishReason}`;
                                if (candidate.finishMessage) {
                                    blockReason += ` - ${candidate.finishMessage}`;
                                }
                                if (candidate.safetyRatings) {
                                    const highRiskFilters =
                                        candidate.safetyRatings
                                            .filter(
                                                (r: any) =>
                                                    r.probability !==
                                                    "NEGLIGIBLE" &&
                                                    r.probability !== "LOW",
                                            )
                                            .map(
                                                (r: any) =>
                                                    `${r.category}: ${r.probability}`,
                                            );
                                    if (highRiskFilters.length > 0) {
                                        blockReason += `. Safety Flags: ${highRiskFilters.join(", ")}`;
                                    }
                                }

                                // Safety blocks are NOT retryable
                                lastError = new Error(blockReason);
                                break;
                            }

                            // Extract image from response
                            const parts = candidate.content?.parts;

                            if (parts) {
                                for (const part of parts) {
                                    if (part.inlineData && part.inlineData.data) {
                                        images.push({
                                            data: part.inlineData.data,
                                            mimeType:
                                                part.inlineData.mimeType ||
                                                "image/png",
                                        });
                                        foundImageInCandidate = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!foundImageInCandidate) {
                            console.warn(
                                `[NanoBanana] Attempt ${attempts} failed to find image in response for index ${i}`,
                            );
                            if (!lastError) {
                                lastError = new Error(
                                    "No image data returned from API",
                                );
                            }
                        }
                    } catch (innerError: any) {
                        const errorMsg = innerError.message || "";
                        console.error(
                            `[NanoBanana] Attempt ${attempts} failed for index ${i}:`,
                            errorMsg,
                        );
                        lastError = innerError;

                        if (attempts >= maxAttempts) {
                            break;
                        }

                        // Determine if retryable
                        const isRetryable =
                            errorMsg.toLowerCase().includes("quota") ||
                            errorMsg.toLowerCase().includes("too many requests") ||
                            errorMsg.toLowerCase().includes("exhausted") ||
                            errorMsg.toLowerCase().includes("unavailable") ||
                            errorMsg.toLowerCase().includes("high demand") ||
                            errorMsg.toLowerCase().includes("fetch failed") ||
                            errorMsg.toLowerCase().includes("network") ||
                            errorMsg.toLowerCase().includes("aborted");

                        if (!isRetryable) {
                            console.warn(
                                "[NanoBanana] Non-retryable error detected. Aborting retries.",
                            );
                            break;
                        }

                        // Short wait before retry (exponential backoff)
                        const backoff = Math.pow(2, attempts - 1) * 1000;
                        console.log(
                            `[NanoBanana] Retrying in ${backoff}ms...`,
                        );
                        await new Promise((resolve) =>
                            setTimeout(resolve, backoff),
                        );
                    }
                }

                if (onProgress) {
                    onProgress(i + 1, count);
                }

                if (!foundImageInCandidate && i === 0 && images.length === 0) {
                    return {
                        success: false,
                        error: `Initial generation failed: ${lastError?.message || "Unknown error"}`,
                    };
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
