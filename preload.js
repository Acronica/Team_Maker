const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 단방향: 렌더러 -> 메인
  send: (channel, ...args) => {
    const validSendChannels = [
      'minimize-window', 'maximize-window', 'close-window',
      'resize-window',
      'fetch-discord-users',
      'submit-teams-discord',
      'start-update',
      'quit-and-install'
    ];
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  
  // 단방향: 메인 -> 렌더러
  on: (channel, func) => {
    const validOnChannels = [
      'users-fetched-success', 'users-fetched-error',
      'submit-teams-success', 'submit-teams-error',
      'update-available', 'update-not-available',
      'update-download-progress', 'update-downloaded', 'update-error'
    ];
    if (validOnChannels.includes(channel)) {
      // 리스너 중복 방지를 위해 기존 리스너 제거
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },

  // 양방향: 렌더러 <-> 메인
  invoke: (channel, ...args) => {
      const validInvokeChannels = [
        'write-clipboard',
        'get-server-info',
        'get-server-config',
        'get-app-version',
        'get-patch-notes' // [추가됨]
      ];
      if (validInvokeChannels.includes(channel)) {
          return ipcRenderer.invoke(channel, ...args);
      }
  }
});

