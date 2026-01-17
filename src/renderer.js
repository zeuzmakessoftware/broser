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
    notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-card';
        div.style = 'background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 10px; border-radius: 8px; font-size: 13px;';
        div.innerText = note.content;
        panelContent.appendChild(div);
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
