const { contextBridge, ipcRenderer } = require('electron');

const BROWSER_API = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
  },

  // AI Services
  ai: {
    chat: (message, context) => ipcRenderer.invoke('ai:chat', { message, context }), // Fixed channel name mismatch (ai-chat -> ai:chat)
    summarize: (content, url) => ipcRenderer.invoke('ai:summarize', { content, url }),
    extractIntent: (voiceCommand) => ipcRenderer.invoke('ai:extract-intent', { voiceCommand })
  },

  // Voice Services
  voice: {
    speak: (text) => ipcRenderer.invoke('voice:speak', { text }) // Fixed channel name mismatch (voice-speak -> voice:speak)
  },

  // Workflow Services
  workflow: {
    trigger: (workflowId, data) => ipcRenderer.invoke('trigger-workflow', { workflowId, data })
  },

  // API Requests (for MongoDB backend)
  api: {
    get: (endpoint) => ipcRenderer.invoke('api-request', { method: 'GET', endpoint }),
    post: (endpoint, data) => ipcRenderer.invoke('api-request', { method: 'POST', endpoint, data }),
    put: (endpoint, data) => ipcRenderer.invoke('api-request', { method: 'PUT', endpoint, data }),
    delete: (endpoint) => ipcRenderer.invoke('api-request', { method: 'DELETE', endpoint })
  }
};

const PLATFORM_API = {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
};

// Since contextIsolation is false, we can attach directly to window
// logic: try contextBridge first, if it throws/fails (which it shouldn't if iso is on, but here iso is off), fallback.
// Actually, if contextIsolation is false, contextBridge might not work as expected or strip prototypes.
// Safest bet for 'nodeIntegration: true, contextIsolation: false' is direct assignment.

try {
  contextBridge.exposeInMainWorld('browserAPI', BROWSER_API);
  contextBridge.exposeInMainWorld('platform', PLATFORM_API);
} catch (error) {
  // Fallback for contextIsolation: false
  window.browserAPI = BROWSER_API;
  window.platform = PLATFORM_API;
}
