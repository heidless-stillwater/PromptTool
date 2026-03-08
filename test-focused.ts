
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
    // Use the name exactly as listed in the API
    const modelName = 'gemini-3-pro-image-preview';

    console.log(`Testing ${modelName}...`);
    try {
        const response = await (client as any).models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: 'A small red circle' }] }],
            config: {
                generationConfig: {
                    responseModalities: ["IMAGE"]
                }
            }
        });
        console.log('SUCCESS!');
        console.log('Candidate count:', response.candidates?.length);
        if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
            console.log('Got valid image data!');
        }
    } catch (e: any) {
        console.error('FAILED:', e.message);
        if (e.response) {
            console.log('Error details:', JSON.stringify(e.response, null, 2));
        }
    }
}

test();
