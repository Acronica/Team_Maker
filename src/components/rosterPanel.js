import { ipcRenderer } from '../services/ipcService.js';
import { dragManager } from '../services/dragManager.js';
import { updateSlotContent, showNotification } from '../utils.js';
import { getCurrentServer } from '../services/settingsService.js';

/**
 * 왼쪽 인원 목록 패널의 동작을 초기화합니다.
 */
export function initRosterPanel() {
    const panel = document.getElementById('roster-panel');
    const rosterList = document.getElementById('roster-list');
    const fetchButton = document.getElementById('fetch-users-btn');
    const returnAllBtn = document.getElementById('return-all-to-roster-btn');
    const rosterCloseBtn = document.getElementById('roster-close-btn');
    
    let rosterSlots = [];

    const createRosterSlot = (name = '') => {
        const slot = document.createElement('div');
        slot.className = 'roster-slot';
        slot.textContent = name;
        slot.setAttribute('draggable', true);

        slot.addEventListener('dragstart', (e) => {
            if (!e.target.textContent) {
                e.preventDefault();
                return;
            }
            dragManager.start(e, e.target.textContent, 'roster');
        });

        slot.addEventListener('dragend', () => dragManager.end());

        return slot;
    };

    const updateRosterList = (users = []) => {
        rosterList.innerHTML = '';
        rosterSlots = [];
        
        const mainGridSlots = Array.from(document.querySelectorAll('.player-slot'));
        const namesInGrid = mainGridSlots.map(s => s.querySelector('.slot-front').textContent).filter(Boolean);
        
        const filteredUsers = users.filter(user => user && user.name && !namesInGrid.includes(user.name));
        const totalSlots = Math.max(20, filteredUsers.length);

        for (let i = 0; i < totalSlots; i++) {
            const name = filteredUsers[i] ? filteredUsers[i].name : '';
            const slot = createRosterSlot(name);
            rosterList.appendChild(slot);
            rosterSlots.push(slot);
        }
    };

    updateRosterList();

    fetchButton?.addEventListener('click', () => {
        const currentServer = getCurrentServer();
        if (currentServer && currentServer.lobby && currentServer.lobby.id) {
            ipcRenderer.send('fetch-discord-users', currentServer.lobby.id);
        } else {
            showNotification('봇 설정에서 서버와 대기 채널을 먼저 선택해주세요.', 'error');
        }
    });

    ipcRenderer.on('users-fetched-success', (users) => {
        updateRosterList(users);
    });

    // [수정됨] 닫기 버튼 클릭 시 메뉴 버튼 표시 로직 추가
    rosterCloseBtn?.addEventListener('click', () => {
        panel.classList.remove('open');
        
        const sidePanel = document.getElementById('side-panel');
        const menuBtn = document.getElementById('menu-btn');

        // 오른쪽 메뉴 패널도 닫혀있을 경우에만 메뉴 버튼을 다시 표시합니다.
        if (!sidePanel.classList.contains('open')) {
            setTimeout(() => {
                menuBtn.classList.remove('hidden');
            }, 300); // 패널 닫기 애니메이션과 시간을 맞춤
        }
    });

    returnAllBtn?.addEventListener('click', () => {
        const mainGridSlots = Array.from(document.querySelectorAll('.player-slot'));
        mainGridSlots.forEach(slot => {
            if (slot.classList.contains('locked')) return;
            
            const name = slot.querySelector('.slot-front').textContent;
            if (name) {
                const emptyRosterSlot = rosterSlots.find(rs => !rs.textContent);
                if (emptyRosterSlot) {
                    emptyRosterSlot.textContent = name;
                } else {
                    const newSlot = createRosterSlot(name);
                    rosterList.appendChild(newSlot);
                    rosterSlots.push(newSlot);
                }
                updateSlotContent(slot, '');
            }
        });
    });

    rosterList.addEventListener('dragover', (e) => e.preventDefault());

    rosterList.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = dragManager.draggedItem;
        if (from && from.origin === 'grid') {
            const target = e.target;
            
            let emptySlot = rosterSlots.find(rs => !rs.textContent);
            if(target.classList.contains('roster-slot') && !target.textContent) {
                emptySlot = target;
            }

            if (emptySlot) {
                emptySlot.textContent = from.name;
                updateSlotContent(from.element, '');
            }
        }
    });

    document.addEventListener('addToRoster', (e) => {
        const { name } = e.detail;
        if (!name) return;
        const emptySlot = rosterSlots.find(slot => !slot.textContent);
        if (emptySlot) {
            emptySlot.textContent = name;
        } else {
            const newSlot = createRosterSlot(name);
            rosterList.appendChild(newSlot);
            rosterSlots.push(newSlot);
        }
    });
}

