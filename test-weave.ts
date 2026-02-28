
import { AIPromptService } from './src/lib/services/ai-prompt';
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

async function testWeave() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        return;
    }

    console.log('Using API Key:', apiKey.substring(0, 10) + '...');

    const service = new AIPromptService(apiKey);
    try {
        console.log('Testing compileNanobananaPrompt...');
        const result = await service.compileNanobananaPrompt('A majestic space turtle', [
            { category: 'Style', value: 'Oil painting' },
            { category: 'Lighting', value: 'Cinematic' }
        ]);
        console.log('Result:', result);
    } catch (error: any) {
        console.error('FAILED:', error);
        if (error.stack) console.error(error.stack);
    }
}

testWeave();
