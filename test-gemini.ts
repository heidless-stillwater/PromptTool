
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

async function testGeminiParams() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        return;
    }

    const client = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-pro-image-preview';

    const config: any = {
        responseModalities: ['Image'],
        generationConfig: {
            // Test seed
            seed: 12345,
            guidanceScale: 7.5,
        }
    };

    console.log('Testing with config:', JSON.stringify(config, null, 2));

    try {
        const response = await client.models.generateContent({
            model,
            contents: 'A futuristic city',
            config,
        });
        console.log('Success!');
        console.log(response);
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

testGeminiParams();
