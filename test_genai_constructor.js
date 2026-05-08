const { GoogleGenAI } = require('@google-cloud/aiplatform'); // Wait, no, it's @google/genai
const { GoogleGenAI: GenAI } = require('@google/genai');

async function test() {
    try {
        const client = new GenAI({
            vertexai: true,
            project: 'heidless-apps-2',
            location: 'us-central1'
        });
        
        console.log('Client created successfully');
        console.log('Has models:', !!client.models);
        console.log('Has generateVideos:', typeof client.models.generateVideos === 'function');
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
