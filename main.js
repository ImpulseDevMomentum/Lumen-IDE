const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const https = require('https')
const { autoUpdater } = require('electron-updater')

let mainWindow
let runningProcess = null
let currentWorkingDirectory = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function checkForUpdates() {
    const versionUrl = 'https://raw.githubusercontent.com/ImpulseDevMomentum/Lumen/main/version.json'
    const filesMap = {
        'lang.py': 'https://raw.githubusercontent.com/ImpulseDevMomentum/Lumen/main/lang.py',
        'shell.py': 'https://raw.githubusercontent.com/ImpulseDevMomentum/Lumen/main/shell.py',
        'errorcomp.py': 'https://raw.githubusercontent.com/ImpulseDevMomentum/Lumen/main/errorcomp.py'
    }

    try {
        const settingsPath = path.join(__dirname, 'settings.json')
        let settings = { theme: "dark", font_size: 12, font_family: "Consolas" }
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
        }

        const remoteVersion = await fetchJson(versionUrl)
        const remoteVersionNum = remoteVersion.LANG.VERSION
        
        if (!settings.VERSION_LANG || settings.VERSION_LANG !== remoteVersionNum) {
            console.log(`Updating from version ${settings.VERSION_LANG || 'none'} to ${remoteVersionNum}`)
            
            for (const [file, url] of Object.entries(filesMap)) {
                const content = await fetchText(url)
                fs.writeFileSync(path.join(__dirname, file), content)
            }
            
            settings.VERSION_LANG = remoteVersionNum
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4))
            
            return true
        }
        
        return false
    } catch (error) {
        console.error('Update check failed:', error)
        return false
    }
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = ''
            res.on('data', (chunk) => data += chunk)
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data))
                } catch (e) {
                    reject(e)
                }
            })
        }).on('error', reject)
    })
}

function fetchText(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = ''
            res.on('data', (chunk) => data += chunk)
            res.on('end', () => resolve(data))
        }).on('error', reject)
    })
}

async function createWindow() {
    const updated = await checkForUpdates()
    if (updated) {
        console.log('Files were updated to latest version')
    }

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        frame: true,
        icon: path.join(__dirname, 'assets', 'images', 'icon.ico'),
        title: 'Lumen IDE'
    })

    mainWindow.setMenu(null)

    mainWindow.loadFile(path.join(__dirname, 'index.html'))
    mainWindow.maximize()

    autoUpdater.checkForUpdatesAndNotify();
}

app.on('render-process-gone', (event, webContents, details) => {
    console.error('Render process gone:', details)
})

app.on('child-process-gone', (event, details) => {
    console.error('Child process gone:', details)
})

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

ipcMain.handle('open-file', async (event, filePath = null) => {
    if (filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return { path: filePath, content };
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Lumen Files', extensions: ['lum'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
        const content = fs.readFileSync(result.filePaths[0], 'utf8')
        return { path: result.filePaths[0], content }
    }
    return null
})

ipcMain.handle('save-file', async (event, { path, content }) => {
    if (!path) {
        const result = await dialog.showSaveDialog(mainWindow, {
            filters: [
                { name: 'Lumen Files', extensions: ['lum'] },
                { name: 'Lumen Files', extensions: ['lum'] }
            ]
        })
        if (result.canceled) return null
        path = result.filePath
    }
    
    fs.writeFileSync(path, content)
    return path
})

ipcMain.handle('run-code', async (event, filePath) => {
    try {
        if (runningProcess) {
            return { error: "Program is already running" };
        }

        if (!filePath) {
            return { error: "Please save your file before running." };
        }

        const shellPath = isDev 
            ? path.join(__dirname, 'shell.py')
            : path.join(process.resourcesPath, 'app.asar.unpacked', 'shell.py');
        
        runningProcess = spawn(process.platform === 'win32' ? 'python' : 'python3', [shellPath, filePath], {
            env: { 
                ...process.env, 
                PYTHONIOENCODING: 'utf-8',
                PYTHONUNBUFFERED: '1'
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        runningProcess.stdout.setEncoding('utf8');
        runningProcess.stdout.on('data', (data) => {
            const text = data.toString();
            mainWindow.webContents.send('console-output', text);
            
            if (text.includes('input> ') || text.includes('input_int> ')) {
                mainWindow.webContents.send('input-requested');
            }
        });

        runningProcess.stderr.setEncoding('utf8');
        runningProcess.stderr.on('data', (data) => {
            mainWindow.webContents.send('console-error', data.toString());
        });

        runningProcess.on('close', (code) => {
            mainWindow.webContents.send('console-output', `\n--- Program finished with code ${code} ---\n`);
            runningProcess = null;
        });

        return { success: true };
    } catch (error) {
        console.error('Run code error:', error);
        return { error: error.message };
    }
});

ipcMain.handle('stop-code', async () => {
    try {
        if (runningProcess) {
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', runningProcess.pid, '/f', '/t']);
            } else {
                runningProcess.kill('SIGTERM');
            }
            
            mainWindow.webContents.send('console-output', '\n--- Program stopped ---\n');
            runningProcess = null;
            return { success: true };
        }
        return { error: "No program is running" };
    } catch (error) {
        console.error('Stop code error:', error);
        return { error: error.message };
    }
});

ipcMain.handle('console-input', async (event, text) => {
    if (runningProcess && !runningProcess.killed) {
        runningProcess.stdin.write(text + '\n');
        return { success: true };
    }
    return { error: "No running process to receive input" };
});

ipcMain.handle('save-settings', async (event, newSettings) => {
    try {
        const settingsPath = path.join(__dirname, 'settings.json');
        let settings = {};
        
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        
        const updatedSettings = { ...settings, ...newSettings };
        fs.writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2));
        
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('load-settings', async () => {
    try {
        const settingsPath = path.join(__dirname, 'settings.json');
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            return settings;
        }
        return null;
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('open-docs', async () => {
    const docsUrl = 'https://lumenlang.gitbook.io/lumen-docs';
    await shell.openExternal(docsUrl);
    return { success: true };
});

ipcMain.handle('load-themes', async () => {
    try {
        const themesDir = path.join(__dirname, 'themes');
        const themeFiles = fs.readdirSync(themesDir).filter(file => file.endsWith('.json'));
        
        const themes = {};
        for (const file of themeFiles) {
            const themePath = path.join(themesDir, file);
            const themeContent = fs.readFileSync(themePath, 'utf8');
            const theme = JSON.parse(themeContent);
            themes[theme.name] = theme;
        }
        
        return themes;
    } catch (error) {
        console.error('Error loading themes:', error);
        return { error: error.message };
    }
});

ipcMain.handle('load-highlights', async () => {
    try {
        const highlightsDir = path.join(__dirname, 'highlights');
        const highlightFiles = fs.readdirSync(highlightsDir).filter(file => file.endsWith('.json'));
        
        const highlights = {};
        for (const file of highlightFiles) {
            const highlightPath = path.join(highlightsDir, file);
            const highlightContent = fs.readFileSync(highlightPath, 'utf8');
            const highlight = JSON.parse(highlightContent);
            highlights[highlight.name] = highlight;
        }
        
        return highlights;
    } catch (error) {
        console.error('Error loading highlights:', error);
        return { error: error.message };
    }
});

ipcMain.handle('open-themes-folder', async () => {
    const themesPath = isDev 
        ? path.join(__dirname, 'themes')
        : path.join(process.resourcesPath, 'app.asar.unpacked', 'themes');
    await shell.openPath(themesPath);
    return { success: true };
});

ipcMain.handle('open-highlights-folder', async () => {
    const highlightsPath = isDev 
        ? path.join(__dirname, 'highlights')
        : path.join(process.resourcesPath, 'app.asar.unpacked', 'highlights');
    await shell.openPath(highlightsPath);
    return { success: true };
});

ipcMain.handle('open-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        currentWorkingDirectory = result.filePaths[0];
        return await readDirectory(currentWorkingDirectory);
    }
    return null;
});

ipcMain.handle('get-current-folder', () => {
    return currentWorkingDirectory;
});

ipcMain.handle('read-directory', async (event, dirPath) => {
    return await readDirectory(dirPath);
});

async function readDirectory(dirPath) {
    try {
        const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const result = {
            path: dirPath,
            items: []
        };
        
        const folders = items
            .filter(item => item.isDirectory())
            .sort((a, b) => a.name.localeCompare(b.name));

        const files = items
            .filter(item => item.isFile())
            .sort((a, b) => a.name.localeCompare(b.name));

        for (const folder of folders) {
            result.items.push({
                name: folder.name,
                path: path.join(dirPath, folder.name),
                type: 'folder'
            });
        }

        for (const file of files) {
            result.items.push({
                name: file.name,
                path: path.join(dirPath, file.name),
                type: 'file'
            });
        }

        return result;
    } catch (error) {
        console.error('Error reading directory:', error);
        return { error: error.message };
    }
}
