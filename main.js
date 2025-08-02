const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
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

    // Load the production.html file as default
    mainWindow.loadFile('production.html');

    // Create application menu
    createMenu();

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

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Production Mode',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        mainWindow.loadFile('production.html');
                    }
                },
                {
                    label: 'Configuration',
                    accelerator: 'CmdOrCtrl+Shift+C',
                    click: () => {
                        mainWindow.loadFile('config.html');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        }
    ];

    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });

        // Window menu
        template[3].submenu = [
            { role: 'close' },
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { role: 'front' }
        ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
    createWindow();
});

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



// Handle configuration file operations
ipcMain.handle('save-config', async (event, configData) => {
    try {
        // Get the directory where the executable is located
        let exeDir;
        if (app.isPackaged) {
            // For packaged app, use the directory containing the executable
            exeDir = path.dirname(process.execPath);
        } else {
            // For development, use the current directory
            exeDir = __dirname;
        }
        
        const configPath = path.join(exeDir, 'barcode_verification_config.json');
        
        console.log('Saving config to:', configPath);
        console.log('App is packaged:', app.isPackaged);
        console.log('Process execPath:', process.execPath);
        console.log('Exe directory:', exeDir);
        
        await fs.promises.writeFile(configPath, JSON.stringify(configData, null, 2), 'utf8');
        console.log('Config saved successfully');
        return { success: true, path: configPath };
    } catch (error) {
        console.error('Error saving config:', error);
        console.error('Error details:', {
            code: error.code,
            path: error.path,
            syscall: error.syscall
        });
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-config', async (event) => {
    try {
        // Get the directory where the executable is located
        let exeDir;
        if (app.isPackaged) {
            // For packaged app, use the directory containing the executable
            exeDir = path.dirname(process.execPath);
        } else {
            // For development, use the current directory
            exeDir = __dirname;
        }
        
        const exeConfigPath = path.join(exeDir, 'barcode_verification_config.json');
        
        console.log('Loading config from:', exeConfigPath);
        console.log('App is packaged:', app.isPackaged);
        console.log('Exe directory:', exeDir);
        
        // Try to load from exe directory first
        if (fs.existsSync(exeConfigPath)) {
            console.log('Config found in exe directory');
            const data = await fs.promises.readFile(exeConfigPath, 'utf8');
            return { success: true, data: JSON.parse(data), source: 'exe_directory' };
        }
        
        // Try to load from project root (current directory) - for development
        if (!app.isPackaged) {
            const projectConfigPath = path.join(__dirname, 'barcode_verification_config.json');
            console.log('Checking project config path:', projectConfigPath);
            if (fs.existsSync(projectConfigPath)) {
                console.log('Config found in project root');
                const data = await fs.promises.readFile(projectConfigPath, 'utf8');
                return { success: true, data: JSON.parse(data), source: 'project_root' };
            }
        }
        
        // If no config found, create a default one in exe directory
        console.log('No configuration file found, creating default');
        const defaultConfig = {
            "stationTitle": "",
            "skus": {},
            "lastUpdated": new Date().toISOString(),
            "version": "1.0.0"
        };
        
        try {
            await fs.promises.writeFile(exeConfigPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
            console.log('Default config created at:', exeConfigPath);
            return { success: true, data: defaultConfig, source: 'default_created' };
        } catch (writeError) {
            console.warn('Cannot write to exe directory:', writeError.message);
            return { success: false, error: 'No configuration file found and cannot create default' };
        }
    } catch (error) {
        console.error('Error loading config:', error);
        return { success: false, error: error.message };
    }
});

// Handle CSV file operations
ipcMain.handle('save-csv', async (event, filename, csvData) => {
    try {
        // Get the directory where the executable is located
        let exeDir;
        if (app.isPackaged) {
            // For packaged app, use the directory containing the executable
            exeDir = path.dirname(process.execPath);
        } else {
            // For development, use the current directory
            exeDir = __dirname;
        }
        
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


// Check if file exists in exe directory
ipcMain.handle('file-exists', async (event, filename) => {
    try {
        // Get the directory where the executable is located
        let exeDir;
        if (app.isPackaged) {
            // For packaged app, use the directory containing the executable
            exeDir = path.dirname(process.execPath);
        } else {
            // For development, use the current directory
            exeDir = __dirname;
        }
        
        const filePath = path.join(exeDir, filename);
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