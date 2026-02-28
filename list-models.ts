
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

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        return;
    }

    const client = new GoogleGenAI({ apiKey });
    try {
        console.log('Listing models...');
        // If the SDK supports listing models
        // Most common pattern for genai SDK
        const models = await client.models.list();
        console.log('Available Models:');
        for await (const m of models) {
            console.log((m as any).name);
        }
    } catch (error: any) {
        console.error('FAILED to list models:', error.message);
        // Try another way if the above failed
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            console.log('Available Models via fetch:');
            data.models?.forEach((m: any) => console.log(m.name));
        } catch (fetchErr: any) {
            console.error('Fetch failed too:', fetchErr.message);
        }
    }
}

listModels();
