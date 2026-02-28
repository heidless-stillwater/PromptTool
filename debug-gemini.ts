
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

async function debugModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        return;
    }

    const client = new GoogleGenAI({ apiKey });
    console.log('Client object keys:', Object.keys(client));
    if ((client as any).models) {
        console.log('models object keys:', Object.keys((client as any).models));
    }

    try {
        console.log('Attempting simple generation...');
        // Standard text generation for this SDK
        const result = await (client as any).models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: 'Say hi' }] }]
        });
        console.log('SUCCESS!', result);
    } catch (e: any) {
        console.error('FAILED simple generation:', e.message);
        if (e.stack) console.error(e.stack);
    }
}

debugModels();
