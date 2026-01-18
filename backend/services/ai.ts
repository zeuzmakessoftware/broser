import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const SYSTEM_PROMPT = `
You are a smart research assistant and browser interface.
You have control over the browser.
Your goal is to help the user navigate, research topics, and manage notes.
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
}`;

export const processPrompt = async (input: string | { audio?: string; context?: any; text?: string }) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let userPart: any;
        
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const processChatWithContext = async (query: string, contextNotes: string) => {
    try {
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

export const summarizeContent = async (text: string) => {
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



