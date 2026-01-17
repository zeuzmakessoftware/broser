const { ipcRenderer } = require('electron');

const webview = document.getElementById('main-webview');
const omnibox = document.getElementById('omnibox');
const btnBack = document.getElementById('btn-back');
const btnForward = document.getElementById('btn-forward');
const btnReload = document.getElementById('btn-reload');
const voiceOrb = document.getElementById('voice-orb');
const sidePanel = document.getElementById('side-panel');
const panelContent = document.getElementById('panel-content');
const panelTitle = document.getElementById('panel-title');

// Sidebar Buttons
const btnNotes = document.getElementById('btn-notes');
const btnResearch = document.getElementById('btn-research');

// Navigation Logic
omnibox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        let url = omnibox.value;
        if (!url.startsWith('http')) {
            // Check for intent or search
            if (url.toLowerCase().startsWith('ai ')) {
                // Send to AI Agent
                handleAIPrompt(url.substring(3));
                return;
            }
            // Default to Google Search
            url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }
        webview.loadURL(url);
    }
});

webview.addEventListener('did-start-loading', () => {
    // omnibox.value = 'Loading...'; 
    // Maybe show a spinner or progress bar
});

webview.addEventListener('did-stop-loading', () => {
    omnibox.value = webview.getURL();
});

btnBack.addEventListener('click', () => {
    if (webview.canGoBack()) webview.goBack();
});

btnForward.addEventListener('click', () => {
    if (webview.canGoForward()) webview.goForward();
});

btnReload.addEventListener('click', () => {
    webview.reload();
});

// Sidebar Logic
let isPanelOpen = false;
let currentUploadContext = ""; // Store text from uploaded file

function togglePanel(mode) {
    if (isPanelOpen && sidePanel.dataset.mode === mode) {
        sidePanel.classList.remove('open');
        sidePanel.style.display = 'none';
        isPanelOpen = false;
    } else {
        sidePanel.style.display = 'flex';
        sidePanel.classList.add('open');
        sidePanel.dataset.mode = mode;
        isPanelOpen = true;
        loadSidePanelContent(mode);
    }
}

async function loadSidePanelContent(mode) {
    panelTitle.innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
    panelContent.innerHTML = '<div style="text-align:center; color: #888;">Loading...</div>';

    if (mode === 'notes') {
        const notes = await ipcRenderer.invoke('db:get-notes');
        renderNotes(notes);
    } else if (mode === 'tasks') {
        const tasks = await ipcRenderer.invoke('db:get-tasks');
        renderTasks(tasks);
    }
}

function renderNotes(notes) {
    panelContent.innerHTML = '';

    // Header for controls
    const controls = document.createElement('div');
    controls.style = "display: flex; justify-content: flex-end; margin-bottom: 5px;";

    const btnExpand = document.createElement('button');
    btnExpand.innerHTML = '<i class="fas fa-expand-alt"></i>'; // Initial icon
    btnExpand.title = "Toggle Expanded View";
    btnExpand.style = "background: transparent; border: none; color: #888; cursor: pointer; font-size: 14px;";
    controls.appendChild(btnExpand);

    panelContent.appendChild(controls);

    // 1. Notes List Container
    const listContainer = document.createElement('div');
    listContainer.id = 'notes-list-container';
    listContainer.style = "flex: 1; overflow-y: auto; margin-bottom: 20px; padding-right: 5px; transition: flex 0.3s ease;";

    notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-card';
        div.style = 'background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 10px; border-radius: 8px; font-size: 13px; word-wrap: break-word;';
        div.innerText = note.content;
        listContainer.appendChild(div);
    });
    panelContent.appendChild(listContainer);

    // 2. Chat / Assistant Section
    const chatSection = document.createElement('div');
    chatSection.id = 'chat-section';
    chatSection.style = "border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; display: flex; flex-direction: column; height: 300px; flex-shrink: 0; transition: height 0.3s ease;";

    chatSection.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: var(--accent-color); display: flex; justify-content: space-between; align-items: center;">
            <span>Assistant</span>
            <span id="upload-status" style="font-size: 10px; color: #888; font-weight: normal;"></span>
        </h3>
        
        <div id="chat-history" style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="color: #666; text-align: center; font-style: italic;">Upload a file to summarize, or ask questions about your notes.</div>
        </div>

        <div style="display: flex; gap: 8px;">
             <input type="file" id="file-upload" style="display: none;" accept=".txt,.md,.js,.json,.html">
             <button id="btn-upload" title="Upload File" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px; width: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-paperclip"></i>
             </button>
             <button id="btn-summ-page" title="Summarize Web Page" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px; width: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-globe"></i>
             </button>
             <input type="text" id="chat-input" placeholder="Ask connecting notes..." style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px; padding: 8px; outline: none;">
             <button id="btn-send-chat" style="background: var(--accent-color); border: none; color: black; border-radius: 6px; width: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-arrow-up"></i>
             </button>
        </div>
    `;
    panelContent.appendChild(chatSection);

    // Event Listeners for Chat UI
    const btnUpload = document.getElementById('btn-upload');
    const btnSummPage = document.getElementById('btn-summ-page');
    const fileInput = document.getElementById('file-upload');
    const btnSend = document.getElementById('btn-send-chat');
    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');
    const uploadStatus = document.getElementById('upload-status');

    // Toggle logic
    let isExpanded = false;
    btnExpand.addEventListener('click', () => {
        isExpanded = !isExpanded;
        if (isExpanded) {
            // Expanded mode: Notes list takes full space, chat minimizes?
            // Actually request was "expand the notes column on top".
            // Let's interpret as making the notes list bigger / hiding chat or resizing.
            // Let's try minimizing the chat section.
            chatSection.style.height = '60px'; // Minimized height
            chatSection.style.overflow = 'hidden';
            btnExpand.innerHTML = '<i class="fas fa-compress-alt"></i>';
        } else {
            chatSection.style.height = '300px';
            chatSection.style.overflow = 'visible'; // Restore overflow
            btnExpand.innerHTML = '<i class="fas fa-expand-alt"></i>';
        }
    });

    function addMessage(text, isUser = false) {
        const msgDiv = document.createElement('div');
        msgDiv.style = `
            align-self: ${isUser ? 'flex-end' : 'flex-start'};
            background: ${isUser ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'};
            color: ${isUser ? 'black' : 'white'};
            padding: 6px 10px;
            border-radius: 8px;
            max-width: 85%;
            word-wrap: break-word;
        `;

        // Simple formatting for bullet points and bold
        let formattedText = text;
        if (!isUser) {
            // Check for markdown bullets
            formattedText = formattedText.replace(/\n\*/g, '<br>•').replace(/\n-/g, '<br>•');
            // Bold
            formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        }

        msgDiv.innerHTML = formattedText;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // File Upload Handler
    btnUpload.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadStatus.innerText = `Reading ${file.name}...`;

            try {
                // Read file
                const text = await file.text();
                currentUploadContext = text; // Set global context
                uploadStatus.innerText = "Summarizing...";
                addMessage(`Uploaded ${file.name}. Summarizing...`, true);

                // Call Summarize API
                const result = await ipcRenderer.invoke('ai:summarize', text);
                addMessage(result.summary);
                uploadStatus.innerText = "File loaded";

            } catch (err) {
                console.error("Upload error:", err);
                uploadStatus.innerText = "Error";
                addMessage("Failed to read or process file.");
            }
        }
    });

    // Summarize Page Handler
    btnSummPage.addEventListener('click', async () => {
        try {
            uploadStatus.innerText = "Reading Page...";
            // Execute script in webview to get text
            const pageText = await webview.executeJavaScript('document.body.innerText');

            if (!pageText || pageText.length < 50) {
                addMessage("Page content seems empty or too short.", true);
                uploadStatus.innerText = "";
                return;
            }

            currentUploadContext = pageText;
            uploadStatus.innerText = "Summarizing Page...";
            addMessage(`Summarizing current page...`, true);

            const result = await ipcRenderer.invoke('ai:summarize', pageText);
            addMessage(result.summary);
            uploadStatus.innerText = "Page Loaded";

        } catch (err) {
            console.error("Page Summarize Error:", err);
            addMessage("Failed to read page content.");
            uploadStatus.innerText = "Error";
        }
    });

    // Chat Handler
    async function sendChat() {
        const query = chatInput.value.trim();
        if (!query) return;

        addMessage(query, true);
        chatInput.value = '';

        // Show typing indicator or something?
        // Call UI updates async
        try {
            const result = await ipcRenderer.invoke('ai:chat-notes', {
                query,
                context: currentUploadContext
            });
            addMessage(result.response);
        } catch (err) {
            addMessage("Error getting response.");
        }
    }

    btnSend.addEventListener('click', sendChat);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChat();
    });
}

// Research State
let currentWorkspaceId = null;
let currentResearchTab = 'sources'; // 'sources', 'notes', 'citations'

async function renderResearch(sources, citations) { // The old signature is partial, we need to fetch data based on workspace
    // Ideally, loadSidePanelContent calls renderResearch with NO args, and renderResearch fetches what it needs.
    // But for now, let's just redraw the structure and fetch inside.
}

async function loadSidePanelContent(mode) {
    if (mode === 'research') {
        const workspaces = await ipcRenderer.invoke('db:get-workspaces');
        await renderResearchPanel(workspaces);
    } else if (mode === 'notes') {
        // ... (existing notes logic)
        const notes = await ipcRenderer.invoke('db:get-notes'); // These are global notes? Or we deprecate 'notes' mode?
        // Let's keep 'notes' mode as "Quick Notes" (global).
        // Research mode has "Research Notes".
        renderNotes(notes);
    }
}

async function renderResearchPanel(workspaces) {
    panelContent.innerHTML = '';

    // 1. Workspace Selector Header
    const header = document.createElement('div');
    header.style = "padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px;";

    // Dropdown
    const select = document.createElement('select');
    select.style = "width: 100%; background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 5px; margin-bottom: 5px;";

    const defaultOption = document.createElement('option');
    defaultOption.text = "Select Topic...";
    defaultOption.value = "";
    select.appendChild(defaultOption);

    workspaces.forEach(ws => {
        const opt = document.createElement('option');
        opt.value = ws._id;
        opt.text = ws.title;
        if (ws._id === currentWorkspaceId) opt.selected = true;
        select.appendChild(opt);
    });

    select.addEventListener('change', async (e) => {
        currentWorkspaceId = e.target.value;
        await refreshResearchView();
    });
    header.appendChild(select);

    // Create New Button
    const createContainer = document.createElement('div');
    createContainer.style = "display: flex; gap: 5px;";

    const inputNew = document.createElement('input');
    inputNew.placeholder = "New Topic...";
    inputNew.style = "flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; padding: 4px;";

    const btnCreate = document.createElement('button');
    btnCreate.innerText = "+";
    btnCreate.style = "background: var(--accent-color); color: black; border: none; border-radius: 4px; padding: 0 10px; cursor: pointer;";

    btnCreate.onclick = async () => {
        if (inputNew.value.trim()) {
            const res = await ipcRenderer.invoke('db:create-workspace', inputNew.value.trim());
            if (res.success) {
                currentWorkspaceId = res.workspace._id;
                // Refresh list
                const ws = await ipcRenderer.invoke('db:get-workspaces');
                renderResearchPanel(ws);
            }
        }
    };

    createContainer.appendChild(inputNew);
    createContainer.appendChild(btnCreate);
    header.appendChild(createContainer);
    panelContent.appendChild(header);

    if (!currentWorkspaceId) {
        panelContent.innerHTML += `<div style="text-align: center; color: #666; margin-top: 20px;">Select or create a research topic.</div>`;
        return;
    }

    // 2. Search & Tabs
    await renderWorkspaceContent();
}

async function renderWorkspaceContent() {
    // Fetch data for current workspace
    const data = await ipcRenderer.invoke('db:get-workspace-data', currentWorkspaceId);

    // Container for Tabs and Search
    const controls = document.createElement('div');

    // Search
    const searchInput = document.createElement('input');
    searchInput.placeholder = "Search resources...";
    searchInput.style = "width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px; padding: 6px; margin-bottom: 10px;";
    searchInput.addEventListener('input', (e) => filterLists(e.target.value));
    controls.appendChild(searchInput);

    // Tabs
    const tabs = document.createElement('div');
    tabs.style = "display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 10px;";

    ['sources', 'notes', 'citations'].forEach(tab => {
        const btn = document.createElement('div');
        btn.innerText = tab.charAt(0).toUpperCase() + tab.slice(1);
        btn.style = `flex: 1; text-align: center; padding: 8px; cursor: pointer; font-size: 13px; color: ${currentResearchTab === tab ? 'var(--accent-color)' : '#888'}; border-bottom: ${currentResearchTab === tab ? '2px solid var(--accent-color)' : 'none'};`;
        btn.onclick = () => {
            currentResearchTab = tab;
            renderWorkspaceViews(data); // Re-render content
            // Update tab styles (simple hack: re-render whole content or manipulate DOM. Re-rendering 'tabs' part is cleaner if separated, but let's just re-call renderWorkspaceContent or update manually)
            // For MVP, recursing renderWorkspaceContent updates everything including fetching data again. 
            // Better: split renderWorkspaceContent into renderControls and renderLists.
            // Let's just update styles manually and call renderLists.
            Array.from(tabs.children).forEach(c => {
                c.style.color = '#888';
                c.style.borderBottom = 'none';
            });
            btn.style.color = 'var(--accent-color)';
            btn.style.borderBottom = '2px solid var(--accent-color)';
            renderLists(data, contentContainer);
        };
        tabs.appendChild(btn);
    });
    controls.appendChild(tabs);
    panelContent.appendChild(controls);

    // Content Area
    const contentContainer = document.createElement('div');
    contentContainer.id = "research-content-list";
    contentContainer.style = "flex: 1; overflow-y: auto;";
    panelContent.appendChild(contentContainer);

    renderLists(data, contentContainer);
}

function renderLists(data, container) {
    container.innerHTML = '';

    if (currentResearchTab === 'sources') {
        data.sources.forEach(source => {
            const card = document.createElement('div');
            card.className = 'list-item'; // for search
            card.style = 'background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 6px; cursor: pointer;';
            card.innerHTML = `
                <div class="search-target" style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">${source.title || 'Untitled'}</div>
                 <div style="font-size: 11px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${source.url}</div>
                 <div style="margin-top: 6px;">
                    ${(source.tags || []).map(t => {
                let color = '#888';
                if (t.includes('support')) color = 'var(--accent-color)'; // cyan
                if (t.includes('oppos')) color = '#ff4757'; // red
                if (t.includes('neut')) color = '#ffa502'; // orange
                return `<span style="display: inline-block; background: rgba(255,255,255,0.1); color: ${color}; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-right: 4px;">${t}</span>`;
            }).join('')}
                 </div>
           `;
            card.onclick = () => webview.loadURL(source.url);
            container.appendChild(card);
        });
    } else if (currentResearchTab === 'notes') {
        data.notes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'list-item';
            card.style = 'background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 6px; font-size: 13px; white-space: pre-wrap;';
            card.innerHTML = `<div class="search-target">${note.content}</div>`;
            container.appendChild(card);
        });
    } else if (currentResearchTab === 'citations') {
        data.citations.forEach(cit => {
            const card = document.createElement('div');
            card.className = 'list-item';
            card.style = 'background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 6px; border-left: 3px solid var(--accent-secondary);';
            card.innerHTML = `
                <div class="search-target" style="font-style: italic; font-size: 13px; margin-bottom: 5px;">"${cit.content}"</div>
                <div style="font-size: 11px; color: #aaa;">${cit.sourceUrl}</div>
                <div style="font-size: 10px; color: #666; margin-top: 5px; text-transform: uppercase;">${cit.citationStyle || 'Auto'}</div>
            `;
            container.appendChild(card);
        });
    }
}

function filterLists(query) {
    const items = document.querySelectorAll('.list-item');
    query = query.toLowerCase();
    items.forEach(item => {
        const text = item.querySelector('.search-target')?.innerText.toLowerCase() || "";
        if (text.includes(query)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

async function refreshResearchView() {
    const workspaces = await ipcRenderer.invoke('db:get-workspaces');
    renderResearchPanel(workspaces);
}

btnNotes.addEventListener('click', () => togglePanel('notes'));
btnResearch.addEventListener('click', () => togglePanel('research'));


// AI / Voice Logic
let isListening = false;
voiceOrb.addEventListener('click', () => {
    if (!isListening) {
        startListening();
    } else {
        stopListening();
    }
});

let mediaRecorder;
let audioChunks = [];

async function startListening() {
    isListening = true;
    voiceOrb.classList.add('listening');
    console.log('Requesting microphone access...');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Electron typically records webm
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = Buffer.from(arrayBuffer).toString('base64');

            console.log('Audio recorded, sending to Gemini...');
            handleAIPrompt({ audio: base64Audio });

            // Stop all tracks to release mic
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        console.log('MediaRecorder started');

    } catch (err) {
        console.error('Error accessing microphone:', err);
        stopListening();
    }
}

function stopListening() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('MediaRecorder stopped');
    }
    isListening = false;
    voiceOrb.classList.remove('listening');
}

async function handleAIPrompt(prompt) {
    console.log('Processing AI Prompt:', prompt);

    // Inject Context (URL, Title, Selection)
    let context = {};
    if (typeof prompt === 'string' || prompt.audio) {
        try {
            const title = await webview.getTitle();
            const url = webview.getURL();
            // Attempt to get selection
            const selection = await webview.executeJavaScript('window.getSelection().toString()');

            context = { title, url, selection };

            // Inject Workspace ID if selected
            if (isPanelOpen && sidePanel.dataset.mode === 'research' && currentWorkspaceId) {
                context.workspaceId = currentWorkspaceId;
            }

            // If request is object (audio), attach context
            if (typeof prompt === 'object' && prompt.audio) {
                prompt.context = context;
            } else if (typeof prompt === 'string') {
                // If string, we might need to wrap it
                // The main process expects 'prompt' to be string or object
                // Let's change the contract in main? Or wrap here.
                // Update: ai:chat handler expects 'prompt'. The service can handle { text, context }.
                prompt = { text: prompt, context };
            }
        } catch (e) {
            console.log("Could not get webview context", e);
        }
    }

    try {
        const result = await ipcRenderer.invoke('ai:chat', prompt);
        console.log('AI Result:', result);

        if (result.audioData) {
            console.log('Playing audio response...');
            const audio = new Audio(`data:audio/mp3;base64,${result.audioData}`);
            audio.play();
        }

        if (result.type === 'NAVIGATE') {
            webview.loadURL(result.payload);
        } else if (result.type === 'SAVE_SOURCE' || result.type === 'SAVE_CITATION' || result.type === 'CREATE_NOTE') {
            // Refresh panel if open
            if (isPanelOpen && sidePanel.dataset.mode === 'research') {
                if (currentWorkspaceId) {
                    renderWorkspaceContent(); // Refresh tabs
                    // Ideally we should switch tab if needed? e.g. if I saved a source, go to sources tab.
                    if (result.type === 'SAVE_SOURCE') {
                        currentResearchTab = 'sources';
                        // Trigger click logic manually or update UI
                        // renderWorkspaceContent() handles currentResearchTab
                    } else if (result.type === 'SAVE_CITATION') {
                        currentResearchTab = 'citations';
                    } else if (result.type === 'CREATE_NOTE' && result.payload.workspaceId) {
                        currentResearchTab = 'notes';
                    }
                    renderWorkspaceContent(); // Call again to reflect tab change
                } else {
                    loadSidePanelContent('research'); // Fallback if no workspace selected/concept
                }
            } else if (isPanelOpen && sidePanel.dataset.mode === 'notes' && result.type === 'CREATE_NOTE') {
                loadSidePanelContent('notes');
            }

            // Show notification toast?
            new Notification('Broser Research', { body: result.response });
        }

    } catch (err) {
        console.error('IPC Error in renderer:', err);
    }
}
