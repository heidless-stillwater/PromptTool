// NanoBanana (Gemini) Image & Video Generation Service
import { GoogleGenAI } from '@google/genai';
import { AspectRatio, ImageQuality } from '../types';
import { getSecret } from '../config-helper';

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
    referenceImages?: Array<{ data: string, mimeType: string }>; // Multiple reference images
    onProgress?: (current: number, total: number) => void;
    onStatus?: (message: string) => void;
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
    private client: GoogleGenAI; // AI Studio client (for images)
    private vertexClient: GoogleGenAI | null = null; // Vertex AI client (for video/image)
    private apiKey: string;

    constructor(apiKey: string) {
        this.client = new GoogleGenAI({ apiKey });
        this.apiKey = apiKey;
    }

    private async getVertexClient(): Promise<GoogleGenAI> {
        if (this.vertexClient) return this.vertexClient;

        const projectId = 'heidless-apps-2';
        const location = 'us-east1';

        console.log(`[NanoBanana] Initializing Vertex AI client for project: ${projectId} in ${location}`);
        
        this.vertexClient = new GoogleGenAI({
            vertexai: true,
            project: projectId,
            location: location
        });

        return this.vertexClient;
    }

    private async getVertexAccessToken(): Promise<string> {
        const { adminApp } = await import('../firebase-admin');
        const credential = adminApp.options.credential as any;
        const tokenObj = await credential.getAccessToken(['https://www.googleapis.com/auth/cloud-platform']);
        return tokenObj.access_token;
    }

    async generateVideo(options: {
        prompt: string;
        aspectRatio: AspectRatio;
        onProgress?: (current: number, total: number) => void;
        onStatus?: (message: string) => void;
    }): Promise<GenerateImageResult> {
        const { prompt, aspectRatio, onProgress, onStatus } = options;
        const model = 'veo-2.0-generate-001';
        const regions = ['us-central1', 'us-east1', 'europe-west1', 'asia-northeast1', 'us-west1', 'europe-west4'];

        for (const location of regions) {
            try {
                if (onStatus) onStatus(`Initializing Vertex AI Video Engine (${location})...`);
                console.log(`[NanoBanana] Attempting Veo generation in ${location}...`);
                
                const projectId = 'heidless-apps-2';
                const vClient = new GoogleGenAI({
                    vertexai: true,
                    project: projectId,
                    location: location
                });

                const aspectRatioMap: Record<AspectRatio, "16:9" | "9:16" | "1:1"> = {
                    '16:9': '16:9', '9:16': '9:16', '1:1': '1:1', '4:3': '16:9', '3:4': '9:16',
                };
                const veoAspectRatio = aspectRatioMap[aspectRatio] || '16:9';

                if (onStatus) onStatus(`Starting video generation in ${location}...`);

                let operation = await vClient.models.generateVideos({
                    model: model,
                    prompt: prompt,
                    config: { aspectRatio: veoAspectRatio }
                });

                console.log(`[NanoBanana] Video Operation Started in ${location}:`, operation.name);
                if (onStatus) onStatus(`Generation in progress (${location})... this usually takes 1-3 minutes.`);

                const startTime = Date.now();
                const timeout = 600000; 

                while (!operation.done) {
                    if (Date.now() - startTime > timeout) throw new Error('Video generation timed out');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    operation = await vClient.operations.getVideosOperation({ operation });
                    if (onProgress) onProgress(0, 1);
                }

                if (operation.error) throw new Error(`Veo Generation Failed: ${JSON.stringify(operation.error)}`);

                console.log(`[NanoBanana] Successfully generated video in ${location}.`);
                const rawResp = (operation as any).response || operation;
                const resp = JSON.parse(JSON.stringify(rawResp));
                const genVideos = resp.generatedVideos || resp.generated_videos;
                const videoObj = genVideos?.[0]?.video || genVideos?.[0];
                
                let videoData = videoObj?.videoBytes || videoObj?.data;
                let videoUri = videoObj?.uri;
                let mimeType = videoObj?.mimeType || 'video/mp4';

                if (!videoData && !videoUri) {
                    const findValue = (obj: any, key: string): any => {
                        if (!obj || typeof obj !== 'object') return null;
                        if (obj[key]) return obj[key];
                        for (const k of Object.keys(obj)) {
                            const val = findValue(obj[k], key);
                            if (val) return val;
                        }
                        return null;
                    };
                    videoData = findValue(resp, 'videoBytes') || findValue(resp, 'data');
                    videoUri = findValue(resp, 'uri');
                }

                if (videoData) return { success: true, images: [{ data: videoData, mimeType: mimeType }] };

                if (videoUri) {
                    if (onStatus) onStatus(`Downloading video from ${location}...`);
                    const accessToken = await this.getVertexAccessToken();
                    return this.downloadVideo(videoUri, accessToken);
                }

                throw new Error(`Failed to find video data in response.`);

            } catch (error: any) {
                const errorStr = JSON.stringify(error).toLowerCase();
                const isRetryable = errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('404') || errorStr.includes('not found');
                
                if (isRetryable && location !== regions[regions.length - 1]) {
                    console.warn(`[NanoBanana] ${location} failover...`);
                    continue; 
                }
                
                console.error(`Vertex Veo generation error in ${location}:`, error);
                return { success: false, error: error.message || 'Video generation failed' };
            }
        }
        return { success: false, error: 'All regions exhausted quota' };
    }

    private async downloadVideo(videoUri: string, accessToken: string): Promise<GenerateImageResult> {
        try {
            let downloadUrl = videoUri;
            
            if (videoUri.startsWith('gs://')) {
                const parts = videoUri.replace('gs://', '').split('/');
                const bucket = parts.shift();
                const path = parts.join('/');
                downloadUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
            }

            const videoRes = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!videoRes.ok) throw new Error(`Failed to download video content: ${videoRes.statusText}`);

            const videoBuffer = await videoRes.arrayBuffer();
            return {
                success: true,
                images: [{
                    data: Buffer.from(videoBuffer).toString('base64'),
                    mimeType: 'video/mp4'
                }]
            };
        } catch (error: any) {
            throw new Error(`Video download failed: ${error.message}`);
        }
    }

    async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
        const { prompt, quality = 'standard', aspectRatio = '1:1', count = 1, onProgress, onStatus } = options;
        const projects = ['heidless-apps-2', 'heidless-apps-1', 'heidless-apps-3', 'heidless-apps-4', 'heidless-apps-5'];
        const regions = [
            'us-central1', 'us-east1', 'us-east4', 'us-west1', 'us-west4',
            'europe-west1', 'europe-west3', 'europe-west4', 'europe-west9',
            'asia-northeast1', 'asia-northeast3', 'asia-southeast1',
            'australia-southeast1', 'northamerica-northeast1'
        ];
        
        let lastError: any = null;

        for (const projectId of projects) {
            console.log(`[NanoBanana] Starting generation cycle for project: ${projectId}`);
            
            for (const location of regions) {
                const models = ['imagen-3.0-generate-001', 'imagen-3.0-fast-generate-001', 'imagegeneration@006'];
                
                for (const modelName of models) {
                    try {
                        const vClient = new GoogleGenAI({
                            vertexai: true,
                            project: projectId,
                            location: location
                        });
                        
                        console.log(`[NanoBanana] [${projectId}] [${location}] [${modelName}] Attempting generation...`);
                        if (onStatus) onStatus(`Trying ${modelName} in ${location} (${projectId})...`);
                        
                        const vertexQuality = quality === 'standard' ? 'standard' : 'high';

                        const response = await vClient.models.generateContent({
                            model: modelName,
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            config: {
                                candidateCount: count,
                                // @ts-ignore
                                aspectRatio: aspectRatio,
                                // @ts-ignore
                                imageQuality: vertexQuality,
                            } as any
                        });

                        const unwrapped = JSON.parse(JSON.stringify(response));
                        const result = unwrapped.response || unwrapped;
                        
                        const images: ImageResult[] = [];
                        const candidates = result.candidates || [];
                        
                        const deepSearch = (obj: any, key: string): any => {
                            if (!obj || typeof obj !== 'object') return null;
                            if (obj[key]) return obj[key];
                            for (const k of Object.keys(obj)) {
                                const val = deepSearch(obj[k], key);
                                if (val) return val;
                            }
                            return null;
                        };

                        for (const candidate of candidates) {
                            const data = deepSearch(candidate, 'bytesBase64Encoded') || 
                                         deepSearch(candidate, 'data') || 
                                         deepSearch(candidate, 'inlineData')?.data;
                            
                            if (data) {
                                images.push({ 
                                    data, 
                                    mimeType: deepSearch(candidate, 'mimeType') || 'image/png' 
                                });
                            }
                        }

                        if (images.length === 0) throw new Error('No image data found in Vertex response');

                        if (onProgress) onProgress(count, count);
                        console.log(`[NanoBanana] [${projectId}] [${location}] SUCCESS`);
                        if (onStatus) onStatus(`Success in ${location}!`);
                        return { success: true, images };

                    } catch (error: any) {
                        lastError = error;
                        const errorMsg = (error.message || '').toLowerCase();
                        const errorCode = error.code || (error as any).status || '';
                        const isRetryableError = 
                            String(errorCode).includes('429') || 
                            String(errorCode).includes('RESOURCE_EXHAUSTED') ||
                            String(errorCode).includes('404') ||
                            String(errorCode).includes('NOT_FOUND') ||
                            errorMsg.includes('quota') ||
                            errorMsg.includes('rate limit') ||
                            errorMsg.includes('not found') ||
                            JSON.stringify(error).includes('429') ||
                            JSON.stringify(error).includes('404');
                        
                        if (isRetryableError) {
                            const isFreeTier = JSON.stringify(error).includes('free_tier') || errorMsg.includes('free_tier');
                            const reason = (String(errorCode).includes('404') || errorMsg.includes('not found')) ? 'Model Not Found' : 'Quota Exceeded';
                            console.warn(`[NanoBanana] [${projectId}] [${location}] [${modelName}] ${reason}${isFreeTier ? ' (Free Tier)' : ''}. Switching...`);
                            continue;
                        }
                        
                        console.error(`[NanoBanana] [${projectId}] [${location}] [${modelName}] Error:`, error.message || error);
                        throw error;
                    }
                } // End of models loop
            } // End of locations loop
        } // End of projects loop

        // --- Final Fallback: Gemini API (AI Studio) via REST ---
        try {
            console.log(`[NanoBanana] All Vertex regions exhausted. Attempting final REST fallback via Gemini API...`);
            if (onStatus) onStatus('Attempting final fallback (REST)...');
            
            const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${this.apiKey}`;
            
            const fbResponse = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt }],
                    parameters: { sampleCount: 1, aspectRatio: '1:1' }
                })
            });
            
            const fbData = await fbResponse.json();
            
            if (fbData.predictions?.[0]?.bytesBase64Encoded) {
                console.log(`[NanoBanana] SUCCESS via Gemini API REST Fallback (Imagen 4.0)`);
                if (onStatus) onStatus('Success via Imagen 4.0 REST fallback!');
                return { 
                    success: true, 
                    images: [{ 
                        data: fbData.predictions[0].bytesBase64Encoded, 
                        mimeType: 'image/png' 
                    }] 
                };
            } else {
                console.warn(`[NanoBanana] Gemini API REST Fallback returned no data. Status: ${fbResponse.status}. Body:`, JSON.stringify(fbData).substring(0, 1000));
            }
        } catch (fbErr: any) {
            console.error(`[NanoBanana] Gemini API REST Fallback failed:`, fbErr.message);
        }

        console.error(`[NanoBanana] All projects, regions and fallbacks exhausted. Last error: ${lastError?.message}`);
        return { success: false, images: [], error: lastError?.message || 'All regions exhausted quota' };
    }
}

let nanoBananaService: NanoBananaService | null = null;
export async function getNanoBananaService(): Promise<NanoBananaService> {
    if (!nanoBananaService) {
        const apiKey = await getSecret('GEMINI_API_KEY');
        if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
        nanoBananaService = new NanoBananaService(apiKey);
    }
    return nanoBananaService;
}
