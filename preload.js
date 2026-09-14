const { contextBridge, ipcRenderer } = require('electron');

// main 프로세스의 기능 스위치를 그대로 가져옵니다. 페이지 스크립트보다 먼저
// 실행되므로 렌더러는 window.FEATURES 를 동기적으로 읽을 수 있습니다.
contextBridge.exposeInMainWorld('FEATURES', ipcRenderer.sendSync('features:get'));

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

