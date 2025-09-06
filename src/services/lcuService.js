import { ipcRenderer } from './ipcService.js';
import { showNotification } from '../utils.js';

let lastConnectionState = false;

/**
 * LCU 연결 상태에 따라 UI를 업데이트합니다.
 * @param {boolean} isConnected - LCU 연결 여부
 */
function updateLcuStatusUI(isConnected) {
    const lcuStatusIndicator = document.getElementById('lcu-status-indicator');
    const lcuInviteBtn = document.getElementById('lcu-invite-btn'); // ID 변경됨

    if (isConnected) {
        lcuStatusIndicator.classList.remove('disconnected');
        lcuStatusIndicator.classList.add('connected');
        lcuStatusIndicator.title = 'League Client 연결됨';
        lcuInviteBtn.disabled = false;
    } else {
        lcuStatusIndicator.classList.remove('connected');
        lcuStatusIndicator.classList.add('disconnected');
        lcuStatusIndicator.title = 'League Client 연결 안됨';
        lcuInviteBtn.disabled = true;
    }
}

/**
 * LCU 관련 이벤트 리스너 및 API를 초기화합니다.
 */
export async function initializeLcuApi() {
    // 초기 연결 상태 확인
    const initialStatus = await ipcRenderer.invoke('get-lcu-status');
    lastConnectionState = initialStatus;
    updateLcuStatusUI(initialStatus);

    // LCU 연결 이벤트
    ipcRenderer.on('lcu-connected', () => {
        if (!lastConnectionState) {
            updateLcuStatusUI(true);
            showNotification('League Client가 연결되었습니다.');
            lastConnectionState = true;
        }
    });

    // LCU 연결 끊김 이벤트
    ipcRenderer.on('lcu-disconnected', () => {
        if (lastConnectionState) {
            updateLcuStatusUI(false);
            showNotification('League Client 연결이 끊어졌습니다.', 'error');
            lastConnectionState = false;
        }
    });

    // 주기적으로 LCU 연결 상태 폴링
    setInterval(async () => {
        const isConnected = await ipcRenderer.invoke('get-lcu-status');
        if (isConnected !== lastConnectionState) {
            updateLcuStatusUI(isConnected);
            lastConnectionState = isConnected;
            if (isConnected) {
                showNotification('League Client가 연결되었습니다.');
            } else {
                showNotification('League Client 연결이 끊어졌습니다.', 'error');
            }
        }
    }, 3000); // 3초마다 확인

    // 초대 관련 이벤트
    ipcRenderer.on('lcu-invite-success', (message) => showNotification(message, 'info'));
    ipcRenderer.on('lcu-invite-error', (message) => showNotification(message, 'error'));
    ipcRenderer.on('lcu-invite-warning', (message) => showNotification(message, 'error'));
}

