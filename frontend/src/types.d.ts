/// <reference types="vite/client" />

interface BrowserAPI {
    window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
    };
    ai: {
        chat: (message: string | { text?: string; audio?: string; context?: any }, context?: any) => Promise<any>;
        summarize: (content: string, url?: string) => Promise<{ summary: string }>;
        extractIntent: (voiceCommand: string) => Promise<any>;
        chatNotes: (query: string, context?: string) => Promise<{ response: string }>;
        generateStudyMaterials: (content: string) => Promise<{ summary: string; quiz: any[]; flashcards: any[] }>;
    };
    voice: {
        speak: (text: string) => Promise<void>;
    };
    workflow: {
        trigger: (workflowId: string, data: any) => Promise<any>;
    };
    api: {
        get: (endpoint: string) => Promise<any>;
        post: (endpoint: string, data: any) => Promise<any>;
        put: (endpoint: string, data: any) => Promise<any>;
        delete: (endpoint: string) => Promise<any>;
    };
    db: {
        getWorkspaces: () => Promise<any[]>;
        createWorkspace: (title: string) => Promise<any>;
        getWorkspaceData: (id: string) => Promise<any>;
        getNotes: () => Promise<any[]>;
        saveNote: (content: string, workspaceId?: string) => Promise<any>;
    };
}

interface Window {
    browserAPI: BrowserAPI;
    platform: {
        isMac: boolean;
        isWindows: boolean;
        isLinux: boolean;
    };
}
