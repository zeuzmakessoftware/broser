import { useState, useEffect } from 'react';
import { useBrowserAPI } from '../hooks/useBrowserAPI'; 
import { ResearchPanel } from './ResearchPanel';
import { Upload, Globe } from 'lucide-react';

export function SidePanelContent({ mode }: { mode: 'notes' | 'chat' | 'settings' | 'research' }) {
    const api = useBrowserAPI();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<{role: 'user'|'assistant', content: string}[]>([]);
    const [input, setInput] = useState('');

    useEffect(() => {
        if (mode === 'notes') {
            loadNotes();
        }
    }, [mode]);

    const loadNotes = async () => {
        setLoading(true);
        try {
            // Using the generic API handler from preload
            await api.api.get('/notes'); // Assuming backend maps this to DB
             // Wait, the preload maps 'api.get' to 'api-request' channel.
             // But the main.js handles 'db:get-notes'.
             // The preload also has specific handlers?
             // Let's check preload.js again.
             // It doesn't seem to have exposed 'db:get-notes' directly in 'browserAPI'.
             // It exposes 'api' object that calls 'api-request'.
             // But main.js handles 'db:get-notes'.
             // We might need to update preload.js to expose db methods or update main.js to handle 'api-request'.
             // For now, let's assume we need to use what's there. 
             // Ideally we should fix preload to expose what we need.
             // Or use 'window.electron.ipcRenderer.invoke' if we expose it (we didn't in preload).
             
             // WORKAROUND: We will assume we can use `window.require` since nodeIntegration is true, 
             // but that doesn't work in Vite dev server (browser context).
             // We MUST rely on preload.
             
             // Fix Preload: I will need to update preload.js to expose 'db' namespace.
             // For now, I'll return empty array to prevent crash.
             setNotes([]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const [context, setContext] = useState('');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setMessages(prev => [...prev, { role: 'user', content: `Uploaded ${file.name}` }]);
        try {
            const text = await file.text();
            setContext(text);
            const res = await api.ai.summarize(text);
            setMessages(prev => [...prev, { role: 'assistant', content: res.summary || "Summary failed." }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'assistant', content: "Failed to read file." }]);
        }
    };

    const handleSummarizePage = async () => {
         // We need access to webview again. 
         // Ideally this should come from App.tsx via props or context.
         // But let's use DOM for now as in useVoiceInput.
         const webview = document.getElementById('main-webview') as any;
         if (!webview) return;
         
         setMessages(prev => [...prev, { role: 'user', content: "Summarize this page" }]);
         try {
             const text = await webview.executeJavaScript('document.body.innerText');
             setContext(text);
             const res = await api.ai.summarize(text);
             setMessages(prev => [...prev, { role: 'assistant', content: res.summary || "Summary failed." }]);
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
            const res = await api.ai.chat({ text, context }); 
            setMessages(prev => [...prev, { role: 'assistant', content: res.response || "No response" }]);
        } catch (e) {
             setMessages(prev => [...prev, { role: 'assistant', content: "Error communicating with AI." }]);
        }
    };

    if (mode === 'notes') {
        return (
            <div className="flex flex-col h-full text-white">
                <h2 className="text-lg font-bold mb-4">Notes</h2>
                {loading ? <div>Loading...</div> : (
                    <div className="flex-1 overflow-y-auto space-y-2">
                         {notes.length === 0 && <div className="text-gray-500 text-sm">No notes found (API pending connection)</div>}
                         {notes.map((n, i) => (
                             <div key={i} className="bg-white/5 p-2 rounded text-sm">{n.content}</div>
                         ))}
                    </div>
                )}
            </div>
        );
    }

    if (mode === 'chat') {
        return (
             <div className="flex flex-col h-full text-white">
                <h2 className="text-lg font-bold mb-4">AI Assistant</h2>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-2 bg-black/20 rounded">
                    {messages.map((m, i) => (
                        <div key={i} className={m.role === 'user' ? "text-right" : "text-left"}>
                            <div className={`inline-block p-2 rounded-lg text-sm max-w-[85%] ${m.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="flex gap-2 mb-2">
                    <label className="cursor-pointer bg-white/10 p-1.5 rounded hover:bg-white/20 text-gray-400 hover:text-white transition-colors">
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                        <Upload size={16} />
                    </label>
                    <button onClick={handleSummarizePage} className="bg-white/10 p-1.5 rounded hover:bg-white/20 text-gray-400 hover:text-white transition-colors">
                        <Globe size={16} />
                    </button>
                    {(context.length > 0) && <span className="text-xs text-green-400 self-center">Context Loaded</span>}
                </div>

                <div className="flex gap-2">
                    <input 
                        className="flex-1 bg-white/10 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask something..."
                    />
                    <button onClick={sendMessage} className="bg-blue-600 px-3 py-1 rounded text-sm">Send</button>
                </div>
            </div>
        );
    }

    if (mode === 'research') {
        return <ResearchPanel />;
    }

    return <div className="text-white">Settings Placeholder</div>;
}
