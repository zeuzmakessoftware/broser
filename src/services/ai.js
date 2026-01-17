const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Using a fast model

const SYSTEM_PROMPT = `
You are a smart browser assistant.
You have control over the browser.
Your goal is to help the user navigate, manage tasks, and answer questions.

User inputs might be voice audio or typed text.

Determine if the user wants to:
1. NAVIGATE to a website.
2. CREATE_TASK (e.g. "remind me to...", "add task...").
3. CREATE_NOTE (e.g. "note that...", "save note...").
4. ANSWER a question or CHAT.

You must ALWAYS return a valid JSON object. Do not return any other text.
Format:
{
  "type": "NAVIGATE" | "CREATE_TASK" | "CREATE_NOTE" | "ANSWER",
  "payload": string | object,
  "response": string (short spoken response)
}

Examples:
- "Go to youtube" -> { "type": "NAVIGATE", "payload": "https://youtube.com", "response": "Opening YouTube." }
- "Remind me to buy milk" -> { "type": "CREATE_TASK", "payload": { "title": "Buy milk" }, "response": "I've added that to your tasks." }
- "What is the capital of France?" -> { "type": "ANSWER", "payload": null, "response": "The capital of France is Paris." }
`;

async function processPrompt(input) {
    try {
        const parts = [{ text: SYSTEM_PROMPT }];

        let userPart;
        if (typeof input === 'string') {
            userPart = { text: input };
        } else if (input.audio) {
            // content is base64 string
            userPart = {
                inlineData: {
                    mimeType: "audio/webm", // Match MediaRecorder output
                    data: input.audio
                }
            };
        }

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Understood. I am ready to assist.' }] }
            ]
        });

        const result = await chat.sendMessage([userPart]);
        const responseText = result.response.text();

        // Parse JSON from response
        // Gemini might wrap in markdown code blocks ```json ... ```
        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        // Sometimes Gemini might add extra text outside json, crude extraction:
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        try {
            return JSON.parse(cleanText);
        } catch (e) {
            console.warn('Non-JSON response received:', cleanText);
            // Fallback
            return {
                type: 'ANSWER',
                payload: null,
                response: responseText // Just speak the raw text if json fails
            };
        }

    } catch (error) {
        console.error('AI Processing Error:', error);
        return {
            type: 'ANSWER',
            payload: null,
            response: "I'm sorry, I couldn't process that request."
        };
    }
}

async function processChatWithContext(query, contextNotes) {
    try {
        // Construct a context-aware prompt
        const initialPrompt = `You are a helpful assistant. Here is some context from my notes:\n${contextNotes}\n\nAnswer my questions based on this context. If the answer is not in the notes, say so, but try to be helpful.`;

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: initialPrompt }] },
                { role: 'model', parts: [{ text: 'Understood. I will answer based on your notes.' }] }
            ]
        });

        const result = await chat.sendMessage(query);
        return {
            response: result.response.text()
        };

    } catch (error) {
        console.error('AI Chat Context Error:', error);
        return {
            response: "I'm sorry, I encountered an error analyzing your notes."
        };
    }
}

async function summarizeContent(text) {
    try {
        const prompt = `Summarize the following text concisely in bullet points:\n\n${text}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return {
            summary: response.text()
        };
    } catch (error) {
        console.error('AI Summarize Error:', error);
        return {
            summary: "I couldn't generate a summary for this content."
        };
    }
}

module.exports = { processPrompt, processChatWithContext, summarizeContent };
