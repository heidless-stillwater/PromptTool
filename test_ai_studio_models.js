const { GoogleGenAI } = require('@google/genai');

async function test() {
    try {
        // I'll use the API key from the environment if available
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY not set in environment');
            return;
        }

        const client = new GoogleGenAI({ apiKey });
        console.log('Listing models available via API Key...');
        const models = await client.models.list();
        for (const model of models.models) {
            if (model.name.includes('veo')) {
                console.log('FOUND VEO:', model.name);
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
