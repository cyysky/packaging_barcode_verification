const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
    // Create the browser window with optimized settings for widescreen
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1400,
        minHeight: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: add icon
        title: 'Barcode Verification System',
        show: false // Don't show until ready
    });

    // Load the index.html file
    mainWindow.loadFile('index.html');

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Focus on the window
        if (process.platform === 'darwin') {
            app.focus();
        } else {
            mainWindow.focus();
        }
    });

    // Open DevTools in development mode
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    // Emitted when the window is closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle window maximize/restore
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-maximized');
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-restored');
    });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// File System API Handlers

// Get application data directory
function getAppDataPath() {
    const userDataPath = app.getPath('userData');
    const appDataDir = path.join(userDataPath, 'BarcodeVerification');
    
    // Ensure directory exists
    if (!fs.existsSync(appDataDir)) {
        fs.mkdirSync(appDataDir, { recursive: true });
    }
    
    return appDataDir;
}

// Handle configuration file operations
ipcMain.handle('save-config', async (event, configData) => {
    try {
        // Get the directory where the executable is located
        const exeDir = process.pkg ? path.dirname(process.execPath) : __dirname;
        const configPath = path.join(exeDir, 'barcode_verification_config.json');
        
        await fs.promises.writeFile(configPath, JSON.stringify(configData, null, 2), 'utf8');
        return { success: true, path: configPath };
    } catch (error) {
        console.error('Error saving config:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-config', async (event) => {
    try {
        // Get the directory where the executable is located
        const exeDir = process.pkg ? path.dirname(process.execPath) : __dirname;
        const exeConfigPath = path.join(exeDir, 'barcode_verification_config.json');
        
        // Try to load from exe directory first
        if (fs.existsSync(exeConfigPath)) {
            const data = await fs.promises.readFile(exeConfigPath, 'utf8');
            return { success: true, data: JSON.parse(data), source: 'exe_directory' };
        }
        
        // Try to load from project root (current directory)
        const projectConfigPath = path.join(__dirname, 'barcode_verification_config.json');
        if (fs.existsSync(projectConfigPath)) {
            const data = await fs.promises.readFile(projectConfigPath, 'utf8');
            return { success: true, data: JSON.parse(data), source: 'project_root' };
        }
        
        // Fallback to app data directory
        const appDataPath = getAppDataPath();
        const appDataConfigPath = path.join(appDataPath, 'barcode_verification_config.json');
        if (fs.existsSync(appDataConfigPath)) {
            const data = await fs.promises.readFile(appDataConfigPath, 'utf8');
            return { success: true, data: JSON.parse(data), source: 'appdata' };
        }
        
        return { success: false, error: 'No configuration file found' };
    } catch (error) {
        console.error('Error loading config:', error);
        return { success: false, error: error.message };
    }
});

// Handle CSV file operations
ipcMain.handle('save-csv', async (event, filename, csvData) => {
    try {
        // Get the directory where the executable is located
        const exeDir = process.pkg ? path.dirname(process.execPath) : __dirname;
        const csvPath = path.join(exeDir, filename);
        
        // Check if file exists
        const fileExists = fs.existsSync(csvPath);
        
        if (fileExists) {
            // File exists, append with newline
            await fs.promises.appendFile(csvPath, csvData, 'utf8');
        } else {
            // File doesn't exist, create new file
            await fs.promises.writeFile(csvPath, csvData, 'utf8');
        }
        
        return { success: true, path: csvPath };
    } catch (error) {
        console.error('Error saving CSV:', error);
        return { success: false, error: error.message };
    }
});

// Handle file dialog operations
ipcMain.handle('show-save-dialog', async (event, options) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: options.title || 'Save File',
            defaultPath: options.defaultPath || '',
            filters: options.filters || [
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        return result;
    } catch (error) {
        console.error('Error showing save dialog:', error);
        return { canceled: true, error: error.message };
    }
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: options.title || 'Open File',
            defaultPath: options.defaultPath || '',
            filters: options.filters || [
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: options.properties || ['openFile']
        });
        
        return result;
    } catch (error) {
        console.error('Error showing open dialog:', error);
        return { canceled: true, error: error.message };
    }
});

// Read file content
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return { success: true, data };
    } catch (error) {
        console.error('Error reading file:', error);
        return { success: false, error: error.message };
    }
});

// Write file content
ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        await fs.promises.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Error writing file:', error);
        return { success: false, error: error.message };
    }
});

// Check if file exists
ipcMain.handle('file-exists', async (event, filePath) => {
    try {
        return { success: true, exists: fs.existsSync(filePath) };
    } catch (error) {
        console.error('Error checking file existence:', error);
        return { success: false, error: error.message };
    }
});

// Get system information
ipcMain.handle('get-system-info', async (event) => {
    return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        appVersion: app.getVersion(),
        appDataPath: getAppDataPath(),
        userDataPath: app.getPath('userData'),
        documentsPath: app.getPath('documents'),
        desktopPath: app.getPath('desktop')
    };
});

// Handle app menu and shortcuts
ipcMain.handle('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.restore();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.handle('close-window', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

// Export data to external location
ipcMain.handle('export-data', async (event, data, filename) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Data',
            defaultPath: filename,
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        if (!result.canceled && result.filePath) {
            await fs.promises.writeFile(result.filePath, data, 'utf8');
            return { success: true, path: result.filePath };
        }
        
        return { success: false, canceled: true };
    } catch (error) {
        console.error('Error exporting data:', error);
        return { success: false, error: error.message };
    }
});