import { ipcRenderer } from '../services/ipcService.js';

/**
 * 오른쪽 사이드 패널(메인 메뉴)의 동작을 초기화합니다.
 */
export function initSidePanel() {
    const menuBtn = document.getElementById('menu-btn');
    const sidePanel = document.getElementById('side-panel');
    const rosterPanel = document.getElementById('roster-panel');

    // --- 패널 열기 ---
    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        sidePanel.classList.add('open');
        menuBtn.classList.add('hidden');
    });

    // --- 패널 닫기 (외부 클릭) ---
    document.body.addEventListener('click', (e) => {
        if (sidePanel.classList.contains('open') && !sidePanel.contains(e.target) && e.target !== menuBtn) {
            sidePanel.classList.remove('open');
            if (!rosterPanel.classList.contains('open')) {
                menuBtn.classList.remove('hidden');
            }
        }
    });

    // --- 사이드 패널 내부 버튼 클릭 처리 ---
    sidePanel.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;

        const buttonId = e.target.id;

        // ** [수정됨] 인원 목록 버튼을 위한 특별 처리 **
        if (buttonId === 'panel-roster-btn') {
            rosterPanel.classList.toggle('open'); // 인원 목록 패널을 직접 제어
            sidePanel.classList.remove('open'); // 메뉴 패널은 닫음
            // 메뉴 버튼은 rosterPanel이 닫힐 때만 나타나므로 여기서는 숨김 상태 유지
        } else {
            // 다른 모든 모달 버튼들을 위한 기존 로직
            const modalName = buttonId.replace('panel-', '').replace('-btn', '');
            if (modalName) {
                const event = new CustomEvent('openModal', { detail: { modalName } });
                document.dispatchEvent(event);
            }
        }
    });

    // --- 버전 정보 표시 기능 ---
    const displayAppVersion = async () => {
        const versionDisplay = document.getElementById('app-version-display');
        if (versionDisplay) {
            try {
                const appVersion = await ipcRenderer.invoke('get-app-version');
                versionDisplay.textContent = `Version ${appVersion}`;
            } catch (error) {
                console.error("Failed to get app version:", error);
                versionDisplay.textContent = 'Version N/A';
            }
        }
    };

    displayAppVersion();
}

