
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim().replace(/['"]/g, '');
            }
        });
    }
} catch (e) { }

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    const client = new GoogleGenAI({ apiKey });
    const model = 'gemini-3.1-flash-image-preview';

    const testCases = [
        { name: "imageConfig at root", config: { generationConfig: { responseModalities: ["IMAGE"] }, imageConfig: { aspectRatio: "1:1" } } },
        { name: "imageGenerationConfig at root", config: { generationConfig: { responseModalities: ["IMAGE"] }, imageGenerationConfig: { aspectRatio: "1:1" } } },
        { name: "imageConfig inside generationConfig", config: { generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } } } }
    ];

    for (const tc of testCases) {
        console.log(`\n--- Testing: ${tc.name} ---`);
        try {
            const response = await (client as any).models.generateContent({
                model,
                contents: [{ role: 'user', parts: [{ text: 'A red circle' }] }],
                config: tc.config
            });
            console.log(`SUCCESS for ${tc.name}`);
        } catch (e: any) {
            console.log(`FAILED for ${tc.name}:`, e.message);
        }
    }
}

test();
