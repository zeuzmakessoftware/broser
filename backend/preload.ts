import { contextBridge, ipcRenderer } from 'electron';

// Define the API types if needed (or keep inferred)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chat: (message: any, context: any) => ipcRenderer.invoke('ai:chat', { message, context }), 
    summarize: (content: string, url?: string) => ipcRenderer.invoke('ai:summarize', { content, url }),
    extractIntent: (voiceCommand: string) => ipcRenderer.invoke('ai:extract-intent', { voiceCommand })
  },

  // Voice Services
  voice: {
    speak: (text: string) => ipcRenderer.invoke('voice:speak', { text })
  },

  // Workflow Services
  workflow: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trigger: (workflowId: string, data: any) => ipcRenderer.invoke('trigger-workflow', { workflowId, data })
  },

  // API Requests (for MongoDB backend)
  api: {
    get: (endpoint: string) => ipcRenderer.invoke('api-request', { method: 'GET', endpoint }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    post: (endpoint: string, data: any) => ipcRenderer.invoke('api-request', { method: 'POST', endpoint, data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    put: (endpoint: string, data: any) => ipcRenderer.invoke('api-request', { method: 'PUT', endpoint, data }),
    delete: (endpoint: string) => ipcRenderer.invoke('api-request', { method: 'DELETE', endpoint })
  },

  // Database Direct Access (Legacy/Core)
  db: {
    getWorkspaces: () => ipcRenderer.invoke('db:get-workspaces'),
    createWorkspace: (title: string) => ipcRenderer.invoke('db:create-workspace', title),
    getWorkspaceData: (id: string) => ipcRenderer.invoke('db:get-workspace-data', id),
    getNotes: () => ipcRenderer.invoke('db:get-notes'),
    saveNote: (content: string) => ipcRenderer.invoke('db:save-note', content)
  }
};

const PLATFORM_API = {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
};

// Augment window interface
declare global {
  interface Window {
    browserAPI: typeof BROWSER_API;
    platform: typeof PLATFORM_API;
  }
}

try {
  contextBridge.exposeInMainWorld('browserAPI', BROWSER_API);
  contextBridge.exposeInMainWorld('platform', PLATFORM_API);
} catch (error) {
  // Fallback for contextIsolation: false
  window.browserAPI = BROWSER_API;
  window.platform = PLATFORM_API;
}
