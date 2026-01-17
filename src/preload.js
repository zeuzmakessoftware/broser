const { contextBridge, ipcRenderer } = require('electron');

// Expose secure APIs to renderer process
contextBridge.exposeInMainWorld('browserAPI', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
  },

  // AI Services
  ai: {
    chat: (message, context) => ipcRenderer.invoke('ai-chat', { message, context }),
    summarize: (content, url) => ipcRenderer.invoke('ai-summarize', { content, url }),
    extractIntent: (voiceCommand) => ipcRenderer.invoke('ai-extract-intent', { voiceCommand })
  },

  // Voice Services
  voice: {
    speak: (text) => ipcRenderer.invoke('voice-speak', { text })
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
});

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
});
