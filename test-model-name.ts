
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

    // Testing Flash with minimal config
    const models = ['gemini-3.1-flash-image-preview', 'models/gemini-3.1-flash-image-preview'];

    for (const model of models) {
        console.log(`\n--- Testing Model: ${model} ---`);
        try {
            const response = await (client as any).models.generateContent({
                model,
                contents: [{ role: 'user', parts: [{ text: 'A small cat' }] }],
                config: {
                    generationConfig: {
                        responseModalities: ["IMAGE"]
                    }
                }
            });
            console.log(`SUCCESS for ${model}`);
            if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                console.log('Got data!');
            }
        } catch (e: any) {
            console.log(`FAILED for ${model}:`, e.message);
        }
    }
}

test();
