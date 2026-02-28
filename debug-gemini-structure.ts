
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

async function debugModelsStructure() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        return;
    }

    const client = new GoogleGenAI({ apiKey });
    try {
        console.log('Attempting generation with system instruction...');
        const response = await (client as any).models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: 'Translate: Hello' }] }],
            config: {
                systemInstruction: { parts: [{ text: 'You are a translator to French.' }] }
            }
        });
        console.log('Response Structure:');
        console.dir(response, { depth: null });
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('Extracted Text:', text);
    } catch (e: any) {
        console.error('FAILED structure test:', e.message);
        if (e.stack) console.error(e.stack);
    }
}

debugModelsStructure();
