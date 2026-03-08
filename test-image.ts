
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

    const models = ['models/gemini-3.1-flash-image-preview', 'models/gemini-3-pro-image-preview'];
    const modalities = ['IMAGE', 'Image'];

    for (const model of models) {
        for (const modality of modalities) {
            console.log(`\n--- Testing Model: ${model}, Modality: ${modality} ---`);
            try {
                const response = await (client as any).models.generateContent({
                    model,
                    contents: [{ role: 'user', parts: [{ text: 'A golden key' }] }],
                    config: {
                        generationConfig: {
                            responseModalities: [modality]
                        }
                    }
                });
                console.log(`SUCCESS for ${model} with ${modality}`);
                const part = response.candidates?.[0]?.content?.parts?.[0];
                if (part?.inlineData) {
                    console.log('Got Image Data!');
                }
            } catch (e: any) {
                console.log(`FAILED for ${model} with ${modality}:`, e.message);
            }
        }
    }
}

test();
