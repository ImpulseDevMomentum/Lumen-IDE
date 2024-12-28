const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const https = require('https')

let mainWindow
let runningProcess = null

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
        icon: path.join(__dirname, 'logo.png'),
        title: 'Lumen IDE'
    })

    mainWindow.setMenu(null)

    mainWindow.loadFile('index.html')
    mainWindow.maximize()
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

ipcMain.handle('open-file', async () => {
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
                { name: 'All Files', extensions: ['*'] }
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

        const shellPath = path.join(__dirname, 'shell.py');
        
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
    const docsUrl = 'https://github.com/ImpulseDevMomentum/Lumen/wiki';
    await shell.openExternal(docsUrl);
    return { success: true };
});
