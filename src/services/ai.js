const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Using a fast model

const SYSTEM_PROMPT = `
You are a smart research assistant and browser interface.
You have control over the browser.
Your goal is to help the user navigate, research topics, and manage notes.

User inputs might be voice audio or typed text.

Determine if the user wants to:
1. NAVIGATE to a website.
2. SAVE_SOURCE (e.g. "save this page", "add to sources").
3. SAVE_CITATION (e.g. "save this quote", "cite this").
4. CREATE_NOTE (e.g. "note that...", "write down...").
5. ANSWER a question or CHAT.

You must ALWAYS return a valid JSON object.
Format:
{
  "type": "NAVIGATE" | "SAVE_SOURCE" | "SAVE_CITATION" | "CREATE_NOTE" | "ANSWER",
  "payload": object,
  "response": string
}

Payload Structures:
- SAVE_SOURCE: { "url": "URL", "title": "TITLE", "summary": "Short summary", "tags": ["supporting"|"opposing"|"neutral", "other_tags"], "workspaceId": "ID_FROM_CONTEXT" }
- SAVE_CITATION: { "content": "QUOTE", "sourceUrl": "URL", "citationStyle": "APA", "workspaceId": "ID_FROM_CONTEXT" }
- CREATE_NOTE: { "content": "NOTE_TEXT", "workspaceId": "ID_FROM_CONTEXT" }
- NAVIGATE: "url_string"

Argument Tagging:
- Analyze the content/context. Determine if it likely SUPPORTS, OPPOSES, or is NEUTRAL to the user's research topic (if known, otherwise guess based on content sentiment/bias). Always add one of these tags.


Examples:
- "Save this page" -> { "type": "SAVE_SOURCE", "payload": { "needs_context": true }, "response": "Saving source..." }
  (Note: The Main process will check 'needs_context' and inject current URL/Title if missing)

For now, if you don't have the current page URL/Title, just return the intent and I will handle it in the app logic, OR assume the user provided it.
Actually, better approach: The system will provide context.
`;

async function processPrompt(input) {
    try {
        const parts = [{ text: SYSTEM_PROMPT }];

        // Input handling
        let userPart;
        if (typeof input === 'string') {
            userPart = { text: input };
        } else if (input.audio) {
            userPart = {
                inlineData: {
                    mimeType: "audio/webm",
                    data: input.audio
                }
            };
        } else if (input.context) {
            // If we passed context (url, title, selection)
            userPart = { text: `Context: ${JSON.stringify(input.context)}\nUser: ${input.text || "Process context"}` };
        }

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Understood. Ready for research.' }] }
            ]
        });

        const result = await chat.sendMessage([userPart]);
        const responseText = result.response.text();

        // Parse JSON
        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        try {
            return JSON.parse(cleanText);
        } catch (e) {
            console.warn('Non-JSON response:', cleanText);
            return {
                type: 'ANSWER',
                payload: null,
                response: responseText
            };
        }

    } catch (error) {
        console.error('AI Processing Error:', error);
        return {
            type: 'ANSWER',
            payload: null,
            response: "I couldn't process that."
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
