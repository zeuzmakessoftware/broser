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

ipcMain.handle('db:save-note', async (event, content) => {
  try {
    const note = await Note.create({ content });
    return { success: true, note };
  } catch (error) {
    console.error('Error saving note:', error);
    return { success: false, error: (error as any).message };
  }
});

ipcMain.handle('db:get-notes', async () => {
  try {
    return await Note.find().sort({ createdAt: -1 });
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
    return await Task.find().sort({ createdAt: -1 });
  } catch (error) {
    return [];
  }
});

// Research Handlers
ipcMain.handle('db:get-sources', async () => {
  try {
    return await Source.find().sort({ createdAt: -1 });
  } catch (error) {
    return [];
  }
});

ipcMain.handle('db:get-citations', async () => {
  try {
    return await Citation.find().sort({ createdAt: -1 });
  } catch (error) {
    return [];
  }
});

// Workspace Handlers
ipcMain.handle('db:get-workspaces', async () => {
  try {
    return await Workspace.find().sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return [];
  }
});

ipcMain.handle('db:create-workspace', async (event, title) => {
  try {
    const workspace = await Workspace.create({ title });
    return { success: true, workspace };
  } catch (error) {
    console.error('Error creating workspace:', error);
    return { success: false, error: (error as any).message };
  }
});

ipcMain.handle('db:get-workspace-data', async (event, workspaceId) => {
  try {
    const [notes, sources, citations] = await Promise.all([
      Note.find({ workspaceId }).sort({ createdAt: -1 }),
      Source.find({ workspaceId }).sort({ createdAt: -1 }),
      Citation.find({ workspaceId }).sort({ createdAt: -1 })
    ]);
    return { notes, sources, citations };
  } catch (error) {
    console.error('Error fetching workspace data:', error);
    return { notes: [], sources: [], citations: [] };
  }
});

// AI & Voice Handler
ipcMain.handle('ai:chat', async (event, prompt) => {
  try {
    console.log('Received AI Prompt:', prompt);
    // prompt can be string or object { audio: base64 }
    const aiResponse = await aiService.processPrompt(prompt);
    console.log('AI Response:', aiResponse);

    // Handle Side Effects (DB Operations)
    if (aiResponse.type === 'CREATE_NOTE') {
      const content = typeof aiResponse.payload === 'string' ? aiResponse.payload : aiResponse.payload.content;
      await Note.create({ content });
    } else if (aiResponse.type === 'CREATE_TASK') { // LEGACY support
      const title = typeof aiResponse.payload === 'string' ? aiResponse.payload : aiResponse.payload.title;
      await Task.create({ title });
    } else if (aiResponse.type === 'SAVE_SOURCE') {
      await Source.create(aiResponse.payload);
    } else if (aiResponse.type === 'SAVE_CITATION') {
      await Citation.create(aiResponse.payload);
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

ipcMain.handle('ai:summarize', async (event, text) => {
  return await aiService.summarizeContent(text);
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
