import { useState, useEffect } from 'react';
import { useBrowserAPI } from '../hooks/useBrowserAPI';
import { Search, Maximize2, Minimize2, BookOpen, X } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Workspace {
    _id: string;
    title: string;
}

interface ResearchData {
    sources: any[];
    notes: any[];
    citations: any[];
}

export function ResearchPanel({
    expansionMode = 'compact',
    onToggleExpand,
    onOpenTabs,
    onClose,
    initialContext
}: {
    expansionMode?: 'compact' | 'half' | 'full',
    onToggleExpand?: () => void,
    onOpenTabs?: (urls: string[]) => void,
    onClose?: () => void,
    initialContext?: { topic?: string; workspaceId?: string; queries?: string[] }
}) {
    const api = useBrowserAPI();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
    const [newTopic, setNewTopic] = useState('');
    const [loading, setLoading] = useState(false); // Add loading state
    const [data, setData] = useState<ResearchData>({ sources: [], notes: [], citations: [] });
    const [tab, setTab] = useState<'sources' | 'notes' | 'citations'>('sources');
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadWorkspaces();
    }, []);

    // Handle Initial Context (Auto-Research from Voice/Chat)
    useEffect(() => {
        if (initialContext) {
            console.log("ResearchPanel received context:", initialContext);
            if (initialContext.workspaceId) {
                setCurrentWorkspaceId(initialContext.workspaceId);
            } else if (initialContext.topic) {
                // If we have a topic but no ID, try to find matching workspace or just prep input
                const existing = workspaces.find(w => w.title.toLowerCase() === initialContext.topic?.toLowerCase());
                if (existing) {
                    setCurrentWorkspaceId(existing._id);
                } else {
                    setNewTopic(initialContext.topic);
                    // Optional: Auto-create workspace if desired?
                    // handleResearchAgent(); // Might cause loop if not careful.
                }
            }
        }
    }, [initialContext, workspaces]);

    useEffect(() => {
        if (currentWorkspaceId) {
            loadWorkspaceData(currentWorkspaceId);
        } else {
            setData({ sources: [], notes: [], citations: [] });
        }
    }, [currentWorkspaceId]);

    const loadWorkspaces = async () => {
        try {
            const res = await api.db.getWorkspaces();
            if (Array.isArray(res)) setWorkspaces(res);
        } catch (e) {
            console.error("Failed to load workspaces", e);
        }
    };

    const loadWorkspaceData = async (id: string) => {
        try {
            console.log("Frontend loading workspace data for:", id);
            const res = await api.db.getWorkspaceData(id);
            console.log("Frontend received workspace data:", res);
            if (res) setData(res);
        } catch (e) {
            console.error(e);
        }
    };



    const handleResearchAgent = async () => {
        if (!newTopic.trim()) return;
        setLoading(true);
        try {
            const prompt = `I want to research: ${newTopic}. Setup my workspace and find sources.`;
            const res = await api.ai.chat(prompt); // Logic updated in main.ts/ai.ts to handle RESEARCH intent

            // If the AI returns a RESEARCH plan
            if (res.type === 'RESEARCH') {
                const { workspaceId, queries } = res.payload;

                // Refresh workspaces to see the new one
                await loadWorkspaces();

                // Switch to new workspace
                if (workspaceId) {
                    setCurrentWorkspaceId(workspaceId);
                }

                // Open Tabs
                if (queries && Array.isArray(queries) && onOpenTabs) {
                    onOpenTabs(queries);
                }

                setNewTopic(''); // Clear input
            } else {
                // Fallback if AI didn't catch specific RESEARCH intent but just answered
                console.log("AI Response:", res);
                // We could still create a workspace manually if we want
            }
        } catch (e) {
            console.error("Research Agent Error", e);
        } finally {
            setLoading(false);
        }
    };

    const filteredList = (data[tab] || []).filter((item: any) => {
        const text = item.title || item.content || item.url || '';
        return text.toLowerCase().includes(filter.toLowerCase());
    });

    return (
        <div className="flex flex-col h-full text-[var(--text-primary)]">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-serif-title">Research</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleExpand}
                        className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title={expansionMode === 'full' ? "Contract" : "Expand"}
                    >
                        {expansionMode === 'full' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Workspace Selector */}
            <div className="mb-4 space-y-2">
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded px-2 py-1 text-sm outline-none text-[var(--text-primary)]"
                        placeholder="New Topic..."
                        value={newTopic}
                        onChange={e => setNewTopic(e.target.value)}
                    />
                    <button
                        onClick={handleResearchAgent}
                        disabled={loading}
                        className="bg-blue-600 p-1 rounded hover:bg-blue-500 disabled:opacity-50 animate-pulse"
                        title="AI Auto-Research"
                    >
                        {loading ? <span className="text-xs">...</span> : <Search size={16} />}
                    </button>
                </div>
            </div>

            {currentWorkspaceId && (
                <>
                    <div className="flex gap-2 mb-2">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={async () => {
                                if (!currentWorkspaceId) return;
                                setLoading(true);
                                try {
                                    const webview = document.getElementById('main-webview') as any;
                                    if (webview) {
                                        const title = webview.getTitle();
                                        const url = webview.getURL();
                                        const text = await webview.executeJavaScript('document.body.innerText');

                                        const topic = workspaces.find(w => w._id === currentWorkspaceId)?.title || 'current topic';

                                        const prompt = `
                                        Analyze this page for my research on: "${topic}".
                                        Perform multiple actions using "MULTI_ACTION" type to structure your response.
                                        BE VERY THOROUGH. Extra detailed notes and multiple citations are required.

                                        1. SAVE_SOURCE: Save the page metadata with proper MLA citation.
                                           - URL: ${url}
                                           - Title: ${title}
                                           - WorkspaceId: ${currentWorkspaceId}
                                           - Summary: A comprehensive summary of the page content relevant to the topic.
                                           - Tags: ['supporting' | 'opposing' | 'neutral', 'topic tags...']
                                           - mlaCitation: "Generate a correct MLA style citation for this webpage. Today is ${new Date().toLocaleDateString()}."

                                        2. SAVE_CITATION: Extract at least 3-5 distinct, direct quotes from the text that are highly relevant to "${topic}".
                                           - Each citation should have "sourceUrl": "${url}", "content": "The direct quote...", "workspaceId": "${currentWorkspaceId}"

                                        3. CREATE_NOTE: Write detailed research notes based on this source. Use Markdown formatting. Structure the content with bullet points ( - ) for key arguments, data points, dates, and facts.
                                           - "content": "### Key Findings\n- Point 1\n- Point 2", "workspaceId": "${currentWorkspaceId}"
                                           - Create multiple NOTE actions if there are distinct topics covered, or one comprehensive note.

                                        Page Content:
                                        ${text.substring(0, 30000)}
                                        `;

                                        // Race against a timeout
                                        const timeoutPromise = new Promise((_, reject) => 
                                            setTimeout(() => reject(new Error("Analysis timed out")), 45000)
                                        );

                                        await Promise.race([
                                            api.ai.chat(prompt, { workspaceId: currentWorkspaceId }),
                                            timeoutPromise
                                        ]);
                                        
                                        await loadWorkspaceData(currentWorkspaceId);
                                    }
                                } catch (e) {
                                    console.error("Analyze Error", e);
                                    alert("Analysis failed or timed out. Please try again or with less text.");
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loading ? "Analyzing..." : <><BookOpen size={14} /> Analyze This Page</>}
                        </motion.button>
                    </div>

                    <div className="relative mb-2">
                        <Search size={14} className="absolute left-2 top-2 text-[var(--text-secondary)]" />
                        <input
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded pl-8 py-1 text-sm outline-none text-[var(--text-primary)]"
                            placeholder="Search..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>

                    <div className="flex border-b border-[var(--border-color)] mb-2">
                        {['sources', 'notes', 'citations'].map(t => {
                            const isActive = tab === t;
                            return (
                                <motion.button
                                    key={t}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setTab(t as any)}
                                    className={clsx(
                                        "relative flex-1 pb-2 text-sm capitalize transition-colors outline-none",
                                        isActive ? "text-blue-500 font-medium" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    )}
                                >
                                    {t}
                                    {isActive && (
                                        <motion.div
                                            layoutId="research-active-tab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 overflow-x-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={tab}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-2"
                            >
                                {filteredList.map((item: any, i: number) => (
                                    <div key={i} className="bg-[var(--bg-secondary)] p-2 rounded text-xs break-words hover:bg-[var(--hover-bg)] cursor-pointer border border-transparent hover:border-[var(--border-color)]">
                                        {tab === 'sources' && (
                                            <>
                                                <div className="font-bold mb-1 text-[var(--text-primary)]">{item.title || 'Untitled'}</div>
                                                <div className="text-[var(--text-secondary)] truncate mb-1">{item.url}</div>
                                                {item.mlaCitation && (
                                                    <div className="text-xs text-[var(--text-tertiary)] font-serif border-l-2 border-[var(--border-color)] pl-2 mt-1">
                                                        {item.mlaCitation}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {tab === 'notes' && (
                                            <div className="prose prose-invert prose-xs max-w-none">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
                                            </div>
                                        )}
                                        {tab === 'citations' && (
                                            <>
                                                <div className="italic mb-1 text-[var(--text-primary)]">"{item.content}"</div>
                                                <div className="text-[var(--text-secondary)]">{item.sourceUrl}</div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {filteredList.length === 0 && <div className="text-[var(--text-secondary)] text-center text-xs mt-4">No items found</div>}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </>
            )}
        </div>
    );
}
