
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

async function testInjection() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        return;
    }

    const service = new AIPromptService(apiKey);

    const testCases = [
        {
            name: "Empty Modifiers",
            subject: "A simple wooden chair",
            modifiers: []
        },
        {
            name: "Only Lighting",
            subject: "A mountain range",
            modifiers: [{ category: 'lighting', value: 'Neon' }]
        },
        {
            name: "Vague Subject",
            subject: "Something mysterious",
            modifiers: [{ category: 'style', value: 'Minimalist' }]
        },
        {
            name: "Implied Pop Art",
            subject: "A colorful painting of a soup can like Andy Warhol",
            modifiers: []
        },
        {
            name: "Implied Whimsical",
            subject: "A cute fairy dancing with butterflies in a mystical forest",
            modifiers: []
        },
        {
            name: "Contradictory Styles",
            subject: "A gritty cyberpunk city",
            modifiers: [{ category: 'style', value: 'Studio Ghibli' }]
        }
    ];

    for (const tc of testCases) {
        console.log(`--- Testing: ${tc.name} ---`);
        console.log(`Subject: "${tc.subject}"`);
        console.log(`Modifiers:`, tc.modifiers);
        try {
            const result = await service.compileNanobananaPrompt(tc.subject, tc.modifiers);
            console.log(`Result: "${result}"`);

            // Check for common injections
            const commonInjections = ['photorealistic', 'masterpiece', '8k', 'trending', 'artstation', 'hyper-detailed', 'intricate', 'cinematic', 'pop art', 'whimsical'];
            const found = commonInjections.filter(inj => result.toLowerCase().includes(inj));
            if (found.length > 0) {
                console.log(`POTENTIAL INJECTION DETECTED: ${found.join(', ')}`);
            } else {
                console.log(`Clean result.`);
            }
        } catch (error: any) {
            console.error('FAILED:', error.message);
        }
    }

    console.log("--- Testing enhancePrompt ---");
    try {
        const enhResult = await service.enhancePrompt('A woman walking down the street');
        console.log(`Original: "A woman walking down the street"`);
        console.log(`Enhanced: "${enhResult}"`);
    } catch (e: any) {
        console.error(e.message);
    }
}

testInjection();
