import { useState } from 'react';
import './index.css';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { AddressBar } from './components/AddressBar';
import { SidePanelContent } from './components/SidePanelContent';

interface Tab {
  id: string;
  title: string;
  url: string;
  active: boolean;
}

import { useVoiceInput } from './hooks/useVoiceInput';
import { useBrowserAPI } from './hooks/useBrowserAPI';

// ...

function App() {
  const api = useBrowserAPI();
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'New Tab', url: 'https://google.com', active: true }
  ]);
  const [sidebarMode, setSidebarMode] = useState<'notes' | 'chat' | 'settings' | 'research' | null>(null);
  const [expansionMode, setExpansionMode] = useState<'compact' | 'half' | 'full'>('compact');

  const handleVoiceData = async (base64Audio: string) => {
    console.log("Audio recorded, sending to AI...");
    // Ideally show a spinner or "Processing..." state
    try {
      // We can optionally pass current context (url, title) here too
      const webview = document.getElementById('main-webview') as any;
      let context = {};
      if (webview) {
        try {
          const title = await webview.getTitle();
          const url = webview.getURL();
          context = { title, url };
        } catch (e) {/* ignore */ }
      }

      const res = await api.ai.chat({ audio: base64Audio, context });
      // Handle response (e.g. speak audio, navigate, open panel)
      if (res.audioData) {
        const audio = new Audio(`data:audio/mp3;base64,${res.audioData}`);
        audio.play();
      }
      if (res.type === 'NAVIGATE') {
        handleNavigate(res.payload);
      }
      // Open chat panel to show response?
      setSidebarMode('chat');
    } catch (e) {
      console.error("Voice Error", e);
    }
  };

  const { isListening, toggleListening } = useVoiceInput({ onAudioData: handleVoiceData });

  const activeTab = tabs.find(t => t.active) || tabs[0];

  const handleNewTab = () => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: 'New Tab',
      url: 'https://google.com',
      active: true
    };
    setTabs(prev => prev.map(t => ({ ...t, active: false })).concat(newTab));
  };

  const handleSwitchTab = (id: string) => {
    setTabs(prev => prev.map(t => ({ ...t, active: t.id === id })));
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close last tab for now

    // If closing active tab, activate the one before it
    let newActiveId = activeTab.id;
    if (activeTab.id === id) {
      const index = tabs.findIndex(t => t.id === id);
      const newTab = tabs[index - 1] || tabs[index + 1];
      newActiveId = newTab.id;
    }

    setTabs(prev =>
      prev.filter(t => t.id !== id).map(t => ({ ...t, active: t.id === newActiveId }))
    );
  };

  const handleNavigate = (url: string) => {
    // Simple URL normalization
    if (!url.startsWith('http') && !url.includes('://')) {
      url = 'https://' + url; // Basic fallback, in real app usage search engine
    }
    setTabs(prev => prev.map(t => t.active ? { ...t, url: url, title: url } : t));

    // Electron Webview update logic
    const webview = document.getElementById('main-webview') as any;
    if (webview) {
      webview.loadURL(url);
    }
  };

  const toggleSidebar = (mode: 'notes' | 'chat' | 'settings' | 'research') => {
    setSidebarMode(curr => curr === mode ? null : mode);
    if (!sidebarMode) setExpansionMode('compact');
  };

  const toggleExpand = () => {
    setExpansionMode(curr => {
      if (curr === 'compact') return 'half';
      if (curr === 'half') return 'full';
      return 'compact';
    });
  };

  return (
    <div className="flex h-screen w-screen bg-[#242424] text-white overflow-hidden font-sans">
      <Sidebar
        isOpen={!!sidebarMode}
        activeMode={sidebarMode}
        onToggle={toggleSidebar}
        onVoiceClick={toggleListening}
        isListening={isListening}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Titlebar / Drag Region is mostly handled by CSS on TabBar container? 
            Actually TabBar is usually in the titlebar. 
            We need a top bar that contains TabBar.
        */}
        <div className="bg-[#1a1a1a] pt-2 dragged-region">
          <TabBar
            tabs={tabs}
            onNewTab={handleNewTab}
            onSwitchTab={handleSwitchTab}
            onCloseTab={handleCloseTab}
            className="pl-2"
          />
        </div>

        <AddressBar
          url={activeTab?.url || ''}
          onNavigate={handleNavigate}
          onBack={() => { (document.getElementById('main-webview') as any)?.goBack() }}
          onForward={() => { (document.getElementById('main-webview') as any)?.goForward() }}
          onReload={() => { (document.getElementById('main-webview') as any)?.reload() }}
        />

        <div className="flex-1 relative bg-white">
          {tabs.map(tab => (
            <webview
              key={tab.id}
              id={tab.active ? 'main-webview' : undefined}
              src={tab.url}
              className={`w-full h-full ${tab.active ? 'flex' : 'hidden'}`}
              // @ts-ignore
              allowpopups="true"
            />
          ))}
          {sidebarMode && (
            <div className={`absolute right-0 top-0 bottom-0 bg-[#1e1e1e] border-l border-white/10 shadow-2xl z-40 animate-in slide-in-from-right duration-200 transition-all ${expansionMode === 'compact' ? 'w-80' :
              expansionMode === 'half' ? 'w-1/2' : 'w-full'
              }`}>
              <div className="flex flex-col h-full p-4">
                <SidePanelContent
                  mode={sidebarMode}
                  expansionMode={expansionMode}
                  onToggleExpand={toggleExpand}
                  onOpenTabs={(urls: string[]) => {
                    const newTabs = urls.map((u, i) => ({
                      id: Date.now().toString() + i,
                      title: u,
                      url: u.startsWith('http') ? u : `https://google.com/search?q=${encodeURIComponent(u)}`,
                      active: i === urls.length - 1 // Activate last new tab
                    }));
                    setTabs(prev => {
                      const inactivePrev = prev.map(t => ({ ...t, active: false }));
                      return [...inactivePrev, ...newTabs];
                    });
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
