import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

export const streamAudio = async (text: string): Promise<string | null> => {
    try {
        console.log('Starting ElevenLabs request for text:', text.substring(0, 50) + '...');
        const audioStream = await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
            text: text,
            modelId: "eleven_turbo_v2", 
            outputFormat: "mp3_44100_128",
        });

        const chunks: Buffer[] = [];
        for await (const chunk of audioStream) {
            chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        console.log(`Audio buffered successfully. Size: ${buffer.length} bytes`);
        return buffer.toString('base64');

    } catch (error) {
        console.error('ElevenLabs Error:', error);
        return null;
    }
}


