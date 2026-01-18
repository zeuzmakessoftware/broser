import { useState, useEffect } from 'react';
import { useBrowserAPI } from '../hooks/useBrowserAPI';
import { Plus, Search, Maximize2, Minimize2, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';

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
    onOpenTabs
}: {
    expansionMode?: 'compact' | 'half' | 'full',
    onToggleExpand?: () => void,
    onOpenTabs?: (urls: string[]) => void
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

    const handleCreateWorkspace = async () => {
        if (!newTopic.trim()) return;
        try {
            await api.db.createWorkspace(newTopic);
            setNewTopic('');
            loadWorkspaces();
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
        <div className="flex flex-col h-full text-white">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Research</h2>
                <button
                    onClick={onToggleExpand}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                    title={expansionMode === 'full' ? "Contract" : "Expand"}
                >
                    {expansionMode === 'full' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
            </div>

            {/* Workspace Selector */}
            <div className="mb-4 space-y-2">
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-white/10 border border-white/10 rounded px-2 py-1 text-sm outline-none"
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
                        <button
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
                                        Perform multiple actions using "MULTI_ACTION" type to structure your response:
                                        
                                        1. SAVE_SOURCE: Save the page metadata.
                                           - URL: ${url}
                                           - Title: ${title}
                                           - WorkspaceId: ${currentWorkspaceId}
                                           - Summary: A brief summary of the page content.
                                           - Tags: ['supporting' | 'opposing' | 'neutral', 'topic tags...']
                                           
                                        2. SAVE_CITATION: Extract 3 key quotes relevant to "${topic}".
                                           - Each citation should have "sourceUrl": "${url}", "content": "The quote...", "workspaceId": "${currentWorkspaceId}"
                                           
                                        3. CREATE_NOTE: Write a brief analysis note about how this source relates to "${topic}".
                                           - "content": "Analysis...", "workspaceId": "${currentWorkspaceId}"

                                        Page Content:
                                        ${text.substring(0, 15000)}
                                        `;
                                        
                                        await api.ai.chat(prompt);
                                        await loadWorkspaceData(currentWorkspaceId);
                                    }
                                } catch (e) {
                                    console.error("Analyze Error", e);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                             {loading ? "Analyzing..." : <><BookOpen size={14} /> Analyze This Page</>}
                        </button>
                    </div>

                    <div className="relative mb-2">
                        <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                        <input
                            className="w-full bg-white/5 border border-white/10 rounded pl-8 py-1 text-sm outline-none"
                            placeholder="Search..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>

                    <div className="flex border-b border-white/10 mb-2">
                        {['sources', 'notes', 'citations'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t as any)}
                                className={clsx(
                                    "flex-1 pb-2 text-sm capitalize transition-colors",
                                    tab === t ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-white"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {filteredList.map((item: any, i: number) => (
                            <div key={i} className="bg-white/5 p-2 rounded text-xs break-words hover:bg-white/10 cursor-pointer">
                                {tab === 'sources' && (
                                    <>
                                        <div className="font-bold mb-1">{item.title || 'Untitled'}</div>
                                        <div className="text-gray-400 truncate">{item.url}</div>
                                    </>
                                )}
                                {tab === 'notes' && <div>{item.content}</div>}
                                {tab === 'citations' && (
                                    <>
                                        <div className="italic mb-1">"{item.content}"</div>
                                        <div className="text-gray-500">{item.sourceUrl}</div>
                                    </>
                                )}
                            </div>
                        ))}
                        {filteredList.length === 0 && <div className="text-gray-500 text-center text-xs mt-4">No items found</div>}
                    </div>
                </>
            )}
        </div>
    );
}
