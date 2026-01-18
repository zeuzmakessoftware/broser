import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const SYSTEM_PROMPT = `
You are a smart research assistant and browser interface.
You have control over the browser.
Your goal is to help the user navigate, research topics, and manage notes.
Determine if the user wants to:
1. NAVIGATE to a website.
2. RESEARCH a topic (e.g. "research New Deal", "help me write a paper on X").
3. SAVE_SOURCE (e.g. "save this page", "add to sources").
4. SAVE_CITATION (e.g. "save this quote", "cite this").
5. CREATE_NOTE (e.g. "note that...", "write down...").
6. ANSWER a question or CHAT.

You must ALWAYS return a valid JSON object.

Format:
{
  "type": "NAVIGATE" | "RESEARCH" | "SAVE_SOURCE" | "SAVE_CITATION" | "CREATE_NOTE" | "ANSWER" | "MULTI_ACTION",
  "payload": object | any,
  "response": string
}

Payload Schemas:
- NAVIGATE: { "url": string }
- RESEARCH: { "topic": string, "queries": string[] } (queries to search on Google)
- SAVE_SOURCE: { "url": string, "title": string, "workspaceId": string, "summary"?: string, "tags"?: string[], "mlaCitation"?: string }
- SAVE_CITATION: { "sourceUrl": string, "content": string, "workspaceId": string }
- CREATE_NOTE: { "content": string, "workspaceId": string }
- MULTI_ACTION: { "actions": [{ "type": string, "payload": object }] }
- ANSWER: null
`;

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
        } else if (input.text) {
            userPart = { text: input.text };
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

export const generateStudyMaterials = async (text: string) => {
    try {
        // 1. Check if N8N Webhook is configured
        if (process.env.N8N_WEBHOOK_URL) {
            console.log('Using n8n webhook for study materials');
            const response = await fetch(process.env.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            return await response.json();
        }

        // 2. Fallback to Gemini
        console.log('Using Gemini for study materials');
        const prompt = `
        Analyze the following text and generate study materials.
        Return a valid JSON object with the following structure:
        {
            "summary": "A concise summary of the key points as bullet points",
            "quiz": [
                {
                    "question": "Question text",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswer": "The correct option text"
                }
            ],
            "flashcards": [
                {
                    "front": "Concept or term",
                    "back": "Definition or explanation"
                }
            ]
        }
        
        Text to analyze:
        ${text.substring(0, 15000)} // Limit context window
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON
        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(cleanText);

    } catch (error) {
        console.error('Error generating study materials:', error);
        return {
            summary: "Error generating study materials.",
            quiz: [],
            flashcards: []
        };
    }
}

export const generateMoreQuizQuestions = async (text: string, existingQuestions: any[]) => {
    try {
        const existingQuestionsText = existingQuestions.map((q: any) => q.question).join('\n');

        const prompt = `
        Analyze the following text and generate 5 NEW quiz questions that are different from the existing questions.
        
        Existing Questions:
        ${existingQuestionsText}

        Return a valid JSON object with the following structure:
        {
            "quiz": [
                {
                    "question": "Question text",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswer": "The correct option text"
                }
            ]
        }
        
        Text to analyze:
        ${text.substring(0, 15000)}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(cleanText);

    } catch (error) {
        console.error('Error generating more quiz questions:', error);
        return {
            quiz: []
        };
    }
}

export const generateMoreFlashcards = async (text: string, existingFlashcards: any[]) => {
    try {
        const existingTerms = existingFlashcards.map((f: any) => f.front).join(', ');

        const prompt = `
        Analyze the following text and generate 5 NEW flashcards that are different from the existing terms.
        
        Existing Terms:
        ${existingTerms}

        Return a valid JSON object with the following structure:
        {
            "flashcards": [
                {
                    "front": "Concept or term",
                    "back": "Definition or explanation"
                }
            ]
        }
        
        Text to analyze:
        ${text.substring(0, 15000)}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(cleanText);
    } catch (error) {
        console.error('Error generating more flashcards:', error);
        return { flashcards: [] };
    }
}

export const analyzeSource = async (text: string, topic: string) => {
    try {
        const prompt = `
        Analyze the following text in the context of the research topic: "${topic}".
        Determine if the source is SUPPORTING, OPPOSING, or NEUTRAL regarding the topic.
        Also provide a very brief 1-sentence summary.
        
        Return JSON:
        {
            "tag": "supporting" | "opposing" | "neutral",
            "summary": "Brief summary"
        }

        Text:
        ${text.substring(0, 10000)}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(cleanText);
    } catch (error) {
        console.error('Error analyzing source:', error);
        return { tag: 'neutral', summary: 'Could not analyze.' };
    }
}
