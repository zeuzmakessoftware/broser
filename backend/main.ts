import { app, BrowserWindow, ipcMain, session, systemPreferences } from 'electron';
import path from 'path';
import connectDB from './db';

// Models
import Note from './models/Note';
import Task from './models/Task';
import Source from './models/Source';
import Citation from './models/Citation';
import Workspace from './models/Workspace';

// Services
import * as aiService from './services/ai';
import * as voiceService from './services/voice';

// Connect to MongoDB
connectDB();

// Declare global mainWindow
declare global {
  // eslint-disable-next-line no-var
  var mainWindow: BrowserWindow | undefined;
}

// ... (Window creation logic remains)

ipcMain.handle('db:save-note', async (event, payload: any) => {
  try {
    const { content, workspaceId } = typeof payload === 'string' ? { content: payload } : payload;
    const note = await Note.create({ content, workspaceId });
    return { success: true, note };
  } catch (error) {
    console.error('Error saving note:', error);
    return { success: false, error: (error as any).message };
  }
});

ipcMain.handle('db:get-notes', async () => {
  try {
    const res = await Note.find().sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(res));
  } catch (error) {
    return [];
  }
});

ipcMain.handle('db:create-task', async (event, title) => {
  try {
    const task = await Task.create({ title });
    return { success: true, task };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: (error as any).message };
  }
});

ipcMain.handle('db:get-tasks', async () => {
  try {
    const res = await Task.find().sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(res));
  } catch (error) {
    return [];
  }
});

// Research Handlers
ipcMain.handle('db:get-sources', async () => {
  try {
    const res = await Source.find().sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(res));
  } catch (error) {
    return [];
  }
});

ipcMain.handle('db:get-citations', async () => {
  try {
    const res = await Citation.find().sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(res));
  } catch (error) {
    return [];
  }
});

// Workspace Handlers
ipcMain.handle('db:get-workspaces', async () => {
  try {
    const res = await Workspace.find().sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(res));
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return [];
  }
});

ipcMain.handle('db:create-workspace', async (event, title) => {
  try {
    const workspace = await Workspace.create({ title });
    // Ensure we return a plain object with string ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsObj: any = workspace.toObject();
    wsObj._id = wsObj._id.toString();
    return { success: true, workspace: wsObj };
  } catch (error) {
    console.error('Error creating workspace:', error);
    return { success: false, error: (error as any).message };
  }
});

ipcMain.handle('db:get-workspace-data', async (event, workspaceId) => {
  try {
    console.log(`[DEBUG] Fetching data for workspace: ${workspaceId}`);
    const [notes, sources, citations] = await Promise.all([
      Note.find({ workspaceId }).sort({ createdAt: -1 }).lean(),
      Source.find({ workspaceId }).sort({ createdAt: -1 }).lean(),
      Citation.find({ workspaceId }).sort({ createdAt: -1 }).lean()
    ]);
    
    console.log(`[DEBUG] Found ${notes.length} notes, ${sources.length} sources, ${citations.length} citations`);
    
    return { 
        notes: JSON.parse(JSON.stringify(notes)), 
        sources: JSON.parse(JSON.stringify(sources)), 
        citations: JSON.parse(JSON.stringify(citations)) 
    };
  } catch (error) {
    console.error('Error fetching workspace data:', error);
    return { notes: [], sources: [], citations: [] };
  }
});

// AI & Voice Handler
// Helper to handle individual AI actions
const handleAIAction = async (action: { type: string, payload: any }) => {
    if (action.type === 'CREATE_NOTE') {
        const content = typeof action.payload === 'string' ? action.payload : action.payload.content;
        const workspaceId = typeof action.payload === 'object' ? action.payload.workspaceId : undefined;
        await Note.create({ content, workspaceId });
    } else if (action.type === 'CREATE_TASK') { // LEGACY support
        const title = typeof action.payload === 'string' ? action.payload : action.payload.title;
        await Task.create({ title });
    } else if (action.type === 'SAVE_SOURCE') {
        await Source.create(action.payload);
    } else if (action.type === 'SAVE_CITATION') {
        await Citation.create(action.payload);
    } else if (action.type === 'RESEARCH') {
        const { topic } = action.payload;
        if (topic) {
            const workspace = await Workspace.create({ title: topic });
            // IMPORTANT: Return the new workspaceId in the payload so the frontend can switch
            action.payload.workspaceId = workspace._id.toString();
        }
    }
};

ipcMain.handle('ai:chat', async (event, prompt) => {
// ... (caller of handleAIAction)
// note: replace_file_content with context needed. This chunk only targets handleAIAction
// I will target the full file content for DB handlers next.
// Wait, I should do them in one tool call if possible or separate.
// I'll do handleAIAction first.

  try {
    console.log('Received AI Prompt:', prompt);
    const aiResponse = await aiService.processPrompt(prompt);
    console.log('AI Response:', aiResponse);

    // Handle Side Effects
    if (aiResponse.type === 'MULTI_ACTION') {
        if (aiResponse.payload && Array.isArray(aiResponse.payload.actions)) {
            for (const action of aiResponse.payload.actions) {
                await handleAIAction(action);
            }
        }
    } else {
        await handleAIAction(aiResponse);
    }

    // Generate Audio if there is a spoken response
    let audioData = null;
    if (aiResponse.response) {
      audioData = await voiceService.streamAudio(aiResponse.response);
    }

    return { ...aiResponse, audioData };

  } catch (error) {
    console.error('AI IPC Error:', error);
    return { type: 'ANSWER', response: "Sorry, something went wrong.", audioData: null };
  }
});

ipcMain.handle('ai:summarize', async (event, payload: any) => {
  const content = typeof payload === 'string' ? payload : payload.content;
  return await aiService.summarizeContent(content);
});

ipcMain.handle('ai:chat-notes', async (event, { query, context }) => {
  // If context is not provided, fetch all notes from DB
  let finalContext = context;
  if (!finalContext) {
    try {
      const notes = await Note.find().sort({ createdAt: -1 });
      finalContext = notes.map(n => n.content).join('\n---\n');
    } catch (e) {
      console.error("Error fetching notes for context", e);
      finalContext = "";
    }
  }
  return await aiService.processChatWithContext(query, finalContext);
});

ipcMain.handle('ai:generate-study-materials', async (event, { content }) => {
  return await aiService.generateStudyMaterials(content);
});

ipcMain.handle('ai:generate-more-quiz', async (event, { content, existingQuestions }) => {
  return await aiService.generateMoreQuizQuestions(content, existingQuestions);
});

ipcMain.handle('ai:generate-more-flashcards', async (event, { content, existingFlashcards }) => {
  return await aiService.generateMoreFlashcards(content, existingFlashcards);
});

ipcMain.handle('ai:analyze-source', async (event, { content, topic }) => {
  return await aiService.analyzeSource(content, topic);
});
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800, // Stash had these
    minHeight: 600,
    frame: false, // Stash design
    transparent: false,
    backgroundColor: '#0a0a0f', // Stash dark theme
    titleBarStyle: 'hidden', // Stash style
    trafficLightPosition: { x: 16, y: 16 }, // Stash style
    webPreferences: {
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'), // Compiled to dist/preload.js (needs build config)
      nodeIntegration: true, // KEEPING CURRENT LOGIC for compatibility
      contextIsolation: false, // KEEPING CURRENT LOGIC
      sandbox: false // Stash had false
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
    // Open dev tools in dev mode
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  // Handle permission requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'accessibility'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Stash had IPC handlers for window controls, let's add them to the window instance or main
  // We need to store reference to 'win' if we want to use IPC handlers outside this scope,
  // OR we can define them here/global. Current main.js defines 'createWindow' but doesn't store 'win' in a global 'mainWindow' variable accessible to IPC handlers defined outside.
  // Wait, current main.js defines 'win' inside 'createWindow'. Stash had 'let mainWindow'.
  // I should probably switch to 'let mainWindow' pattern to support IPC handlers if I add them.
  global.mainWindow = win;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Explicitly ask for media access on macOS
  if (process.platform === 'darwin') {
    const askForMediaAccess = async () => {
      try {
        const micStatus = await systemPreferences.askForMediaAccess('microphone');
        console.log('Microphone access:', micStatus);

        const camStatus = await systemPreferences.askForMediaAccess('camera');
        console.log('Camera access:', camStatus);
      } catch (err) {
        console.error('Error asking for media access:', err);
      }
    };

    askForMediaAccess();
  }

  // Window control handlers (From Stash)
  ipcMain.on('window-minimize', () => {
    global.mainWindow?.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (global.mainWindow?.isMaximized()) {
      global.mainWindow.unmaximize();
    } else {
      global.mainWindow?.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    global.mainWindow?.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return global.mainWindow?.isMaximized();
  });


});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
