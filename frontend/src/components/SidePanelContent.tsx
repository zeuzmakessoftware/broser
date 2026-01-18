import { useState, useEffect, useRef } from 'react';
import { useBrowserAPI } from '../hooks/useBrowserAPI';
import { ResearchPanel } from './ResearchPanel';
import { Upload, Globe, BookOpen, School, Brain, Sparkles, Copy, Check, Youtube, Maximize2, Minimize2, X, Clock, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceRecorder } from './VoiceRecorder';

// Define Tool Call Types
interface ToolCall {
    id: string;
    type: 'NAVIGATE' | 'RESEARCH';
    payload: any;
    status: 'pending' | 'approved' | 'denied' | 'executed';
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isSummary?: boolean;
    toolCall?: ToolCall;
}

export function SidePanelContent({
    mode,
    expansionMode = 'compact',
    onToggleExpand,
    onOpenTabs,
    onClose,
    onNavigate,
    pendingAIResponse,
    onResponseProcessed,
    onSwitchMode,
    researchContext,
    onSetResearchContext,
    initialChatQuery,
    onClearInitialChatQuery
}: {
    mode: 'notes' | 'chat' | 'settings' | 'research' | 'history',
    expansionMode?: 'compact' | 'half' | 'full',
    onToggleExpand?: () => void,
    onOpenTabs?: (urls: string[]) => void,
    onClose?: () => void,
    onNavigate?: (url: string) => void,
    pendingAIResponse?: any,
    onResponseProcessed?: () => void,
    onSwitchMode?: (mode: 'notes' | 'chat' | 'settings' | 'research' | 'history' | null) => void,
    researchContext?: any,
    onSetResearchContext?: (ctx: any) => void,
    initialChatQuery?: string | null,
    onClearInitialChatQuery?: () => void
}) {
    const api = useBrowserAPI();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Context & Chat State (Merged)
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [context, setContext] = useState('');
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Voice & Audio State
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [captionText, setCaptionText] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    // Handle Initial Query (from Ask AI context menu)
    useEffect(() => {
        if (initialChatQuery && onClearInitialChatQuery) {
            setInput(initialChatQuery);
            onClearInitialChatQuery();
        }
    }, [initialChatQuery, onClearInitialChatQuery]);


    // We also store tool calls in messages to show history, but pendingToolCall tracks active modal/blocking state if we wanted that (or just rely on message state)
    // Actually, sticking to message-based state for the UI cards is better. The `sendMessage` loop will handle the "pause".


    // Line 78 was: const lastProcessedResponseRef = useRef<any>(null);
    // I need to start insertion around line 76 or so.
    // Let's just add the state.

    // Study Mode State
    const [studyMode, setStudyMode] = useState<'none' | 'summary' | 'quiz' | 'flashcards'>('none');
    const [studyData, setStudyData] = useState<any>(null);
    const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({});
    const [showQuizResult, setShowQuizResult] = useState(false);
    const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showPastNotes, setShowPastNotes] = useState(false); // New State
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastProcessedResponseRef = useRef<any>(null);

    // History State
    const [history, setHistory] = useState<any[]>([]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const h = await api.db.getHistory();
            setHistory(h || []);
        } catch {
             setHistory([
                 { title: "Google", url: "https://google.com", timestamp: Date.now() },
                 { title: "React Docs", url: "https://react.dev", timestamp: Date.now() - 100000 }
             ]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (mode === 'history') {
           loadHistory();
        }
    }, [mode]);

    const scrollToBottom = () => {
        // Use scrollTop on container instead of scrollIntoView to prevent window jump
        if (chatContainerRef.current) {
            const { scrollHeight, clientHeight } = chatContainerRef.current;
            chatContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (mode === 'chat') {
            scrollToBottom();
        }
    }, [messages, mode]);

    // Handle Pending AI Response from Parent (Voice)
    // Handle Pending AI Response from Parent (Voice)
    useEffect(() => {
        if (pendingAIResponse && onResponseProcessed && pendingAIResponse !== lastProcessedResponseRef.current) {
            lastProcessedResponseRef.current = pendingAIResponse;
            setMessages(prev => [...prev, { role: 'user', content: "🎤 Voice Command" }]);
            processAIResponse(pendingAIResponse);
            onResponseProcessed();
        }
    }, [pendingAIResponse, onResponseProcessed]);

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
            setMessages(prev => [...prev, { role: 'assistant', content: summary, isSummary: true }]);
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
            setMessages(prev => [...prev, { role: 'assistant', content: summary, isSummary: true }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Failed to access page content." }]);
        }
    };

    const handleSummarizeVideo = async () => {
        const webview = document.getElementById('main-webview') as any;
        if (!webview) return;

        setMessages(prev => [...prev, { role: 'user', content: "Summarize this video" }]);
        try {
            const url = await webview.getURL();
            if (url.includes('youtube.com/watch')) {
                const info = await webview.executeJavaScript(`
                    (() => {
                        const title = document.querySelector('h1.ytd-video-primary-info-renderer')?.innerText || document.title;
                        const desc = document.querySelector('#description-inline-expander')?.innerText || "";
                        return { title, desc };
                    })()
                `);

                const prompt = `Summarize this video: ${info.title}\n\nDescription: ${info.desc}`;
                const res = await api.ai.summarize(prompt);
                const summary = (res as any).summary || res;
                setMessages(prev => [...prev, { role: 'assistant', content: summary, isSummary: true }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "I can only summarize YouTube videos for now. Please open a YouTube video page." }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Failed to access video content." }]);
        }
    };

    const playAudioResponse = (base64Audio: string, text: string) => {
        if (audioRef.current) {
            audioRef.current.pause();
        }

        // Create audio from base64
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audioRef.current = audio;

        setCaptionText(text);
        setIsPlayingAudio(true);

        audio.onended = () => {
            setIsPlayingAudio(false);
            setCaptionText('');
        };

        audio.play().catch(e => console.error("Audio play error:", e));
    };

    const handleVoiceRecording = async (blob: Blob) => {
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];

            setMessages(prev => [...prev, { role: 'user', content: "🎤 Voice Command" }]);

            try {
                // Determine context
                let finalContext = context;
                if (!finalContext) {
                    try {
                        const notes = await api.db.getNotes();
                        finalContext = Array.isArray(notes) ? notes.map((n: any) => n.content).join('\n---\n') : "";
                    } catch { finalContext = ""; }
                }

                // Call AI with audio
                // We use api.ai.chat which maps to backend "processPrompt". 
                // Backend expects { audio: string } or string.
                const res = await api.ai.chat({ audio: base64Audio, context: finalContext ? { notes: finalContext } : undefined });

                processAIResponse(res);

            } catch (e) {
                console.error(e);
                setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process your voice command." }]);
            }
        };
    };

    const processAIResponse = (res: any) => {
        // Play Audio if available
        if (res.audioData) {
            playAudioResponse(res.audioData, res.response);
        }

        // Check for Tool Calls (NAVIGATE, RESEARCH)
        if (res.type === 'NAVIGATE' || res.type === 'RESEARCH') {
            const toolCall: ToolCall = {
                id: Date.now().toString(),
                type: res.type,
                payload: res.payload,
                status: 'pending'
            };

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.response || "I need your permission to proceed.",
                toolCall
            }]);
        } else if (res.type === 'MULTI_ACTION') {
            // Handle multi-action (if any are restricted)
            // Simplified for now: just show response. 
            // If completely automated actions (save_source etc), they are handled in backend usually? 
            // Wait, backend 'handleAIAction' executes them automatically? 
            // My plan said "Backend handleAIAction to ensure NAVIGATE/RESEARCH don't auto-execute".
            // If backend executed them, we shouldn't ask for permission.
            // Backend main.ts: "else if (action.type === 'RESEARCH') ... action.payload.workspaceId = workspace._id...".
            // It creates the workspace but doesn't "start scraping" necessarily. 
            // But for NAVIGATE, main.ts helper `handleAIAction` doesn't support it, so it does nothing on backend. 
            // So we are good to handle it here.

            setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
        } else {
            setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
        }
    };

    const handleToolAction = async (msgIndex: number, action: 'approve' | 'deny') => {
        const msg = messages[msgIndex];
        if (!msg.toolCall) return;

        const newMessages = [...messages];
        const toolCall = { ...msg.toolCall, status: action === 'approve' ? 'approved' : 'denied' };
        newMessages[msgIndex] = { ...msg, toolCall: toolCall as any }; // logic update
        setMessages(newMessages);

        if (action === 'approve') {
            if (toolCall.type === 'NAVIGATE') {
                const url = toolCall.payload.url;
                if (onOpenTabs) onOpenTabs([url]); // Uses parent handler to open tab
            } else if (toolCall.type === 'RESEARCH') {
                // Trigger research mode
                const { queries, topic, workspaceId } = toolCall.payload;

                // 1. Open Tabs
                if (queries && Array.isArray(queries) && queries.length > 0) {
                    if (onOpenTabs) onOpenTabs(queries);
                }

                // 2. Set Context and Switch Mode
                if (onSetResearchContext) {
                    onSetResearchContext({ topic, queries, workspaceId });
                }

                if (onSwitchMode) {
                    onSwitchMode('research');
                }
            }
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
            // But we want voice/tool response structure now. 
            // processChatWithContext returns { response: string }. 
            // We should use api.ai.chat for unified structure if we want tools? 
            // But main.ts `ai:chat` uses `processPrompt` (smart, returns JSON tools), `ai:chat-notes` uses `processChatWithContext` (simple text).
            // Let's us `api.ai.chat` with context injected.

            let finalContext = context;
            // If context is empty, try to fetch notes again just in case (optional, but good for robustness)
            if (!finalContext && mode === 'notes') {
                // Already handled by useEffect loadNotes, but safe check.
            }

            // Construct payload for ai.chat
            // processPrompt handles "context" property.
            const res = await api.ai.chat({ text, context: finalContext ? { notes: finalContext } : undefined });
            processAIResponse(res);

            // Old simpler call:
            // const res = await api.ai.chatNotes(text, context);
            // setMessages(prev => [...prev, { role: 'assistant', content: res.response || "No response" }]);
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
        const ExpandIcon = expansionMode === 'full' ? Minimize2 : expansionMode === 'half' ? Maximize2 : Maximize2;

        return (
            <div className="flex flex-col h-full text-[var(--text-primary)]">
                <div className="flex justify-between items-center mb-4">
                    <motion.h2 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-3xl font-serif-title text-[var(--text-primary)]"
                    >
                        Study
                    </motion.h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onToggleExpand}
                            className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            title={expansionMode === 'full' ? "Contract" : "Expand"}
                        >
                            <ExpandIcon size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={handleGenerateStudyMaterials}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
                            >
                                <School size={12} />
                                Analyze Page
                            </button>
                            <label className="bg-[var(--input-bg)] hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer px-2 py-1 rounded flex items-center gap-1 transition-colors" title="Upload Study Material">
                                <input type="file" className="hidden" accept=".txt,.md,.json" onChange={handleStudyFileUpload} />
                                <Upload size={12} />
                            </label>
                        </div>
                    </div>
                </div>

                {studyData && (
                    <div className="flex gap-2 mb-4 text-xs bg-black/20 p-1 rounded-lg">
                        {[
                            { id: 'summary', icon: BookOpen, label: 'Summary' },
                            { id: 'quiz', icon: Brain, label: 'Quiz' },
                            { id: 'flashcards', icon: School, label: 'Flashcards' }
                        ].map((item) => (
                            <motion.button
                                key={item.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setStudyMode(item.id as any)}
                                className="relative flex-1 p-2 rounded flex items-center justify-center gap-1 text-[var(--text-primary)] transition-colors"
                            >
                                {studyMode === item.id && (
                                    <motion.div
                                        layoutId="study-active-bg"
                                        className="absolute inset-0 bg-purple-600 rounded shadow-sm"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1">
                                    <item.icon size={12} />
                                    {item.label}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                )
                }

                <div className="flex-1 overflow-y-auto space-y-2 mb-4 h-full custom-scrollbar">
                    {loading && <div className="text-center p-4">Generating study materials... <br /><span className="text-xs text-gray-400">This may take a moment.</span></div>}

                    <AnimatePresence mode="wait">
                        {!loading && studyMode === 'none' && (
                            <motion.div
                                key="none"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="mb-4">
                                    <button 
                                        onClick={() => setShowPastNotes(!showPastNotes)}
                                        className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors w-full text-left bg-white/5 p-2 rounded"
                                    >
                                        <BookOpen size={14} />
                                        {showPastNotes ? "Hide Past Notes" : "Show Past Notes"}
                                    </button>
                                    
                                    <AnimatePresence>
                                        {showPastNotes && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-2 space-y-2 pl-2 border-l-2 border-white/10">
                                                    {notes.length === 0 && <div className="text-[var(--text-secondary)] text-sm italic">No past notes found.</div>}
                                                    {notes.map((n, i) => (
                                                        <div key={i} className="bg-[var(--input-bg)] p-2 rounded text-sm text-[var(--text-primary)]">
                                                            <div className="text-xs text-[var(--text-secondary)] mb-1">{new Date(n.createdAt).toLocaleDateString()}</div>
                                                            <div className="whitespace-pre-wrap line-clamp-3 hover:line-clamp-none transition-all">{n.content}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}

                        {!loading && studyMode === 'summary' && studyData?.summary && (
                            <motion.div
                                key="summary"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white/5 p-4 rounded text-sm whitespace-pre-wrap leading-relaxed"
                            >
                                <h3 className="font-bold mb-2 text-purple-300">Summary</h3>
                                {studyData.summary}
                            </motion.div>
                        )}

                        {!loading && studyMode === 'quiz' && studyData?.quiz && (
                            <motion.div
                                key="quiz"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {studyData.quiz.map((q: any, i: number) => (
                                    <div key={i} className="bg-[var(--input-bg)] p-4 rounded text-sm text-[var(--text-primary)]">
                                        <h4 className="font-bold mb-2">{i + 1}. {q.question}</h4>
                                        <div className="space-y-1">
                                            {q.options.map((opt: string, optIndex: number) => {
                                                const isSelected = quizAnswers[i] === opt;
                                                const isCorrect = opt === q.correctAnswer;
                                                let bgClass = "bg-[var(--input-bg)] hover:bg-[var(--hover-bg)]";

                                                if (showQuizResult) {
                                                    if (isCorrect) bgClass = "bg-green-500/20 border border-green-500";
                                                    else if (isSelected && !isCorrect) bgClass = "bg-red-500/20 border border-red-500";
                                                } else if (isSelected) {
                                                    bgClass = "bg-purple-600";
                                                }

                                                return (
                                                    <motion.button
                                                        key={optIndex}
                                                        whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.1)" }}
                                                        whileTap={{ scale: 0.99 }}
                                                        onClick={() => !showQuizResult && setQuizAnswers(prev => ({ ...prev, [i]: opt }))}
                                                        className={`w-full text-left p-2 rounded transition-colors ${bgClass}`}
                                                    >
                                                        {opt}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowQuizResult(!showQuizResult)}
                                    className="w-full bg-purple-600 p-2 rounded font-bold hover:bg-purple-700 transition-colors mb-2"
                                >
                                    {showQuizResult ? "Hide Results" : "Check Answers"}
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={async () => {
                                        setLoading(true);
                                        const webview = document.getElementById('main-webview') as any;
                                        if (webview) {
                                            try {
                                                const text = await webview.executeJavaScript('document.body.innerText');
                                                const res = await api.ai.generateMoreQuestions(text, studyData.quiz);
                                                if (res.quiz && res.quiz.length > 0) {
                                                    setStudyData((prev: any) => ({
                                                        ...prev,
                                                        quiz: [...prev.quiz, ...res.quiz]
                                                    }));
                                                }
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }
                                        setLoading(false);
                                    }}
                                    className="w-full bg-white/10 p-2 rounded font-bold hover:bg-white/20 transition-colors"
                                >
                                    Generate More Questions
                                </motion.button>
                            </motion.div>
                        )}

                        {!loading && studyMode === 'flashcards' && studyData?.flashcards && studyData.flashcards.length > 0 && (
                            <motion.div
                                key="flashcards"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center justify-center h-full"
                            >
                                <div
                                    onClick={() => setIsFlipped(!isFlipped)}
                                    className="w-full max-w-sm h-64 perspective-1000 cursor-pointer"
                                >
                                        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                            {/* Front */}
                                            <div className="absolute w-full h-full bg-[var(--bg-secondary)] rounded-xl p-6 flex flex-col items-center justify-center text-center backface-hidden shadow-xl border border-[var(--border-color)]">
                                                <h3 className="text-sm uppercase tracking-widest text-purple-400 mb-4">Term</h3>
                                                <p className="text-xl font-bold text-[var(--text-primary)]">{studyData.flashcards[currentFlashcardIndex].front}</p>
                                                <p className="absolute bottom-4 text-xs text-[var(--text-secondary)]">Click to flip</p>
                                            </div>

                                            {/* Back */}
                                            <div className="absolute w-full h-full bg-[var(--bg-secondary)] rounded-xl p-6 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 shadow-xl border border-[var(--border-color)]" style={{ transform: 'rotateY(180deg)' }}>
                                                <h3 className="text-sm uppercase tracking-widest text-green-400 mb-4">Definition</h3>
                                                <p className="text-lg text-[var(--text-primary)]">{studyData.flashcards[currentFlashcardIndex].back}</p>
                                                <p className="absolute bottom-4 text-xs text-[var(--text-secondary)]">Click to flip back</p>
                                            </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mt-8">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => {
                                            setIsFlipped(false);
                                            setCurrentFlashcardIndex(prev => Math.max(0, prev - 1));
                                        }}
                                        disabled={currentFlashcardIndex === 0}
                                        className="p-2 rounded-full bg-[var(--input-bg)] disabled:opacity-50 hover:bg-[var(--hover-bg)]"
                                    >
                                        ← Prev
                                    </motion.button>
                                    <span className="text-sm font-mono">
                                        {currentFlashcardIndex + 1} / {studyData.flashcards.length}
                                    </span>
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => {
                                            setIsFlipped(false);
                                            setCurrentFlashcardIndex(prev => Math.min(studyData.flashcards.length - 1, prev + 1));
                                        }}
                                        disabled={currentFlashcardIndex === studyData.flashcards.length - 1}
                                        className="p-2 rounded-full bg-[var(--input-bg)] disabled:opacity-50 hover:bg-[var(--hover-bg)]"
                                    >
                                        Next →
                                    </motion.button>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={async () => {
                                        setLoading(true);
                                        const webview = document.getElementById('main-webview') as any;
                                        if (webview) {
                                            try {
                                                const text = await webview.executeJavaScript('document.body.innerText');
                                                const res = await api.ai.generateMoreFlashcards(text, studyData.flashcards);
                                                if (res.flashcards && res.flashcards.length > 0) {
                                                    setStudyData((prev: any) => ({
                                                        ...prev,
                                                        flashcards: [...prev.flashcards, ...res.flashcards]
                                                    }));
                                                }
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }
                                        setLoading(false);
                                    }}
                                    className="mt-4 bg-[var(--input-bg)] px-4 py-2 rounded text-sm hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)]"
                                >
                                    Generate More Flashcards
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    if (mode === 'chat') {
        const ExpandIcon = expansionMode === 'full' ? Minimize2 : expansionMode === 'half' ? Maximize2 : Maximize2;

        return (
            <div className="flex flex-col h-full text-[var(--text-primary)] overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <motion.h2 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-3xl font-serif-title"
                    >
                        AI Assistant
                    </motion.h2>
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onToggleExpand}
                            className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            title={expansionMode === 'full' ? "Contract" : "Expand"}
                        >
                            <ExpandIcon size={18} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            title="Close"
                        >
                            <X size={18} />
                        </motion.button>
                    </div>
                </div>

                {/* Chat Interface */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto space-y-3 mb-2 p-2 bg-[var(--bg-secondary)] rounded custom-scrollbar"
                    >
                        {messages.length === 0 && <div className="text-[var(--text-secondary)] text-xs text-center">Ask questions about your notes or upload files...</div>}
                        {messages.map((m, i) => (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className={m.role === 'user' ? "text-right" : "text-left"}
                            >
                                {m.role === 'assistant' && m.toolCall && (
                                    <div className="inline-block w-full max-w-[90%] text-left mt-2 mb-2">
                                        <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 shadow-lg">
                                            <div className="flex items-center gap-2 mb-2 text-yellow-400">
                                                <Sparkles size={16} />
                                                <span className="font-bold text-xs uppercase tracking-wider">
                                                    {m.toolCall.type === 'NAVIGATE' ? 'Navigation Request' : 'Research Request'}
                                                </span>
                                            </div>
                                            <p className="text-sm mb-3 text-[var(--text-secondary)]">
                                                {m.toolCall.type === 'NAVIGATE'
                                                    ? `I'd like to open ${m.toolCall.payload.url}`
                                                    : `I'd like to start researching: ${m.toolCall.payload.topic}`
                                                }
                                            </p>

                                            {m.toolCall.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <motion.button 
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleToolAction(i, 'approve')}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded font-bold transition-colors"
                                                    >
                                                        Allow
                                                    </motion.button>
                                                    <motion.button 
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleToolAction(i, 'deny')}
                                                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded font-bold transition-colors"
                                                    >
                                                        Deny
                                                    </motion.button>
                                                </div>
                                            )}

                                            {m.toolCall.status === 'approved' && (
                                                <div className="text-center text-xs text-green-400 font-bold bg-green-900/20 py-1 rounded">
                                                    Approved
                                                </div>
                                            )}

                                            {m.toolCall.status === 'denied' && (
                                                <div className="text-center text-xs text-red-400 font-bold bg-red-900/20 py-1 rounded">
                                                    Denied
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {m.role === 'assistant' && m.isSummary ? (
                                    <div className="inline-block w-full max-w-[95%] text-left mt-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
                                            <div className="flex items-center justify-between px-3 py-2 bg-[var(--hover-bg)] border-b border-[var(--border-color)]">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles size={14} className="text-blue-500" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">AI Summary</span>
                                                </div>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText((m as any).content);
                                                        setCopiedId(i);
                                                        setTimeout(() => setCopiedId(null), 2000);
                                                    }}
                                                    className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                                >
                                                    {copiedId === i ? <Check size={12} /> : <Copy size={12} />}
                                                </motion.button>
                                            </div>
                                            <div className="p-3">
                                                <div className="text-sm leading-relaxed text-[var(--text-primary)] markdown-content">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {(m as any).content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    !m.toolCall && (
                                        <div className={`inline-block p-2 rounded-lg text-sm max-w-[90%] markdown-content ${m.role === 'user' ? 'bg-blue-600' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {m.content}
                                            </ReactMarkdown>
                                        </div>
                                    )
                                )}
                            </motion.div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="flex gap-2 mb-2">
                    <label className="cursor-pointer bg-[var(--input-bg)] p-1.5 rounded hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="Upload File">
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                        <Upload size={16} />
                    </label>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleSummarizePage} className="bg-[var(--input-bg)] p-1.5 rounded hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="Summarize Page">
                        <Globe size={16} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleSummarizeVideo} className="bg-[var(--input-bg)] p-1.5 rounded hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="Summarize Video">
                        <Youtube size={16} />
                    </motion.button>
                </div>

                <div className="flex gap-2 relative">
                    {/* Closed Captions Overlay */}
                    {isPlayingAudio && captionText && (
                        <div className="absolute bottom-full mb-4 left-0 right-0 p-4 bg-black/80 text-white text-center rounded-xl backdrop-blur-md border border-white/10 shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
                            <p className="text-lg font-medium leading-relaxed">{captionText}</p>
                        </div>
                    )}

                    <VoiceRecorder onRecordingComplete={handleVoiceRecording} isProcessing={false} />
                    <input
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded px-2 py-1 text-sm focus:outline-none text-[var(--text-primary)]"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask AI..."
                    />
                    <motion.button whileTap={{ scale: 0.9 }} onClick={sendMessage} className="bg-blue-600 px-3 py-1 rounded text-sm">Send</motion.button>
                </div>
            </div>
        );
    }


    if (mode === 'history') {
        const ExpandIcon = expansionMode === 'full' ? Minimize2 : expansionMode === 'half' ? Maximize2 : Maximize2;
        return (
            <div className="flex flex-col h-full text-[var(--text-primary)] overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-[var(--text-primary)]" />
                        <motion.h2 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-3xl font-serif-title"
                        >
                            History
                        </motion.h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onToggleExpand}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                            title={expansionMode === 'full' ? "Contract" : "Expand"}
                        >
                            <ExpandIcon size={18} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                            title="Close"
                        >
                            <X size={18} />
                        </motion.button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                    {loading && history.length === 0 && <div className="text-center p-4 text-[var(--text-secondary)]">Loading history...</div>}
                    {!loading && history.length === 0 && <div className="text-center p-4 text-[var(--text-secondary)]">No history yet.</div>}
                    {history.map((h, i) => (
                        <div
                            key={i}
                            onClick={() => onNavigate?.(h.url)}
                            className="bg-[var(--input-bg)] p-3 rounded-lg hover:bg-[var(--hover-bg)] cursor-pointer transition-all border border-transparent hover:border-[var(--border-color)] group"
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium truncate text-[var(--text-primary)]">{h.title || 'Untitled Page'}</h4>
                                    <p className="text-xs text-[var(--text-secondary)] truncate">{h.url}</p>
                                </div>
                                <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    <ExternalLink size={14} />
                                </button>
                            </div>
                            <div className="mt-2 text-[10px] text-[var(--text-secondary)] font-mono">
                                {new Date(h.timestamp).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (mode === 'research') {
        return <ResearchPanel expansionMode={expansionMode} onToggleExpand={onToggleExpand} onOpenTabs={onOpenTabs} onClose={onClose} initialContext={researchContext} />;
    }

    return <div className="text-white">Settings</div>;
}
