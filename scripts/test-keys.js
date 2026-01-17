require('dotenv').config();
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

async function testKeys() {
    console.log('--- Broser API Key Validation Info ---');

    // 1. Test MongoDB
    console.log('\n[1/3] Testing MongoDB...');
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing in .env');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connection Successful');
        console.log(`   Connected to: ${mongoose.connection.host}`);
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ MongoDB Failed:', err.message);
    }

    // 2. Test Gemini
    console.log('\n[2/3] Testing Google Gemini API...');
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is missing in .env');
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use a lightweight model for testing
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const result = await model.generateContent("Hello, are you there?");
        const response = result.response.text();

        if (response) {
            console.log('✅ Gemini API Valid');
            console.log(`   Response: "${response.trim().substring(0, 50)}..."`);
        } else {
            throw new Error('Empty response from Gemini');
        }
    } catch (err) {
        console.error('❌ Gemini API Failed:', err.message);
    }

    // 3. Test ElevenLabs
    console.log('\n[3/3] Testing ElevenLabs API...');
    try {
        if (!process.env.ELEVENLABS_API_KEY) {
            throw new Error('ELEVENLABS_API_KEY is missing in .env');
        }
        const client = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });

        // Lightweight call: Get Models or User Info
        const models = await client.models.list();

        if (models && models.length > 0) {
            console.log('✅ ElevenLabs API Valid');
            console.log(`   Found ${models.length} available models.`);
            console.log(`   Example: ${models[0].name} (${models[0].model_id})`);
        } else {
            console.warn('⚠️ ElevenLabs Connected but no models returned.');
        }

    } catch (err) {
        console.error('❌ ElevenLabs API Failed:', err.message);
    }

    console.log('\n--- End of Test ---');
    process.exit(0);
}

testKeys();
