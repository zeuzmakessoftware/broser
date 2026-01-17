require('dotenv').config();
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

async function probe() {
    try {
        const client = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });

        console.log('Client keys:', Object.keys(client));
        if (client.models) {
            console.log('client.models keys:', Object.keys(client.models));
            console.log('client.models prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.models)));
        } else {
            console.log('client.models is undefined');
        }

    } catch (err) {
        console.error('Probe failed:', err);
    }
}

probe();
