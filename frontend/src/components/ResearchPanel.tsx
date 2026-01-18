import { useState, useEffect } from 'react';
import { useBrowserAPI } from '../hooks/useBrowserAPI';
import { Plus, Search } from 'lucide-react';
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

export function ResearchPanel({ isExpanded: _isExpanded }: { isExpanded?: boolean }) {
    const api = useBrowserAPI();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
    const [newTopic, setNewTopic] = useState('');
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
            const res = await api.db.getWorkspaceData(id);
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

    const filteredList = (data[tab] || []).filter((item: any) => {
        const text = item.title || item.content || item.url || '';
        return text.toLowerCase().includes(filter.toLowerCase());
    });

    return (
        <div className="flex flex-col h-full text-white">
            <h2 className="text-lg font-bold mb-4">Research</h2>

            {/* Workspace Selector */}
            <div className="mb-4 space-y-2">
                <select
                    className="w-full bg-white/10 border border-white/10 rounded px-2 py-1 text-sm outline-none"
                    value={currentWorkspaceId}
                    onChange={e => setCurrentWorkspaceId(e.target.value)}
                >
                    <option value="">Select Topic...</option>
                    {workspaces.map(ws => (
                        <option key={ws._id} value={ws._id}>{ws.title}</option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-white/10 border border-white/10 rounded px-2 py-1 text-sm outline-none"
                        placeholder="New Topic..."
                        value={newTopic}
                        onChange={e => setNewTopic(e.target.value)}
                    />
                    <button onClick={handleCreateWorkspace} className="bg-blue-600 p-1 rounded hover:bg-blue-500">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {currentWorkspaceId && (
                <>
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
