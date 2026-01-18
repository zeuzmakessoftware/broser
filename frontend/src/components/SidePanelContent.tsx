import { useState, useEffect } from 'react';
import { useBrowserAPI } from '../hooks/useBrowserAPI';
import { ResearchPanel } from './ResearchPanel';
import { Upload, Globe, BookOpen, School, Brain } from 'lucide-react';

export function SidePanelContent({ mode }: { mode: 'notes' | 'chat' | 'settings' | 'research' }) {
    const api = useBrowserAPI();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Context & Chat State (Merged)
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [context, setContext] = useState('');

    // Study Mode State
    const [studyMode, setStudyMode] = useState<'none' | 'summary' | 'quiz' | 'flashcards'>('none');
    const [studyData, setStudyData] = useState<any>(null);
    const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({});
    const [showQuizResult, setShowQuizResult] = useState(false);
    const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

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

    const handleGenerateStudyMaterials = async () => {
        setLoading(true);
        const webview = document.getElementById('main-webview') as any;
        if (!webview) {
            setLoading(false);
            return;
        }

        try {
            const text = await webview.executeJavaScript('document.body.innerText');
            const data = await api.ai.generateStudyMaterials(text);
            setStudyData(data);
            setStudyMode('summary'); // Start with summary
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleStudyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const text = await file.text();
            const data = await api.ai.generateStudyMaterials(text);
            setStudyData(data);
            setStudyMode('summary');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (mode === 'notes') {
        return (
            <div className="flex flex-col h-full text-white">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Notes & Study</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerateStudyMaterials}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                            <School size={12} />
                            Study This Page
                        </button>
                        <label className="bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white cursor-pointer px-2 py-1 rounded flex items-center gap-1 transition-colors" title="Upload Study Material">
                            <input type="file" className="hidden" accept=".txt,.md,.json" onChange={handleStudyFileUpload} />
                            <Upload size={12} />
                        </label>
                    </div>
                </div>

                {studyData && (
                    <div className="flex gap-2 mb-4 text-xs">
                        <button
                            onClick={() => setStudyMode('summary')}
                            className={`flex-1 p-2 rounded flex items-center justify-center gap-1 ${studyMode === 'summary' ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'}`}
                        >
                            <BookOpen size={12} /> Summary
                        </button>
                        <button
                            onClick={() => setStudyMode('quiz')}
                            className={`flex-1 p-2 rounded flex items-center justify-center gap-1 ${studyMode === 'quiz' ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'}`}
                        >
                            <Brain size={12} /> Quiz
                        </button>
                        <button
                            onClick={() => setStudyMode('flashcards')}
                            className={`flex-1 p-2 rounded flex items-center justify-center gap-1 ${studyMode === 'flashcards' ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'}`}
                        >
                            <School size={12} /> Flashcards
                        </button>
                    </div>
                )
                }

                <div className="flex-1 overflow-y-auto space-y-2 mb-4 h-full custom-scrollbar">
                    {loading && <div className="text-center p-4">Generating study materials... <br /><span className="text-xs text-gray-400">This may take a moment.</span></div>}

                    {!loading && studyMode === 'none' && (
                        <>
                            {notes.length === 0 && <div className="text-gray-500 text-sm">No notes found.</div>}
                            {notes.map((n, i) => (
                                <div key={i} className="bg-white/5 p-2 rounded text-sm whitespace-pre-wrap">{n.content}</div>
                            ))}
                        </>
                    )}

                    {!loading && studyMode === 'summary' && studyData?.summary && (
                        <div className="bg-white/5 p-4 rounded text-sm whitespace-pre-wrap leading-relaxed">
                            <h3 className="font-bold mb-2 text-purple-300">Summary</h3>
                            {studyData.summary}
                        </div>
                    )}

                    {!loading && studyMode === 'quiz' && studyData?.quiz && (
                        <div className="space-y-4">
                            {studyData.quiz.map((q: any, i: number) => (
                                <div key={i} className="bg-white/5 p-4 rounded text-sm">
                                    <h4 className="font-bold mb-2">{i + 1}. {q.question}</h4>
                                    <div className="space-y-1">
                                        {q.options.map((opt: string, optIndex: number) => {
                                            const isSelected = quizAnswers[i] === opt;
                                            const isCorrect = opt === q.correctAnswer;
                                            let bgClass = "bg-white/5 hover:bg-white/10";

                                            if (showQuizResult) {
                                                if (isCorrect) bgClass = "bg-green-500/20 border border-green-500";
                                                else if (isSelected && !isCorrect) bgClass = "bg-red-500/20 border border-red-500";
                                            } else if (isSelected) {
                                                bgClass = "bg-purple-600";
                                            }

                                            return (
                                                <button
                                                    key={optIndex}
                                                    onClick={() => !showQuizResult && setQuizAnswers(prev => ({ ...prev, [i]: opt }))}
                                                    className={`w-full text-left p-2 rounded transition-colors ${bgClass}`}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => setShowQuizResult(!showQuizResult)}
                                className="w-full bg-purple-600 p-2 rounded font-bold hover:bg-purple-700 transition-colors"
                            >
                                {showQuizResult ? "Hide Results" : "Check Answers"}
                            </button>
                        </div>
                    )}

                    {!loading && studyMode === 'flashcards' && studyData?.flashcards && studyData.flashcards.length > 0 && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                            <div
                                onClick={() => setIsFlipped(!isFlipped)}
                                className="w-full max-w-sm h-64 perspective-1000 cursor-pointer"
                            >
                                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                    {/* Front */}
                                    <div className={`absolute w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl p-6 flex flex-col items-center justify-center text-center backface-hidden shadow-xl border border-white/10 ${isFlipped ? 'hidden' : ''}`}>
                                        <h3 className="text-sm uppercase tracking-widest text-purple-300 mb-4">Term</h3>
                                        <p className="text-xl font-bold">{studyData.flashcards[currentFlashcardIndex].front}</p>
                                        <p className="absolute bottom-4 text-xs text-gray-400">Click to flip</p>
                                    </div>

                                    {/* Back */}
                                    <div className={`absolute w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 shadow-xl border border-white/10 ${!isFlipped ? 'hidden' : ''}`} style={{ transform: 'rotateY(180deg)' }}>
                                        <h3 className="text-sm uppercase tracking-widest text-green-300 mb-4">Definition</h3>
                                        <p className="text-lg">{studyData.flashcards[currentFlashcardIndex].back}</p>
                                        <p className="absolute bottom-4 text-xs text-gray-400">Click to flip back</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-8">
                                <button
                                    onClick={() => {
                                        setIsFlipped(false);
                                        setCurrentFlashcardIndex(prev => Math.max(0, prev - 1));
                                    }}
                                    disabled={currentFlashcardIndex === 0}
                                    className="p-2 rounded-full bg-white/10 disabled:opacity-50 hover:bg-white/20"
                                >
                                    ← Prev
                                </button>
                                <span className="text-sm font-mono">
                                    {currentFlashcardIndex + 1} / {studyData.flashcards.length}
                                </span>
                                <button
                                    onClick={() => {
                                        setIsFlipped(false);
                                        setCurrentFlashcardIndex(prev => Math.min(studyData.flashcards.length - 1, prev + 1));
                                    }}
                                    disabled={currentFlashcardIndex === studyData.flashcards.length - 1}
                                    className="p-2 rounded-full bg-white/10 disabled:opacity-50 hover:bg-white/20"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div >
        );
    }

    if (mode === 'chat') {
        return (
            <div className="flex flex-col h-full text-white">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">AI Assistant</h2>
                </div>

                {/* Chat Interface */}
                <div className="flex-1 flex flex-col h-full">
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
                            placeholder="Ask AI..."
                        />
                        <button onClick={sendMessage} className="bg-blue-600 px-3 py-1 rounded text-sm">Send</button>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'research') {
        return <ResearchPanel />;
    }

    return <div className="text-white">Settings</div>;
}
