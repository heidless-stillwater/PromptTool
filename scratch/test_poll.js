const { v1beta1 } = require('@google-cloud/aiplatform');

async function testPoll() {
    const location = 'us-central1';
    const operationName = 'projects/heidless-apps-2/locations/us-central1/publishers/google/models/veo-2.0-generate-001/operations/0069c5be-fb2d-4476-9e20-86a55f35b620';
    
    const clientOptions = {
        apiEndpoint: `${location}-aiplatform.googleapis.com`,
    };
    
    const client = new v1beta1.ModelServiceClient(clientOptions);
    
    try {
        console.log(`Polling operation: ${operationName}`);
        const [operation] = await client.operationsClient.getOperation({ name: operationName });
        console.log('Operation status:', JSON.stringify(operation, null, 2));
    } catch (err) {
        console.error('Polling failed:', err);
    }
}

testPoll();
