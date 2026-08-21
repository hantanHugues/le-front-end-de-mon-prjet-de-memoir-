const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  config: {
    get: ()     => ipcRenderer.invoke('config:get'),
    set: (data) => ipcRenderer.invoke('config:set', data),
  },
  token: {
    get:   ()    => ipcRenderer.invoke('token:get'),
    set:   (tok) => ipcRenderer.invoke('token:set', tok),
    clear: ()    => ipcRenderer.invoke('token:clear'),
  },
  notify: (title, body) => ipcRenderer.invoke('notify', { title, body }),
})
