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
}

interface GenerateImageResult {
    success: boolean;
    imageData?: string; // Base64 encoded
    mimeType?: string;
    error?: string;
}

export class NanoBananaService {
    private client: GoogleGenAI;

    constructor(apiKey: string) {
        this.client = new GoogleGenAI({ apiKey });
    }

    async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
        const { prompt, quality, aspectRatio } = options;
        const model = MODELS[quality];
        const resolution = RESOLUTIONS[quality];

        try {
            // Build config
            const config: any = {
                responseModalities: ['Image'],
            };

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

            const response = await this.client.models.generateContent({
                model,
                contents: prompt,
                config,
            });

            // Extract image from response
            const parts = response.candidates?.[0]?.content?.parts;
            if (!parts || parts.length === 0) {
                return { success: false, error: 'No image generated' };
            }

            for (const part of parts) {
                if (part.inlineData) {
                    return {
                        success: true,
                        imageData: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'image/png',
                    };
                }
            }

            return { success: false, error: 'No image data in response' };
        } catch (error: any) {
            console.error('NanoBanana generation error:', error);
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
