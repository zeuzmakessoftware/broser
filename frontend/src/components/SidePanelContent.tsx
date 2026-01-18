import { useState, useEffect } from 'react';
import { useBrowserAPI } from '../hooks/useBrowserAPI';
import { ResearchPanel } from './ResearchPanel';
import { Upload, Globe } from 'lucide-react';

export function SidePanelContent({ mode }: { mode: 'notes' | 'chat' | 'settings' | 'research' }) {
    const api = useBrowserAPI();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Context & Chat State (Merged)
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [context, setContext] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (mode === 'notes') {
            loadNotes();
        }
    }, [mode]);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const res = await api.db.getNotes();
            if (Array.isArray(res)) {
                setNotes(res);
                // Auto-add notes to context
                const notesText = res.map(n => n.content).join('\n---\n');
                setContext(prev => prev + "\n" + notesText);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setMessages(prev => [...prev, { role: 'user', content: `Uploaded ${file.name}` }]);
        try {
            const text = await file.text();
            setContext(prev => prev + "\n" + text);
            // Summarize
            // We need to implement ai.summarize in preload or use ai.chat?
            // Preload has ai.summarize.
            const res = await api.ai.summarize(text);
            const summary = (res as any).summary || res; // depending on backend return
            setMessages(prev => [...prev, { role: 'assistant', content: `Summary of ${file.name}:\n${summary}` }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'assistant', content: "Failed to read/summarize file." }]);
        }
    };

    const handleSummarizePage = async () => {
        const webview = document.getElementById('main-webview') as any;
        if (!webview) return;

        setMessages(prev => [...prev, { role: 'user', content: "Summarize this page" }]);
        try {
            // We can't use executeJavaScript directly if contextIsolation is on, but here it is off.
            const text = await webview.executeJavaScript('document.body.innerText');
            setContext(prev => prev + "\n" + text);
            const res = await api.ai.summarize(text);
            const summary = (res as any).summary || res;
            setMessages(prev => [...prev, { role: 'assistant', content: summary }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Failed to access page content." }]);
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;
        const text = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: text }]);

        try {
            // Use chaiNotes for robust Q&A, or ai.chat with context
            // Plan said ai:chat-notes
            const res = await api.ai.chatNotes(text, context);
            setMessages(prev => [...prev, { role: 'assistant', content: res.response || "No response" }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Error communicating with AI." }]);
        }
    };

    if (mode === 'notes' || mode === 'chat') {
        // Merging chat into notes view, or just keeping them similar.
        // If mode is 'chat', maybe show only chat?
        // User asked "in the notes and task section there shoul be a chat bot"
        // So let's render the combined view for 'notes'.

        const showChat = !isExpanded;

        return (
            <div className="flex flex-col h-full text-white">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Notes & Assistant</h2>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-white">
                        {isExpanded ? <Globe size={16} /> : <Upload size={16} className="rotate-90" />} {/* Icons symbolic */}
                    </button>
                </div>

                {/* Notes List */}
                <div className={`flex-1 overflow-y-auto space-y-2 mb-4 transition-all duration-300 ${showChat ? 'h-1/2' : 'h-full'}`}>
                    {loading ? <div>Loading...</div> : (
                        <>
                            {notes.length === 0 && <div className="text-gray-500 text-sm">No notes found.</div>}
                            {notes.map((n, i) => (
                                <div key={i} className="bg-white/5 p-2 rounded text-sm whitespace-pre-wrap">{n.content}</div>
                            ))}
                        </>
                    )}
                </div>

                {/* Chat Interface */}
                {showChat && (
                    <div className="h-1/2 flex flex-col border-t border-white/10 pt-2">
                        <div className="flex-1 overflow-y-auto space-y-3 mb-2 p-2 bg-black/20 rounded">
                            {messages.length === 0 && <div className="text-gray-500 text-xs text-center">Ask questions about your notes or upload files...</div>}
                            {messages.map((m, i) => (
                                <div key={i} className={m.role === 'user' ? "text-right" : "text-left"}>
                                    <div className={`inline-block p-2 rounded-lg text-sm max-w-[90%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 mb-2">
                            <label className="cursor-pointer bg-white/10 p-1.5 rounded hover:bg-white/20 text-gray-400 hover:text-white transition-colors" title="Upload File">
                                <input type="file" className="hidden" onChange={handleFileUpload} />
                                <Upload size={16} />
                            </label>
                            <button onClick={handleSummarizePage} className="bg-white/10 p-1.5 rounded hover:bg-white/20 text-gray-400 hover:text-white transition-colors" title="Summarize Page">
                                <Globe size={16} />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-white/10 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                placeholder="Ask about notes..."
                            />
                            <button onClick={sendMessage} className="bg-blue-600 px-3 py-1 rounded text-sm">Send</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (mode === 'research') {
        return <ResearchPanel />;
    }

    return <div className="text-white">Settings</div>;
}
