const { app, BrowserWindow, ipcMain, clipboard, autoUpdater } = require('electron');
const path = require('node:path');
const axios = require('axios');
const { patchNotesHTML } = require('./patch-notes.js'); // [추가됨]

// --- 봇 서버 정보 ---
const API_BASE_URL = 'http://34.47.92.228:3000/api';
const API_KEY = '3810';

// --- 전역 변수 ---
let mainWindow;

// =================================================================
// 자동 업데이트 설정
// =================================================================
if (require('electron-squirrel-startup')) app.quit(); 

// =================================================================
// 창 생성 함수
// =================================================================

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1250,
    height: 800,
    minWidth: 950,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdates();
  });
};

// =================================================================
// 앱 생명주기
// =================================================================

app.whenReady().then(createMainWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// =================================================================
// 자동 업데이트 이벤트 핸들러
// =================================================================
autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-not-available');
});

autoUpdater.on('download-progress', (progressInfo) => {
    mainWindow.webContents.send('update-download-progress', progressInfo);
});

autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-downloaded');
});

autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update-error', err.message);
});


// =================================================================
// IPC 통신 핸들러
// =================================================================

const sendToRenderer = (channel, data) => {
  if (mainWindow) {
    mainWindow.webContents.send(channel, data);
  }
};

const handleApiError = (error, context) => {
    console.error(`[API Error: ${context}]`, error);
    if (error.response) {
        if (error.response.status === 404) {
            return `서버에서 요청한 주소(${error.config.url})를 찾을 수 없습니다 (404 Not Found). API 주소나 서버 ID가 올바른지, 봇 서버가 정상 실행 중인지 확인해주세요.`;
        }
        return error.response.data.error || `서버 오류 (상태: ${error.response.status})`;
    } else if (error.request) {
        return '서버에서 응답이 없습니다. 네트워크나 봇 서버 상태를 확인해주세요.';
    } else {
        return `요청 중 오류 발생: ${error.message}`;
    }
};

ipcMain.on('minimize-window', (event) => BrowserWindow.fromWebContents(event.sender).minimize());
ipcMain.on('maximize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('close-window', (event) => BrowserWindow.fromWebContents(event.sender).close());
ipcMain.on('resize-window', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setSize(width, height, true);
});

ipcMain.on('start-update', () => {
    autoUpdater.downloadUpdate();
});

ipcMain.on('quit-and-install', () => {
    autoUpdater.quitAndInstall();
});


ipcMain.handle('write-clipboard', (event, text) => {
    clipboard.writeText(text);
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// [추가됨] 패치노트 내용 전달 핸들러
ipcMain.handle('get-patch-notes', () => {
    return patchNotesHTML;
});

ipcMain.handle('get-server-info', async (event, guildId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/server/${guildId}`, {
            headers: { 'x-api-key': API_KEY }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: handleApiError(error, `get-server-info for guild ${guildId}`) };
    }
});

ipcMain.handle('get-server-config', async (event, guildId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/servers/${guildId}/config`, {
            headers: { 'x-api-key': API_KEY }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: handleApiError(error, `get-server-config for guild ${guildId}`) };
    }
});

ipcMain.on('fetch-discord-users', async (event, channelId) => {
    if (!channelId) {
        sendToRenderer('users-fetched-error', '채널 ID가 제공되지 않았습니다.');
        return;
    }
    try {
        const membersRes = await axios.get(`${API_BASE_URL}/channel-members/${channelId}`, {
            headers: { 'x-api-key': API_KEY }
        });
        sendToRenderer('users-fetched-success', membersRes.data);
    } catch (error) {
        sendToRenderer('users-fetched-error', handleApiError(error, 'fetch-discord-users'));
    }
});

ipcMain.on('submit-teams-discord', async (event, { guildId, team1, team2 }) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/submit-teams`, {
            guildId,
            team1,
            team2
        }, {
            headers: { 'x-api-key': API_KEY }
        });
        sendToRenderer('submit-teams-success', response.data);
    } catch (error) {
        sendToRenderer('submit-teams-error', handleApiError(error, 'submit-teams-discord'));
    }
});

