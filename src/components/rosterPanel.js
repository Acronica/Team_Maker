import { showNotification, setSlotText } from '../utils.js';
import { ipcRenderer } from '../services/ipcService.js';
import { dragManager } from '../services/dragManager.js';
import { getCurrentServer } from '../services/settingsService.js';

let allRosterSlots = [];
const rosterList = document.getElementById('roster-list');
const panel = document.getElementById('roster-panel');

/**
 * 로스터 슬롯을 생성하는 헬퍼 함수
 * @param {string} name - 슬롯에 표시될 이름
 * @returns {HTMLElement} - 생성된 슬롯 요소
 */
function createRosterSlot(name = '') {
    const slot = document.createElement('div');
    slot.className = 'roster-slot';
    setSlotText(slot, name);
    slot.setAttribute('draggable', true);

    slot.addEventListener('dragstart', (e) => {
        if (!slot.textContent) {
            e.preventDefault();
            return;
        }
        dragManager.start(e, slot.textContent, 'roster');
    });

    slot.addEventListener('dragend', () => dragManager.end());
    
    return slot;
}

/**
 * 사용자 목록을 기반으로 로스터 목록 UI를 업데이트합니다.
 * @param {Array<Object>} users - 사용자 정보 배열
 */
function updateRosterList(users = []) {
    rosterList.innerHTML = '';
    allRosterSlots = [];
    const namesInGrid = Array.from(document.querySelectorAll('.player-slot'))
                             .map(s => s.textContent)
                             .filter(Boolean);
    const filteredUsers = users.filter(user => user && user.name && !namesInGrid.includes(user.name));
    
    const totalSlots = Math.max(20, filteredUsers.length);

    for (let i = 0; i < totalSlots; i++) {
        const name = filteredUsers[i] ? filteredUsers[i].name : '';
        const slot = createRosterSlot(name);
        rosterList.appendChild(slot);
        allRosterSlots.push(slot);
    }
}

/**
 * 인원 목록 패널의 버튼과 이벤트 리스너를 설정합니다.
 */
function setupPanelButtons() {
    const fetchButton = document.getElementById('fetch-users-btn');
    const returnAllBtn = document.getElementById('return-all-to-roster-btn');
    const closeBtn = document.getElementById('roster-close-btn');

    // 닫기 버튼
    closeBtn?.addEventListener('click', () => {
        panel.classList.remove('open');
        const sidePanel = document.getElementById('side-panel');
        const menuBtn = document.getElementById('menu-btn');
        if (!sidePanel.classList.contains('open')) {
            menuBtn.classList.remove('hidden');
        }
    });

    // 유저 불러오기 버튼
    fetchButton?.addEventListener('click', () => {
        const currentServer = getCurrentServer();
        if (!currentServer?.lobby?.id) {
            showNotification('봇 설정을 통해 서버를 먼저 선택해주세요.', 'error');
            return;
        }
        ipcRenderer.send('fetch-discord-users', currentServer.lobby.id);
        fetchButton.textContent = '불러오는 중...';
        fetchButton.disabled = true;
    });

    // 모두 목록으로 버튼
    returnAllBtn?.addEventListener('click', () => {
        const playersToMove = [];
        document.querySelectorAll('.player-slot').forEach(slot => {
            if (slot.textContent) {
                playersToMove.push(slot.textContent);
                setSlotText(slot, ''); // 그리드 슬롯 비우기
            }
        });

        if (playersToMove.length > 0) {
            playersToMove.forEach(name => {
                const addToRosterEvent = new CustomEvent('addToRoster', { detail: { name } });
                document.dispatchEvent(addToRosterEvent);
            });
            showNotification(`${playersToMove.length}명의 인원이 목록으로 이동했습니다.`);
        } else {
            showNotification('팀 슬롯에 인원이 없습니다.', 'error');
        }
    });

    // IPC 응답 리스너
    ipcRenderer.on('users-fetched-success', (users) => {
        updateRosterList(users);
        if(fetchButton) {
            fetchButton.textContent = '불러오기';
            fetchButton.disabled = false;
        }
    });
    ipcRenderer.on('users-fetched-error', (error) => {
        showNotification(`유저 목록 로딩 실패: ${error}`, 'error');
        if(fetchButton) {
            fetchButton.textContent = '불러오기';
            fetchButton.disabled = false;
        }
    });
}

/**
 * Bug Fix: 그리드에서 로스터로 드롭하는 기능을 설정합니다.
 */
function setupRosterDropTarget() {
    rosterList.addEventListener('dragover', (e) => e.preventDefault());

    rosterList.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dragManager.draggedItem?.origin === 'grid') {
            const from = dragManager.draggedItem;
            
            const addToRosterEvent = new CustomEvent('addToRoster', { detail: { name: from.name } });
            document.dispatchEvent(addToRosterEvent);
            
            setSlotText(from.element, '');
        }
    });
}


/**
 * 인원 목록 패널 컴포넌트를 초기화하는 메인 함수
 */
export function initRosterPanel() {
    updateRosterList();
    setupPanelButtons();
    setupRosterDropTarget();

    document.addEventListener('addToRoster', (e) => {
        const { name } = e.detail;
        if (!name) return;
        
        const emptySlot = allRosterSlots.find(slot => !slot.textContent);
        if (emptySlot) {
            setSlotText(emptySlot, name);
        } else {
            const newSlot = createRosterSlot(name);
            rosterList.appendChild(newSlot);
            allRosterSlots.push(newSlot);
        }
    });
}

