import { POSITIONS, POSITION_COLORS } from '../config.js';
import { showNotification } from '../utils.js';
import { ipcRenderer } from '../services/ipcService.js';
import { dragManager } from '../services/dragManager.js';
import { getCurrentServer } from '../services/settingsService.js';

let team1Slots = [];
let team2Slots = [];
let allSlots = [];

/**
 * [수정됨] 새로운 3D 카드 구조에 맞게 슬롯의 텍스트를 업데이트하는 헬퍼 함수
 * @param {HTMLElement} slot - .player-slot 요소
 * @param {string} newName - 새로운 이름
 */
function updateSlotContent(slot, newName) {
    const front = slot.querySelector('.slot-front');
    const back = slot.querySelector('.slot-back');
    if (front) front.textContent = newName || '';
    if (back) back.textContent = newName || '';
}

/**
 * 슬롯의 내용을 업데이트하면서 카드 플립 애니메이션을 실행하는 헬퍼 함수.
 * @param {HTMLElement} slot - .player-slot 요소
 * @param {string} newName - 슬롯에 새로 들어갈 이름
 * @param {number} delay - 애니메이션 시작 전 지연 시간 (ms)
 */
function animateSlotUpdate(slot, newName, delay = 0) {
    setTimeout(() => {
        const inner = slot.querySelector('.slot-inner');
        if (!inner || inner.classList.contains('is-flipped')) {
            // 이미 뒤집혀있으면, 즉시 내용만 바꾸고 원상태로 돌림
            updateSlotContent(slot, newName);
            return;
        }

        // 뒷면에 미리 새 이름 설정
        const back = slot.querySelector('.slot-back');
        if(back) back.textContent = newName || '';

        // 뒤집기
        inner.classList.add('is-flipped');
        
        // 애니메이션 종료 후 처리
        inner.addEventListener('transitionend', () => {
            // 1. 앞면의 내용을 새로운 이름으로 최종 업데이트
            updateSlotContent(slot, newName);
            
            // 2. 애니메이션 효과를 잠시 끔
            inner.style.transition = 'none';
            
            // 3. 'is-flipped' 클래스를 제거하여 카드를 원래 각도(0도)로 즉시 되돌림
            inner.classList.remove('is-flipped');
            
            // 4. 아주 짧은 시간 후에 다시 애니메이션 효과를 켬
            setTimeout(() => {
                inner.style.transition = '';
            }, 20);

        }, { once: true });

    }, delay);
}


/**
 * 팀 1과 팀 2의 모든 잠기지 않은 플레이어를 스왑하는 함수.
 * @param {boolean} showSwapNotification - 스왑 후 알림을 표시할지 여부.
 */
function swapAllTeams(showSwapNotification = false) {
    POSITIONS.forEach((pos, i) => {
        const slot1 = team1Slots[i];
        const slot2 = team2Slots[i];
        
        if (slot1.classList.contains('locked') || slot2.classList.contains('locked')) {
            return;
        }

        const tempName1 = slot1.querySelector('.slot-front').textContent;
        const tempName2 = slot2.querySelector('.slot-front').textContent;

        animateSlotUpdate(slot1, tempName2, i * 50);
        animateSlotUpdate(slot2, tempName1, i * 50);
    });
    
    if (showSwapNotification) {
        showNotification('1팀과 2팀의 모든 라인을 스왑했습니다.');
    }
}


/**
 * 3D 카드 구조로 슬롯을 생성하도록 변경
 */
function createGridSlots() {
    const gridSection = document.querySelector('.grid-section');
    if (!gridSection) return;
    gridSection.innerHTML = '';

    const team1Title = document.createElement('div');
    team1Title.className = 'grid-header team-title blue-side';
    team1Title.textContent = '1팀';
    
    const teamSwapBtn = document.createElement('button');
    teamSwapBtn.id = 'team-swap-button';
    teamSwapBtn.className = 'team-swap-header-btn';
    teamSwapBtn.innerHTML = '↔';

    const team2Title = document.createElement('div');
    team2Title.className = 'grid-header team-title red-side';
    team2Title.textContent = '2팀';
    
    gridSection.append(document.createElement('div'), team1Title, teamSwapBtn, team2Title);

    team1Slots = [];
    team2Slots = [];
    allSlots = [];

    POSITIONS.forEach((pos) => {
        const posLabel = document.createElement('div');
        posLabel.className = 'position-label';
        posLabel.textContent = pos;
        posLabel.style.backgroundColor = POSITION_COLORS[pos];

        const createPlayerSlot = () => {
            const slot = document.createElement('div');
            slot.className = 'player-slot';
            slot.innerHTML = `
                <div class="slot-inner">
                    <div class="slot-front"></div>
                    <div class="slot-back"></div>
                </div>
            `;
            return slot;
        };
        const team1Slot = createPlayerSlot();
        const team2Slot = createPlayerSlot();
        
        let middleElement;
        if (pos === '미드') {
            middleElement = document.createElement('button');
            middleElement.className = 'coin-flip-btn';
            middleElement.textContent = 'VS';
            
            middleElement.addEventListener('click', () => {
                if (middleElement.classList.contains('flipping')) return;
                middleElement.classList.add('flipping');
                const shouldSwap = Math.random() < 0.5;
                setTimeout(() => {
                    if (shouldSwap) {
                        swapAllTeams(); 
                        showNotification('변경');
                    } else {
                        showNotification('유지');
                    }
                }, 500); 
                middleElement.addEventListener('animationend', () => middleElement.classList.remove('flipping'), { once: true });
            });
        } else {
            middleElement = document.createElement('div'); 
        }

        gridSection.append(posLabel, team1Slot, middleElement, team2Slot);
        team1Slots.push(team1Slot);
        team2Slots.push(team2Slot);

        posLabel.addEventListener('click', () => {
            [posLabel, team1Slot, team2Slot].forEach(el => el.classList.toggle('highlight'));
        });
    });
    
    for (let i = 0; i < POSITIONS.length; i++) {
        allSlots.push(team1Slots[i]);
        allSlots.push(team2Slots[i]);
    }

    allSlots.forEach((slot, index) => {
        slot.dataset.index = index;
    });
}

/**
 * 3D 카드 구조에 맞게 드래그 앤 드롭 로직 수정
 */
function setupDragAndDrop() {
    allSlots.forEach(slot => {
        slot.setAttribute('draggable', true);
        
        const nameProvider = () => slot.querySelector('.slot-front').textContent;

        slot.addEventListener('dragstart', (e) => {
            const name = nameProvider();
            if (slot.classList.contains('locked') || !name) {
                e.preventDefault();
                return;
            }
            dragManager.start(e, name, 'grid');
        });

        slot.addEventListener('dragend', () => dragManager.end());
        slot.addEventListener('dragover', (e) => e.preventDefault());

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetSlot = e.currentTarget;
            if (targetSlot.classList.contains('locked') || !dragManager.draggedItem) return;

            const from = dragManager.draggedItem;
            if (from.element === targetSlot) return;

            const toName = targetSlot.querySelector('.slot-front').textContent;

            if (from.origin === 'grid') {
                updateSlotContent(from.element, toName);
                updateSlotContent(targetSlot, from.name);
            } else if (from.origin === 'roster') {
                updateSlotContent(targetSlot, from.name);
                from.element.textContent = ''; // roster.js의 setSlotText와 호환
                if (toName) {
                    const addToRosterEvent = new CustomEvent('addToRoster', { detail: { name: toName } });
                    document.dispatchEvent(addToRosterEvent);
                }
            }
        });
    });
}

/**
 * 3D 카드 구조에 맞게 상호작용 로직 수정
 */
function setupSlotInteractions() {
    allSlots.forEach(slot => {
        const nameProvider = () => slot.querySelector('.slot-front').textContent;
        let clickTimer = null;

        slot.addEventListener('click', () => {
            clickTimer = setTimeout(() => {
                if (nameProvider()) slot.classList.toggle('locked');
            }, 200);
        });

        slot.addEventListener('dblclick', () => {
            clearTimeout(clickTimer);
            const name = nameProvider();
            if (!name || slot.classList.contains('locked')) return;

            const originalName = name;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = originalName;
            
            const front = slot.querySelector('.slot-front');
            
            Object.assign(input.style, {
                width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent',
                color: 'var(--text-color-primary)', textAlign: 'center', fontSize: '21px', 
                fontFamily: 'inherit', outline: 'none', position: 'absolute', top: 0, left: 0
            });

            front.innerHTML = '';
            front.appendChild(input);
            input.focus();

            const saveName = () => {
                const newName = input.value.trim();
                const allNamesInGrid = allSlots.map(s => s.querySelector('.slot-front').textContent).filter(Boolean);
                
                if (newName === '') {
                    updateSlotContent(slot, '');
                } else if (allNamesInGrid.includes(newName) && newName !== originalName) {
                    updateSlotContent(slot, originalName);
                    showNotification(`'${newName}'은/는 이미 슬롯에 존재합니다.`, 'error');
                } else {
                    updateSlotContent(slot, newName);
                }
                if (input.parentNode) input.remove();
            };

            input.addEventListener('blur', saveName);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur();
                if (e.key === 'Escape') {
                    updateSlotContent(slot, originalName);
                    if (input.parentNode) input.remove();
                }
            });
        });
    });
}

/**
 * 3D 카드 구조에 맞게 액션 버튼 로직 수정
 */
function setupActionButtons() {
    const nameInput = document.getElementById('name-input');
    const addButton = document.getElementById('add-button');
    const resetButton = document.getElementById('reset-button');
    const copyButton = document.getElementById('copy-button');
    const submitTeamsBtn = document.getElementById('submit-teams-btn');
    const teamSwapButton = document.getElementById('team-swap-button');
    const lcuInviteBtn = document.getElementById('lcu-invite-btn');
    
    const shuffleMainBtn = document.getElementById('shuffle-main-btn');
    const shuffleDropdownToggleBtn = document.getElementById('shuffle-dropdown-toggle-btn');
    const shuffleDropdownContent = document.getElementById('shuffle-dropdown-content');
    const shuffleAllBtn = document.getElementById('shuffle-all-btn');
    const shufflePosBtn = document.getElementById('shuffle-pos-btn');
    const shuffleTeamPosBtn = document.getElementById('shuffle-team-pos-btn');
    
    const addName = () => {
        const name = nameInput.value.trim();
        if (!name) return;
        const allNamesInGrid = allSlots.map(s => s.querySelector('.slot-front').textContent).filter(Boolean);
        if (allNamesInGrid.includes(name)) {
            showNotification(`'${name}'은/는 이미 슬롯에 존재합니다.`, 'error');
            nameInput.value = '';
            return;
        }
        const emptySlot = allSlots.find(slot => !slot.querySelector('.slot-front').textContent);
        if (emptySlot) {
            updateSlotContent(emptySlot, name);
            emptySlot.classList.add('pop-in');
            emptySlot.addEventListener('animationend', () => emptySlot.classList.remove('pop-in'), { once: true });
        } else {
            showNotification('모든 팀 슬롯이 채워져 있습니다.', 'error');
        }
        nameInput.value = '';
        nameInput.focus();
    };
    
    addButton?.addEventListener('click', addName);
    nameInput?.addEventListener('keydown', e => { if (e.key === 'Enter') addName(); });
    
    resetButton?.addEventListener('click', () => {
        allSlots.forEach(slot => { updateSlotContent(slot, ''); slot.classList.remove('locked'); });
        showNotification('모든 슬롯이 초기화되었습니다.');
    });

    const shuffleAll = () => {
        const unlockedSlots = allSlots.filter(s => !s.classList.contains('locked') && s.querySelector('.slot-front').textContent);
        if (unlockedSlots.length < 2) return;

        const names = unlockedSlots.map(s => s.querySelector('.slot-front').textContent);
        const finalAssignments = new Map();
        const shuffledNames = [...names].sort(() => Math.random() - 0.5);
        unlockedSlots.forEach((slot, index) => {
            finalAssignments.set(slot, shuffledNames[index]);
        });
        
        unlockedSlots.forEach((slot, index) => {
            animateSlotUpdate(slot, finalAssignments.get(slot), index * 50);
        });
    };

    const shuffleByPosition = () => {
        POSITIONS.forEach((pos, i) => {
            const slot1 = team1Slots[i];
            const slot2 = team2Slots[i];
            if (!slot1.classList.contains('locked') && !slot2.classList.contains('locked') && slot1.querySelector('.slot-front').textContent && slot2.querySelector('.slot-front').textContent && Math.random() > 0.5) {
                const temp = slot1.querySelector('.slot-front').textContent;
                animateSlotUpdate(slot1, slot2.querySelector('.slot-front').textContent, i * 50);
                animateSlotUpdate(slot2, temp, i * 50);
            }
        });
    };
    
    const shuffleTeamPositions = () => {
        const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

        const team1UnlockedSlots = team1Slots.filter(s => !s.classList.contains('locked') && s.querySelector('.slot-front').textContent);
        const team1Names = team1UnlockedSlots.map(s => s.querySelector('.slot-front').textContent);
        const shuffledTeam1Names = shuffleArray(team1Names);
        
        const team2UnlockedSlots = team2Slots.filter(s => !s.classList.contains('locked') && s.querySelector('.slot-front').textContent);
        const team2Names = team2UnlockedSlots.map(s => s.querySelector('.slot-front').textContent);
        const shuffledTeam2Names = shuffleArray(team2Names);

        team1UnlockedSlots.forEach((slot, i) => {
            animateSlotUpdate(slot, shuffledTeam1Names[i], i * 80);
        });

        team2UnlockedSlots.forEach((slot, i) => {
            animateSlotUpdate(slot, shuffledTeam2Names[i], i * 80);
        });
    };

    teamSwapButton?.addEventListener('click', () => {
        swapAllTeams();
    });

    copyButton?.addEventListener('click', async () => {
        let text = "1팀\t2팀\n";
        POSITIONS.forEach((pos, i) => {
            const p1 = team1Slots[i].querySelector('.slot-front').textContent || "-";
            const p2 = team2Slots[i].querySelector('.slot-front').textContent || "-";
            text += `${p1} : ${p2}\n`;
        });
        await ipcRenderer.invoke('write-clipboard', text);
        showNotification('팀 구성이 클립보드에 복사되었습니다.');
    });

    submitTeamsBtn?.addEventListener('click', () => {
        const currentServer = getCurrentServer();
        if (!currentServer?.guild?.id) { 
            showNotification('봇 설정을 통해 서버를 먼저 선택해주세요.', 'error'); 
            return; 
        }
        const team1 = team1Slots.map(s => s.querySelector('.slot-front').textContent).filter(Boolean);
        const team2 = team2Slots.map(s => s.querySelector('.slot-front').textContent).filter(Boolean);
        if (team1.length === 0 && team2.length === 0) {
            showNotification('봇으로 전송할 팀 정보가 없습니다.', 'error');
            return;
        }
        const payload = { guildId: currentServer.guild.id, team1, team2 };
        ipcRenderer.send('submit-teams-discord', payload);
        showNotification('팀 정보를 봇으로 전송했습니다.');
    });

    lcuInviteBtn?.addEventListener('click', () => {
        const team1 = team1Slots.map(s => s.querySelector('.slot-front').textContent).filter(Boolean);
        const team2 = team2Slots.map(s => s.querySelector('.slot-front').textContent).filter(Boolean);
        const allPlayers = [...team1, ...team2];
        if (allPlayers.length > 0) {
            ipcRenderer.send('lcu-invite-to-lobby', allPlayers);
        } else {
            showNotification('초대할 플레이어가 팀에 없습니다.', 'error');
        }
    });

    let selectedShuffleAction = {
        func: shuffleAll,
        name: '전체 랜덤'
    };

    shuffleMainBtn?.addEventListener('click', () => {
        selectedShuffleAction.func();
    });

    shuffleDropdownToggleBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        shuffleDropdownContent.classList.toggle('show');
    });

    window.addEventListener('click', (e) => {
        if (!shuffleDropdownToggleBtn?.contains(e.target)) {
            shuffleDropdownContent?.classList.remove('show');
        }
    });

    shuffleAllBtn?.addEventListener('click', () => {
        selectedShuffleAction = { func: shuffleAll, name: '전체 랜덤' };
        shuffleMainBtn.textContent = selectedShuffleAction.name;
        shuffleDropdownContent.classList.remove('show');
    });
    
    shufflePosBtn?.addEventListener('click', () => {
        selectedShuffleAction = { func: shuffleByPosition, name: '라인별 랜덤' };
        shuffleMainBtn.textContent = selectedShuffleAction.name;
        shuffleDropdownContent.classList.remove('show');
    });

    shuffleTeamPosBtn?.addEventListener('click', () => {
        selectedShuffleAction = { func: shuffleTeamPositions, name: '포지션 랜덤' };
        shuffleMainBtn.textContent = selectedShuffleAction.name;
        shuffleDropdownContent.classList.remove('show');
    });
}

/**
 * 메인 그리드 컴포넌트를 초기화하는 메인 함수
 */
export function initMainGrid() {
    createGridSlots();
    setupDragAndDrop();
    setupSlotInteractions();
    setupActionButtons();
}

