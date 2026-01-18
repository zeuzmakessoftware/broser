import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { AddressBar } from './components/AddressBar';
import { SidePanelContent } from './components/SidePanelContent';

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  active: boolean;
}

import { useVoiceInput } from './hooks/useVoiceInput';
import { useBrowserAPI } from './hooks/useBrowserAPI';

// ...

import { StartPage } from './components/StartPage';
import { VoiceOverlay } from './components/VoiceOverlay';

// ...

function App() {
  const api = useBrowserAPI();
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Start Page', url: 'noteva://start', active: true }
  ]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarMode, setSidebarMode] = useState<'notes' | 'chat' | 'settings' | 'research' | 'history' | null>(null);
  const [expansionMode, setExpansionMode] = useState<'compact' | 'half' | 'full'>('compact');
  const [aiResponseToProcess, setAiResponseToProcess] = useState<any>(null);
  const [researchContext, setResearchContext] = useState<{ topic?: string; workspaceId?: string; queries?: string[] } | null>(null);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [initialChatQuery, setInitialChatQuery] = useState<string | null>(null);

  const handleVoiceData = async (base64Audio: string) => {
    // Ideally show a spinner or "Processing..." state
    setIsVoiceProcessing(true);
    console.log("Audio recorded, sending to AI...");
    
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

      // Delegate response handling to SidePanelContent
      setAiResponseToProcess(res);

      // Open chat panel to show response
      setSidebarMode('chat');
    } catch (e) {
      console.error("Voice Error", e);
    } finally {
      setIsVoiceProcessing(false);
    }
  };

  const { isListening, toggleListening } = useVoiceInput({ onAudioData: handleVoiceData });

  const handleVoiceInteraction = () => {
    if (isVoiceProcessing) {
      setIsVoiceProcessing(false); // Cancel processing
      return;
    }
    
    if (isListening) {
      // Stop listening, prepare for processing
      toggleListening();
      setIsVoiceProcessing(true);
    } else {
      // Start listening
      toggleListening();
      setIsVoiceProcessing(false);
    }
  };

  const activeTab = tabs.find(t => t.active) || tabs[0];

  const handleNewTab = (url?: string) => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: url ? url : 'Start Page',
      url: url ? url : 'noteva://start',
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
    if (!url) return;

    // Normalize input
    let finalUrl = url.trim();

    // Quick check if it's a URL
    const isUrl = finalUrl.includes('.') && !finalUrl.includes(' ');
    const hasProtocol = finalUrl.includes('://');

    if (!hasProtocol) {
      if (isUrl) {
        finalUrl = 'https://' + finalUrl;
      } else {
        // Default to Google search
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      }
    }

    console.log(`[Navigation] Navigating to: ${finalUrl}`);
    setTabs(prev => prev.map(t => t.active ? { ...t, url: finalUrl, title: finalUrl } : t));

    // Save to History
    if (!finalUrl.startsWith('noteva://')) {
      api.db.saveHistory(finalUrl, url); // Simple title for now, webview can update it later
    }

    // Electron Webview update logic
    // We update via src prop in React, but for existing webviews, loadURL is faster/more reliable
    const webview = document.getElementById('main-webview') as any;
    if (webview && !finalUrl.startsWith('noteva://')) {
      try {
        webview.loadURL(finalUrl);
      } catch (e) {
        console.error("Navigation error", e);
      }
    }
  };

  const toggleSidebar = (mode: 'notes' | 'chat' | 'settings' | 'research' | 'history') => {
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

  const toggleTheme = () => {
    setTheme(curr => curr === 'dark' ? 'light' : 'dark');
  };


  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  useEffect(() => {
    // Listen for "Open Link in New Tab" events from main process
    const cleanup = api.tabs?.onOpenNewTab((url) => {
      handleNewTab(url);
    });
    return () => cleanup && cleanup();
  }, [api]);

  useEffect(() => {
    // Listen for "Ask AI" events
    const cleanup = api.ai?.onAskAI((text) => {
        setInitialChatQuery(text);
        setSidebarMode('chat');
    });
    return () => cleanup && cleanup();
  }, [api]);

  useEffect(() => {
    // Listen for "Reload" menu event (CMD+R)
    // We attach this to the window/app level to handle the menu action
    if (api.tabs?.onReloadActive) {
      const cleanup = api.tabs.onReloadActive(() => {
        console.log("CMD+R intercepted, reloading active webview...");
        const webview = document.getElementById('main-webview') as any;
        if (webview) {
          try {
             webview.reload();
          } catch (error) {
            console.error("Error reloading webview:", error);
          }
        }
      });
      return () => cleanup && cleanup();
    }
  }, [api]);

  const updateTab = (id: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  
  // Callback ref for webview to attach listeners
  const handleWebviewRef = useCallback((node: any) => {
    if (node) {
      if (node.dataset.listenersAttached === 'true') return;
      
      const tabId = node.dataset.tabId;

      const onTitleUpdated = (e: any) => {
        if (e.title) {
          updateTab(tabId, { title: e.title });
        }
      };

      const onDidNavigate = (e: any) => {
         // Also update URL if redirected
         updateTab(tabId, { url: e.url });
      };

      const onFaviconUpdated = (e: any) => {
        if (e.favicons && e.favicons.length > 0) {
          updateTab(tabId, { favicon: e.favicons[0] });
        }
      };

      node.addEventListener('page-title-updated', onTitleUpdated);
      node.addEventListener('page-favicon-updated', onFaviconUpdated);
      node.addEventListener('did-navigate', onDidNavigate);
      node.addEventListener('did-navigate-in-page', onDidNavigate);

      node.dataset.listenersAttached = 'true';
    }
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-sans transition-colors duration-300">
      {(isListening || isVoiceProcessing) && <VoiceOverlay onStop={handleVoiceInteraction} isProcessing={isVoiceProcessing} />}
      <Sidebar
        isOpen={!!sidebarMode}
        activeMode={sidebarMode}
        onToggle={toggleSidebar}
        onVoiceClick={handleVoiceInteraction}
        isListening={isListening}
        currentTheme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Titlebar / Drag Region is mostly handled by CSS on TabBar container? 
            Actually TabBar is usually in the titlebar. 
            We need a top bar that contains TabBar.
        */}
        <div className="bg-[var(--bg-secondary)] pt-2 dragged-region transition-colors duration-300">
          <TabBar
            tabs={tabs}
            onNewTab={() => handleNewTab()}
            onSwitchTab={handleSwitchTab}
            onCloseTab={handleCloseTab}
            className="pl-2"
          />
        </div>

        <AddressBar
          url={activeTab?.url === 'noteva://start' ? '' : activeTab?.url || ''}
          onNavigate={handleNavigate}
          onBack={() => { (document.getElementById('main-webview') as any)?.goBack() }}
          onForward={() => { (document.getElementById('main-webview') as any)?.goForward() }}
          onReload={() => { (document.getElementById('main-webview') as any)?.reload() }}
        />

        <div className="flex-1 relative bg-[var(--bg-primary)] overflow-hidden">
          {tabs.map(tab => (
            <div key={tab.id} className={`absolute inset-0 ${tab.active ? 'block' : 'hidden'}`}>
              {tab.url === 'noteva://start' ? (
                <StartPage onNavigate={handleNavigate} onNewTab={() => handleNewTab()} onVoiceClick={handleVoiceInteraction} />
              ) : (
                <webview
                  id={tab.active ? 'main-webview' : undefined}
                  src={tab.url}
                  className="w-full h-full"
                  // @ts-ignore
                  allowpopups="true"
                  // @ts-ignore
                  partition="persist:main"
                  ref={handleWebviewRef}
                  data-tab-id={tab.id}
                />
              )}
            </div>
          ))}
          <AnimatePresence>
            {sidebarMode && (
              <motion.div
                key="sidepanel"
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`absolute right-4 top-1/2 -translate-y-1/2 h-[80vh] bg-[var(--bg-tertiary)] border border-[var(--border-color)] shadow-xl z-40 rounded-xl overflow-hidden ${
                  expansionMode === 'compact' ? 'w-80' :
                  expansionMode === 'half' ? 'w-1/2' : 'w-full'
                }`}
              >
                <div className="flex flex-col h-full p-4">
                  <SidePanelContent
                    mode={sidebarMode}
                    expansionMode={expansionMode}
                    onToggleExpand={toggleExpand}
                    onClose={() => setSidebarMode(null)}
                    onNavigate={handleNavigate}
                    pendingAIResponse={aiResponseToProcess}
                    onResponseProcessed={() => setAiResponseToProcess(null)}
                    researchContext={researchContext}
                    onSetResearchContext={setResearchContext}
                    initialChatQuery={initialChatQuery}
                    onClearInitialChatQuery={() => setInitialChatQuery(null)}
                    onSwitchMode={(mode) => setSidebarMode(mode)}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;
