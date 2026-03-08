
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
    const modelName = 'gemini-3.1-flash-image-preview';

    console.log(`Testing ${modelName} with recommended structure...`);
    try {
        const response = await (client as any).models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: 'A lone tree in a field' }] }],
            config: {
                generationConfig: {
                    responseModalities: ["IMAGE"]
                }
            }
        });
        console.log('SUCCESS!');
        console.log('Candidates:', response.candidates?.length);
    } catch (e: any) {
        console.error('FAILED:', e.message);
        if (e.response) {
            console.dir(e.response, { depth: null });
        }
    }
}

test();
