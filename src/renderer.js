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
const btnTasks = document.getElementById('btn-tasks');

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


function renderTasks(tasks) {
    panelContent.innerHTML = '';
    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-card';
        div.style = 'background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 10px; border-radius: 8px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;';

        const span = document.createElement('span');
        span.innerText = task.title;

        const check = document.createElement('input');
        check.type = 'checkbox';
        check.checked = task.completed;

        div.appendChild(span);
        div.appendChild(check);
        panelContent.appendChild(div);
    });
}

btnNotes.addEventListener('click', () => togglePanel('notes'));
btnTasks.addEventListener('click', () => togglePanel('tasks'));

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
    // 1. Send to Main -> Gemini
    // 2. Main returns action or response
    // 3. Perform action (navigate) or speak response

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
        }

    } catch (err) {
        console.error('IPC Error in renderer:', err);
    }
}
