const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  invoke: (channel, data) => {
    return ipcRenderer.invoke(channel, data);
  },
  on: (channel, callback) => {
    ipcRenderer.removeAllListeners(channel);
    if (callback && typeof callback === 'function') {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  }
});

