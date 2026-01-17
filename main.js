const { app, BrowserWindow, ipcMain, session, systemPreferences } = require('electron');
const path = require('path');
const connectDB = require('./src/db');
const Note = require('./src/models/Note');
const Task = require('./src/models/Task');

// Connect to MongoDB
connectDB();

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
      preload: path.join(__dirname, 'src', 'preload.js'), // Moved to src
      nodeIntegration: true, // KEEPING CURRENT LOGIC for compatibility
      contextIsolation: false, // KEEPING CURRENT LOGIC
      sandbox: false // Stash had false
    },
  });

  win.loadFile('src/index.html'); // Moved to src

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

  // IPC: Database Handlers
  ipcMain.handle('db:save-note', async (event, content) => {
    try {
      const note = await Note.create({ content });
      return { success: true, note };
    } catch (error) {
      console.error('Error saving note:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:get-notes', async () => {
    try {
      return await Note.find().sort({ createdAt: -1 });
    } catch (error) {
      return [];
    }
  });

  // AI & Voice Handler
  ipcMain.handle('ai:chat', async (event, prompt) => {
    try {
      console.log('Received AI Prompt:', prompt);
      // prompt can be string or object { audio: base64 }
      const aiResponse = await require('./src/services/ai').processPrompt(prompt);
      console.log('AI Response:', aiResponse);

      // Handle Side Effects (DB Operations)
      if (aiResponse.type === 'CREATE_NOTE') {
        const content = typeof aiResponse.payload === 'string' ? aiResponse.payload : aiResponse.payload.content;
        await Note.create({ content });
      } else if (aiResponse.type === 'CREATE_TASK') {
        const title = typeof aiResponse.payload === 'string' ? aiResponse.payload : aiResponse.payload.title;
        await Task.create({ title });
      }

      // Generate Audio if there is a spoken response
      let audioData = null;
      if (aiResponse.response) {
        audioData = await require('./src/services/voice').streamAudio(aiResponse.response);
      }

      return { ...aiResponse, audioData };

    } catch (error) {
      console.error('AI IPC Error:', error);
      return { type: 'ANSWER', response: "Sorry, something went wrong.", audioData: null };
    }
  });

  ipcMain.handle('db:create-task', async (event, title) => {
    try {
      const task = await Task.create({ title });
      return { success: true, task };
    } catch (error) {
      console.error('Error creating task:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:get-tasks', async () => {
    try {
      return await Task.find().sort({ createdAt: -1 });
    } catch (error) {
      return [];
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
