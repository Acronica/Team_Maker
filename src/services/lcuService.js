import { ipcRenderer } from './ipcService.js';
import { showNotification } from '../utils.js';

/**
 * LCU API 관련 UI 및 이벤트 처리를 초기화합니다.
 */
export function initializeLcuApi() {
    const lcuStatusIndicator = document.getElementById('lcu-status-indicator');
    const lcuInviteBtn = document.getElementById('lcu-invite-btn');

    /**
     * LCU 연결 상태에 따라 UI를 업데이트하는 함수
     * @param {boolean} isConnected - LCU 연결 여부
     */
    const updateLcuStatusUI = (isConnected) => {
        if (isConnected) {
            lcuStatusIndicator.classList.remove('disconnected');
            lcuStatusIndicator.classList.add('connected');
            lcuStatusIndicator.title = 'League Client 연결됨';
            if (lcuInviteBtn) lcuInviteBtn.disabled = false;
        } else {
            lcuStatusIndicator.classList.remove('connected');
            lcuStatusIndicator.classList.add('disconnected');
            lcuStatusIndicator.title = 'League Client 연결 안됨';
            if (lcuInviteBtn) lcuInviteBtn.disabled = true;
        }
    };

    // Main 프로세스로부터 LCU 연결 상태 변경 이벤트를 수신합니다.
    ipcRenderer.on('lcu-connection-changed', (isConnected) => {
        updateLcuStatusUI(isConnected);
        if(isConnected) {
            showNotification('League Client가 연결되었습니다.');
        } else {
            showNotification('League Client 연결이 끊어졌습니다.', 'error');
        }
    });

    // Main 프로세스로부터 오는 초대 관련 알림을 처리합니다.
    ipcRenderer.on('lcu-invite-success', (message) => showNotification(message, 'info'));
    ipcRenderer.on('lcu-invite-error', (message) => showNotification(message, 'error'));
    ipcRenderer.on('lcu-invite-warning', (message) => showNotification(message, 'error'));


    // 프로그램 시작 시 현재 LCU 상태를 한 번 요청하여 UI를 초기화합니다.
    (async () => {
        try {
            const isConnected = await ipcRenderer.invoke('get-lcu-status');
            updateLcuStatusUI(isConnected);
        } catch (error) {
            console.error('Failed to get initial LCU status:', error);
            updateLcuStatusUI(false);
        }
    })();
}

