
const testLongPrompt = async () => {
    console.log('Testing prompt length limit (Target: 900)...');

    // Create a prompt that is roughly 600 characters
    const longPrompt = "A futuristic city at night, ".repeat(20) + "Neon lights, rain, cyberpunk aesthetic, high detail, masterpiece.";
    console.log(`Prompt length: ${longPrompt.length}`);

    try {
        const response = await fetch('http://localhost:3000/api/generate/enhance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Note: This will fail if not authenticated in a real browser, 
                // but we can check if it gets past the 400 validation for length.
            },
            body: JSON.stringify({ prompt: longPrompt }),
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', data);

        if (response.status === 401 || response.status === 200) {
            console.log('✅ SUCCESS: Request accepted (or blocked by auth, not length)');
        } else if (response.status === 400 && data.error.includes('max 900')) {
            console.log('❌ FAILED: Still blocked by 900 limit (if expected to pass)');
        } else if (response.status === 400 && data.error.includes('max 500')) {
            console.log('❌ FAILED: Still blocked by OLD 500 limit');
        }
    } catch (err) {
        console.error('Error:', err);
    }
};

testLongPrompt();
