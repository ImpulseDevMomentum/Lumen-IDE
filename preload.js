const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: (channel, data) => {
            const validChannels = ['open-file', 'save-file', 'run-code', 'stop-code', 'console-input', 'save-settings', 'load-settings', 'load-themes', 'load-highlights', 'open-docs', 'open-themes-folder', 'open-highlights-folder']
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, data)
            }
        },
        on: (channel, func) => {
            const validChannels = ['console-output', 'console-error', 'input-requested'];
            if (validChannels.includes(channel)) {
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        }
    },
    openDocs: () => ipcRenderer.invoke('open-docs'),
})
