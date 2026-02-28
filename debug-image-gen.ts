
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
                process.env[key.trim()] = value.trim();
            }
        });
    }
} catch (e) {
    console.error('Error loading .env.local', e);
}

async function debugImageGen() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        return;
    }

    const client = new GoogleGenAI({ apiKey });
    try {
        console.log('Attempting image generation with gemini-2.5-flash-image...');
        const response = await (client as any).models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [{ role: 'user', parts: [{ text: 'A golden retriever in space' }] }],
            config: {
                responseModalities: ['IMAGE']
            }
        });
        console.log('SUCCESS!');
        console.dir(response, { depth: null });
    } catch (e: any) {
        console.error('FAILED image test:', e.message);
        // Try Imagen if Gemini failed
        try {
            console.log('Attempting with imagen-4.0-generate-001...');
            const response = await (client as any).models.generateContent({
                model: 'imagen-4.0-generate-001',
                contents: [{ role: 'user', parts: [{ text: 'A golden retriever in space' }] }]
            });
            console.log('Imagen SUCCESS!');
            console.dir(response, { depth: null });
        } catch (e2: any) {
            console.error('Imagen FAILED:', e2.message);
        }
    }
}

debugImageGen();
