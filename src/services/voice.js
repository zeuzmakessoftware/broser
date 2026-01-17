const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js'); // Import the client
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Initialize client
const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

async function streamAudio(text) {
    try {
        // Generate audio stream
        console.log('Starting ElevenLabs request for text:', text.substring(0, 50) + '...');
        const audioStream = await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
            text: text,
            model_id: "eleven_turbo_v2", // Low latency model
            output_format: "mp3_44100_128",
        });

        // Create a buffer from the stream
        const chunks = [];
        // Ensure compatibility if it's a standard stream or web stream
        for await (const chunk of audioStream) {
            chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        console.log(`Audio buffered successfully. Size: ${buffer.length} bytes`);

        // Return base64 string for easy frontend playback
        return buffer.toString('base64');

    } catch (error) {
        console.error('ElevenLabs Error:', error);
        return null;
    }
}

module.exports = { streamAudio };
