const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('node:path');
const fs = require('fs');
const https = require('https');
const axios = require('axios');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
const LCUConnector = require('lcu-connector');
// .env 파일은 개발 환경에서만 사용됩니다.
require('dotenv').config();

// =================================================================
// 자동 업데이트 설정
// =================================================================
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

// --- 전역 변수 ---
let mainWindow;

// Renderer 프로세스로 메시지를 보내는 헬퍼 함수
const sendToRenderer = (channel, ...args) => {
    log.info(`Sending to renderer [${channel}]:`, args);
    if (mainWindow) {
        mainWindow.webContents.send(channel, ...args);
    }
};

// =================================================================
// 설정 (API 키 등) 관리
// =================================================================
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function getSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        }
    } catch (error) {
        log.error('Could not read settings file:', error);
    }
    return {}; // 파일이 없거나 오류 발생 시 빈 객체 반환
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        log.error('Could not save settings file:', error);
        return false;
    }
}


// =================================================================
// 창 생성 및 앱 생명주기
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
  
  // 창이 로드되면 자동 업데이트 확인 시작
  mainWindow.webContents.on('did-finish-load', () => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });
};

app.whenReady().then(() => {
    createMainWindow();
    log.info('LCU Connector: Starting to listen for client...');
    connector.start();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


// =================================================================
// LCU 커넥터 이벤트 핸들러
// =================================================================
const connector = new LCUConnector();
let lcuApi;
let isLcuConnected = false;

const lcuAgent = new https.Agent({
  rejectUnauthorized: false,
});

connector.on('connect', (data) => {
    log.info('League Client connected.');
    isLcuConnected = true;
    const { port, username, password } = data;
    lcuApi = axios.create({
        baseURL: `https://127.0.0.1:${port}`,
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
        },
        httpsAgent: lcuAgent
    });
    sendToRenderer('lcu-connection-changed', true);
});

connector.on('disconnect', () => {
    log.warn('League Client disconnected.');
    isLcuConnected = false;
    lcuApi = null;
    sendToRenderer('lcu-connection-changed', false);
});


// =================================================================
// IPC 통신 핸들러
// =================================================================
const handleApiError = (error, context) => { log.error(`[API Error: ${context}]`, error); if (error.response) { if (error.response.status === 404) return `서버에서 요청한 주소(${error.config.url})를 찾을 수 없습니다 (404 Not Found).`; return error.response.data.error || `서버 오류 (상태: ${error.response.status})`; } else if (error.request) { return '서버에서 응답이 없습니다. 네트워크나 봇 서버 상태를 확인해주세요.'; } else { return `요청 중 오류 발생: ${error.message}`; }};
ipcMain.on('minimize-window', (event) => BrowserWindow.fromWebContents(event.sender).minimize());
ipcMain.on('maximize-window', (event) => { const win = BrowserWindow.fromWebContents(event.sender); win.isMaximized() ? win.unmaximize() : win.maximize(); });
ipcMain.on('close-window', (event) => BrowserWindow.fromWebContents(event.sender).close());
ipcMain.handle('write-clipboard', (event, text) => clipboard.writeText(text));

// --- 자동 업데이트 IPC ---
autoUpdater.on('update-available', (info) => sendToRenderer('update-available', info));
autoUpdater.on('download-progress', (progressInfo) => sendToRenderer('update-download-progress', progressInfo));
autoUpdater.on('update-downloaded', (info) => sendToRenderer('update-downloaded', info));
autoUpdater.on('error', (err) => sendToRenderer('update-error', err ? (err.stack || err).toString() : 'Unknown error'));
ipcMain.on('start-update', () => autoUpdater.downloadUpdate());
ipcMain.on('quit-and-install', () => autoUpdater.quitAndInstall(true, true));
ipcMain.handle('check-for-updates', async () => { 
    if (!app.isPackaged) return { updateInfo: { version: app.getVersion() } };
    try {
        return await autoUpdater.checkForUpdates();
    } catch (error) {
        log.error('Could not check for updates:', error);
        return null;
    }
});

// --- 기타 앱 정보 IPC ---
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-patch-notes', async () => { try { delete require.cache[require.resolve('./patch-notes.js')]; const notesModule = require('./patch-notes.js'); return notesModule.html; } catch (error) { return '<p>패치 노트를 불러올 수 없습니다.</p>'; }});

// --- API 키 관리 IPC ---
ipcMain.handle('get-api-key', () => {
    const settings = getSettings();
    // 개발 환경에서는 .env 우선, 없으면 설정 파일 값 사용
    if (process.env.NODE_ENV !== 'production' && process.env.RIOT_API_KEY) {
        return process.env.RIOT_API_KEY;
    }
    return settings.riotApiKey || '';
});
ipcMain.handle('save-api-key', (event, apiKey) => {
    const settings = getSettings();
    settings.riotApiKey = apiKey;
    return saveSettings(settings);
});


// --- 디스코드 봇 관련 IPC ---
const API_BASE_URL = 'http://34.158.219.243:3000/api';
const API_KEY = '3810';
ipcMain.handle('get-server-info', async (event, guildId) => { try { const response = await axios.get(`${API_BASE_URL}/server/${guildId}`, { headers: { 'x-api-key': API_KEY } }); return { success: true, data: response.data }; } catch (error) { return { success: false, error: handleApiError(error, `get-server-info for guild ${guildId}`) }; }});
ipcMain.handle('get-server-config', async (event, guildId) => { try { const response = await axios.get(`${API_BASE_URL}/servers/${guildId}/config`, { headers: { 'x-api-key': API_KEY } }); return { success: true, data: response.data }; } catch (error) { return { success: false, error: handleApiError(error, `get-server-config for guild ${guildId}`) }; }});
ipcMain.on('fetch-discord-users', async (event, channelId) => { if (!channelId) return sendToRenderer('users-fetched-error', '채널 ID가 제공되지 않았습니다.'); try { const membersRes = await axios.get(`${API_BASE_URL}/channel-members/${channelId}`, { headers: { 'x-api-key': API_KEY } }); sendToRenderer('users-fetched-success', membersRes.data); } catch (error) { sendToRenderer('users-fetched-error', handleApiError(error, 'fetch-discord-users')); }});
ipcMain.on('submit-teams-discord', async (event, { guildId, team1, team2 }) => { try { const response = await axios.post(`${API_BASE_URL}/submit-teams`, { guildId, team1, team2 }, { headers: { 'x-api-key': API_KEY } }); sendToRenderer('submit-teams-success', response.data); } catch (error) { sendToRenderer('submit-teams-error', handleApiError(error, 'submit-teams-discord')); }});

// --- 사용자 데이터(플레이어 정보) IPC ---
const userDataPath = path.join(app.getPath('userData'), 'users.json');
async function loadUserData() { try { if (!fs.existsSync(userDataPath)) return {}; const data = fs.readFileSync(userDataPath, 'utf-8'); return JSON.parse(data); } catch (error) { log.error('Failed to load user data:', error); return {}; }}
ipcMain.handle('load-user-data', async () => await loadUserData());
ipcMain.handle('save-user-data', async (event, data) => { try { fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2)); return { success: true }; } catch (error) { log.error('Failed to save user data:', error); return { success: false, error: error.message }; }});

// --- Riot & LCU API 관련 IPC ---
ipcMain.handle('verify-summoner', async (event, riotId) => {
    const settings = getSettings();
    const riotApiKey = settings.riotApiKey || process.env.RIOT_API_KEY;

    if (!riotApiKey || riotApiKey.trim() === '') {
        log.error('Riot API key is not configured.');
        return { success: false, error: 'Riot API 키가 설정되지 않았습니다.' };
    }
    const parts = riotId.split('#');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return { success: false, error: '올바른 Riot ID 형식이 아닙니다 (예: 이름#태그).' };
    }
    const gameName = encodeURIComponent(parts[0]);
    const tagLine = encodeURIComponent(parts[1]);
    try {
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`;
        const accountResponse = await axios.get(accountUrl, { headers: { 'X-Riot-Token': riotApiKey } });
        const puuid = accountResponse.data.puuid;
        await axios.get(`https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, { headers: { 'X-Riot-Token': riotApiKey } });
        const verifiedRiotId = `${accountResponse.data.gameName}#${accountResponse.data.tagLine}`;
        return { success: true, data: { name: verifiedRiotId } };
    } catch (error) {
        log.error(`[Riot API Error: verify-summoner for ${riotId}]`, error.response?.data || error.message);
        if (error.response) {
            switch (error.response.status) {
                case 401: case 403: return { success: false, error: 'Riot API 키가 만료되었거나 유효하지 않습니다.' };
                case 404: return { success: false, error: '존재하지 않는 소환사입니다.' };
                default: return { success: false, error: `Riot API 오류 (${error.response.status})` };
            }
        }
        return { success: false, error: 'Riot API 요청 중 알 수 없는 오류가 발생했습니다.' };
    }
});

ipcMain.handle('get-lcu-status', () => isLcuConnected);

ipcMain.on('lcu-invite-to-lobby', async (event, discordNames) => {
    if (!lcuApi) return sendToRenderer('lcu-invite-error', '리그 오브 레전드 클라이언트가 실행 중이 아닙니다.');
    if (discordNames.length === 0) return sendToRenderer('lcu-invite-error', '초대할 플레이어가 없습니다.');
    
    const userData = await loadUserData();
    const riotIdsToInvite = discordNames.map(dName => userData[dName]?.lolId).filter(Boolean);

    if (riotIdsToInvite.length === 0) return sendToRenderer('lcu-invite-error', '팀에 등록된 플레이어의 Riot ID 정보가 없습니다.');

    try {
        const summonerLookups = riotIdsToInvite.map(riotId => {
            const [gameName, tagLine] = riotId.split('#');
            return lcuApi.get(`/lol-summoner/v1/summoners?name=${encodeURIComponent(`${gameName}#${tagLine}`)}`);
        });
        const summonerResponses = await Promise.allSettled(summonerLookups);
        const invitations = summonerResponses.filter(res => res.status === 'fulfilled' && res.value.data).map(res => ({ toSummonerId: res.value.data.summonerId }));
        const failedNames = summonerResponses.map((res, i) => res.status === 'rejected' ? riotIdsToInvite[i] : null).filter(Boolean);
        
        if (failedNames.length > 0) sendToRenderer('lcu-invite-warning', `${failedNames.join(', ')} 님을 찾을 수 없어 초대에서 제외됩니다.`);
        if (invitations.length === 0) return sendToRenderer('lcu-invite-error', '초대할 수 있는 유효한 소환사를 찾지 못했습니다.');

        await lcuApi.post('/lol-lobby/v2/lobby/invitations', invitations);
        sendToRenderer('lcu-invite-success', `${invitations.length}명에게 초대를 보냈습니다.`);
    } catch (error) {
        log.error('[LCU Invite Error]', error.response?.data || error.message);
        if (error.response?.data?.message === 'No active lobby found') sendToRenderer('lcu-invite-error', '초대를 보낼 사설방이 없습니다. 먼저 방에 들어가주세요.');
        else sendToRenderer('lcu-invite-error', '초대 중 오류가 발생했습니다.');
    }
});

