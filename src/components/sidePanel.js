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

    // --- 사이드 패널 내부 버튼 클릭 처리 ---
    sidePanel.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;

        const buttonId = e.target.id;

        if (buttonId === 'panel-roster-btn') {
            rosterPanel.classList.add('open'); // rosterPanel을 엽니다.
            sidePanel.classList.remove('open'); // sidePanel은 닫습니다.
            // menuBtn은 rosterPanel이 열렸으므로 계속 숨겨진 상태를 유지합니다.
        } else {
            // 다른 모든 모달 버튼들을 위한 기존 로직
            const modalName = buttonId.replace('panel-', '').replace('-btn', '');
            if (modalName) {
                const event = new CustomEvent('openModal', { detail: { modalName } });
                document.dispatchEvent(event);
            }
        }
    });
    
    // --- [수정됨] 중앙 집중식 패널 닫기 로직 ---
    document.body.addEventListener('click', (e) => {
        // 클릭된 타겟 요소
        const target = e.target;
        
        // 클릭 전에 패널들이 열려 있었는지 상태를 기록
        const wasSidePanelOpen = sidePanel.classList.contains('open');
        const wasRosterPanelOpen = rosterPanel.classList.contains('open');
        const rosterOpenBtn = document.getElementById('panel-roster-btn');

        // 사이드 패널 외부 클릭 시 닫기
        if (wasSidePanelOpen && !sidePanel.contains(target) && target !== menuBtn) {
            sidePanel.classList.remove('open');
        }

        // 로스터 패널 외부 클릭 시 닫기
        if (wasRosterPanelOpen && !rosterPanel.contains(target) && target !== rosterOpenBtn) {
            rosterPanel.classList.remove('open');
        }

        // 클릭 이벤트 후, 두 패널이 모두 닫혔는지 최종 확인하여 메뉴 버튼 표시
        if ((wasSidePanelOpen || wasRosterPanelOpen) && !sidePanel.classList.contains('open') && !rosterPanel.classList.contains('open')) {
            setTimeout(() => {
                menuBtn.classList.remove('hidden');
            }, 300); // 패널이 닫히는 애니메이션 시간과 맞춤
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

