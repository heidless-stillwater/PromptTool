
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
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
} catch (e) {
    console.error('Error loading .env.local', e);
}

async function testConfigurations() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        return;
    }

    const client = new GoogleGenAI({ apiKey });
    const model = 'models/gemini-3-pro-image-preview';

    const configs = [
        {
            name: "Basic - No extras",
            config: {
                responseModalities: ["IMAGE"]
            }
        },
        {
            name: "Modality in generationConfig",
            config: {
                generationConfig: {
                    responseModalities: ["IMAGE"]
                }
            }
        },
        {
            name: "Lowercase image",
            config: {
                responseModalities: ["image"]
            }
        }
    ];

    for (const test of configs) {
        console.log(`\n--- Testing: ${test.name} ---`);
        try {
            const response = await (client as any).models.generateContent({
                model,
                contents: [{ role: 'user', parts: [{ text: 'A basic sketch of a house' }] }],
                config: test.config
            });
            console.log(`Success for ${test.name}!`);
            console.log('Finish Reason:', response.candidates?.[0]?.finishReason);
        } catch (e: any) {
            console.log(`Failed for ${test.name}:`, e.message);
        }
    }
}

testConfigurations();
