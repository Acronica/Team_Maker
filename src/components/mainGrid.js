import { POSITIONS, POSITION_COLORS } from '../config.js';
import { showNotification, setSlotText } from '../utils.js';
import { ipcRenderer } from '../services/ipcService.js';
import { dragManager } from '../services/dragManager.js';
import { getCurrentServer } from '../services/settingsService.js';

let team1Slots = [];
let team2Slots = [];
let allSlots = [];

/**
 * 메인 그리드의 플레이어 슬롯과 헤더를 생성합니다.
 */
function createGridSlots() {
    const gridSection = document.querySelector('.grid-section');
    if (!gridSection) return;
    gridSection.innerHTML = ''; // 기존 내용을 초기화합니다.

    // 팀 타이틀 헤더 생성
    const headerContainer = document.createElement('div');
    headerContainer.className = 'grid-header team-title';
    headerContainer.textContent = '1팀';
    
    const teamSwapBtn = document.createElement('button');
    teamSwapBtn.id = 'team-swap-button';
    teamSwapBtn.className = 'team-swap-header-btn';
    teamSwapBtn.innerHTML = '↔';

    const headerContainer2 = document.createElement('div');
    headerContainer2.className = 'grid-header team-title';
    headerContainer2.textContent = '2팀';
    
    gridSection.append(document.createElement('div'), headerContainer, teamSwapBtn, headerContainer2);

    // 포지션별 슬롯 생성
    team1Slots = [];
    team2Slots = [];
    allSlots = [];

    POSITIONS.forEach((pos) => {
        const posLabel = document.createElement('div');
        posLabel.className = 'position-label';
        posLabel.textContent = pos;
        posLabel.style.backgroundColor = POSITION_COLORS[pos];

        const team1Slot = document.createElement('div');
        team1Slot.className = 'player-slot';

        const swapButton = document.createElement('button');
        swapButton.className = 'swap-button';
        swapButton.innerHTML = '↔';

        const team2Slot = document.createElement('div');
        team2Slot.className = 'player-slot';

        gridSection.append(posLabel, team1Slot, swapButton, team2Slot);
        team1Slots.push(team1Slot);
        team2Slots.push(team2Slot);

        swapButton.addEventListener('click', () => {
            if (team1Slot.classList.contains('locked') || team2Slot.classList.contains('locked')) return;
            const tempName1 = team1Slot.textContent;
            const tempName2 = team2Slot.textContent;
            setSlotText(team1Slot, tempName2);
            setSlotText(team2Slot, tempName1);
        });

        posLabel.addEventListener('click', () => [posLabel, team1Slot, swapButton, team2Slot].forEach(el => el.classList.toggle('highlight')));
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
 * 슬롯의 드래그 앤 드롭 기능을 설정합니다.
 */
function setupDragAndDrop() {
    allSlots.forEach(slot => {
        slot.setAttribute('draggable', true);
        
        slot.addEventListener('dragstart', (e) => {
            if (slot.classList.contains('locked') || !slot.textContent) {
                e.preventDefault();
                return;
            }
            dragManager.start(e, slot.textContent, 'grid');
        });

        slot.addEventListener('dragend', () => dragManager.end());
        slot.addEventListener('dragover', (e) => e.preventDefault());

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetSlot = e.currentTarget;
            if (targetSlot.classList.contains('locked') || !dragManager.draggedItem) return;

            const from = dragManager.draggedItem;
            if (from.element === targetSlot) return;

            const toName = targetSlot.textContent; 

            if (from.origin === 'grid') {
                setSlotText(from.element, toName);
                setSlotText(targetSlot, from.name);
            } else if (from.origin === 'roster') {
                setSlotText(targetSlot, from.name);
                setSlotText(from.element, ''); 
                if (toName) {
                    const addToRosterEvent = new CustomEvent('addToRoster', { detail: { name: toName } });
                    document.dispatchEvent(addToRosterEvent);
                }
            }
            
            targetSlot.classList.add('flash');
            targetSlot.addEventListener('animationend', () => targetSlot.classList.remove('flash'), { once: true });
        });
    });
}

/**
 * 슬롯의 클릭 및 더블클릭 상호작용(잠금, 이름 수정)을 설정합니다.
 */
function setupSlotInteractions() {
    allSlots.forEach(slot => {
        let clickTimer = null;
        slot.addEventListener('click', () => {
            clickTimer = setTimeout(() => {
                if (slot.textContent) slot.classList.toggle('locked');
            }, 200);
        });

        slot.addEventListener('dblclick', () => {
            clearTimeout(clickTimer);
            if (!slot.textContent || slot.classList.contains('locked')) return;

            const originalName = slot.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = originalName;
            Object.assign(input.style, {
                width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent',
                color: '#f0e6d2', textAlign: 'center', fontSize: '21px', fontFamily: 'inherit', outline: 'none'
            });

            slot.textContent = '';
            slot.appendChild(input);
            input.focus();

            const saveName = () => {
                const newName = input.value.trim();
                const allNamesInGrid = allSlots.map(s => s.textContent).filter(Boolean);
                
                if (newName === '') {
                    setSlotText(slot, '');
                } else if (allNamesInGrid.includes(newName) && newName !== originalName) {
                    setSlotText(slot, originalName);
                    showNotification(`'${newName}'은/는 이미 슬롯에 존재합니다.`, 'error');
                } else {
                    setSlotText(slot, newName);
                }
                if (input.parentNode) input.remove();
            };

            input.addEventListener('blur', saveName);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur();
                if (e.key === 'Escape') {
                    setSlotText(slot, originalName);
                    if (input.parentNode) input.remove();
                }
            });
        });
    });
}

/**
 * 이름 추가, 초기화, 랜덤 등 하단 액션 버튼들의 기능을 설정합니다.
 */
function setupActionButtons() {
    const nameInput = document.getElementById('name-input');
    const addButton = document.getElementById('add-button');
    const resetButton = document.getElementById('reset-button');
    const copyButton = document.getElementById('copy-button');
    const submitTeamsBtn = document.getElementById('submit-teams-btn');
    const teamSwapButton = document.getElementById('team-swap-button');
    const lcuInviteBtn = document.getElementById('lcu-invite-btn'); // 새로 추가된 버튼
    
    const shuffleMainBtn = document.getElementById('shuffle-main-btn');
    const shuffleDropdownToggleBtn = document.getElementById('shuffle-dropdown-toggle-btn');
    const shuffleDropdownContent = document.getElementById('shuffle-dropdown-content');
    const shuffleAllBtn = document.getElementById('shuffle-all-btn');
    const shufflePosBtn = document.getElementById('shuffle-pos-btn');
    const shuffleTeamPosBtn = document.getElementById('shuffle-team-pos-btn');
    
    const addName = () => {
        const name = nameInput.value.trim();
        if (!name) return;

        const allNamesInGrid = allSlots.map(s => s.textContent).filter(Boolean);
        if (allNamesInGrid.includes(name)) {
            showNotification(`'${name}'은/는 이미 슬롯에 존재합니다.`, 'error');
            nameInput.value = '';
            return;
        }

        const emptySlot = allSlots.find(slot => !slot.textContent);
        if (emptySlot) {
            setSlotText(emptySlot, name);
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
        allSlots.forEach(slot => { setSlotText(slot, ''); slot.classList.remove('locked'); });
        showNotification('모든 슬롯이 초기화되었습니다.');
    });

    const shuffleAll = async () => {
        const unlockedSlots = allSlots.filter(s => !s.classList.contains('locked') && s.textContent);
        if (unlockedSlots.length < 2) return;

        const names = unlockedSlots.map(s => s.textContent);
        const finalAssignments = new Map();
        const shuffledNames = [...names].sort(() => Math.random() - 0.5);
        unlockedSlots.forEach((slot, index) => {
            finalAssignments.set(slot, shuffledNames[index]);
        });

        // 애니메이션 시작: 슬롯 숨기기
        unlockedSlots.forEach(slot => slot.style.opacity = '0');
        await new Promise(resolve => setTimeout(resolve, 200));

        // 애니메이션 종료: 순차적으로 나타나기
        unlockedSlots.forEach((slot, index) => {
            setTimeout(() => {
                setSlotText(slot, finalAssignments.get(slot));
                slot.style.opacity = '1';
                slot.classList.add('pop-in');
                slot.addEventListener('animationend', () => slot.classList.remove('pop-in'), { once: true });
            }, index * 80);
        });
    };

    const shuffleByPosition = () => {
        let swapped = false;
        POSITIONS.forEach((pos, i) => {
            const slot1 = team1Slots[i];
            const slot2 = team2Slots[i];
            if (!slot1.classList.contains('locked') && !slot2.classList.contains('locked') && slot1.textContent && slot2.textContent && Math.random() > 0.5) {
                const temp = slot1.textContent;
                setSlotText(slot1, slot2.textContent);
                setSlotText(slot2, temp);
                swapped = true;
                [slot1, slot2].forEach(s => {
                    s.classList.add('flash');
                    s.addEventListener('animationend', () => s.classList.remove('flash'), { once: true });
                });
            }
        });
        if (!swapped) {
             const availablePairs = POSITIONS.map((p, i) => i).filter(i => {
                const slot1 = team1Slots[i];
                const slot2 = team2Slots[i];
                return !slot1.classList.contains('locked') && !slot2.classList.contains('locked') && slot1.textContent && slot2.textContent;
            });
            if (availablePairs.length > 0) {
                const randomIndex = availablePairs[Math.floor(Math.random() * availablePairs.length)];
                const slot1 = team1Slots[randomIndex];
                const slot2 = team2Slots[randomIndex];
                const temp = slot1.textContent;
                setSlotText(slot1, slot2.textContent);
                setSlotText(slot2, temp);
                [slot1, slot2].forEach(s => {
                    s.classList.add('flash');
                    s.addEventListener('animationend', () => s.classList.remove('flash'), { once: true });
                });
            }
        }
    };
    
    const shuffleTeamPositions = async () => {
        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        const team1UnlockedSlots = team1Slots.filter(s => !s.classList.contains('locked') && s.textContent);
        const team1Names = team1UnlockedSlots.map(s => s.textContent);
        const shuffledTeam1Names = shuffleArray([...team1Names]);
        
        const team2UnlockedSlots = team2Slots.filter(s => !s.classList.contains('locked') && s.textContent);
        const team2Names = team2UnlockedSlots.map(s => s.textContent);
        const shuffledTeam2Names = shuffleArray([...team2Names]);

        const allUnlockedSlots = [...team1UnlockedSlots, ...team2UnlockedSlots];
        
        allUnlockedSlots.forEach(slot => slot.style.opacity = '0');
        await new Promise(resolve => setTimeout(resolve, 200));

        team1UnlockedSlots.forEach((slot, i) => {
            setTimeout(() => {
                setSlotText(slot, shuffledTeam1Names[i]);
                slot.style.opacity = '1';
                slot.classList.add('pop-in');
                slot.addEventListener('animationend', () => slot.classList.remove('pop-in'), { once: true });
            }, i * 80);
        });

        team2UnlockedSlots.forEach((slot, i) => {
            setTimeout(() => {
                setSlotText(slot, shuffledTeam2Names[i]);
                slot.style.opacity = '1';
                slot.classList.add('pop-in');
                slot.addEventListener('animationend', () => slot.classList.remove('pop-in'), { once: true });
            }, i * 80);
        });
    };

    teamSwapButton?.addEventListener('click', () => {
        POSITIONS.forEach((pos, i) => {
            const slot1 = team1Slots[i];
            const slot2 = team2Slots[i];
            if (!slot1.classList.contains('locked') && !slot2.classList.contains('locked')) {
                const tempName1 = slot1.textContent;
                setSlotText(slot1, slot2.textContent);
                setSlotText(slot2, tempName1);
            }
        });
        showNotification('1팀과 2팀의 모든 라인을 스왑했습니다.');
    });

    copyButton?.addEventListener('click', async () => {
        let text = "1팀\t2팀\n";
        POSITIONS.forEach((pos, i) => {
            const p1 = team1Slots[i].textContent || "-";
            const p2 = team2Slots[i].textContent || "-";
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

        const team1 = team1Slots.map(s => s.textContent).filter(Boolean);
        const team2 = team2Slots.map(s => s.textContent).filter(Boolean);

        if (team1.length === 0 && team2.length === 0) {
            showNotification('봇으로 전송할 팀 정보가 없습니다.', 'error');
            return;
        }

        const payload = { 
            guildId: currentServer.guild.id, 
            team1, 
            team2 
        };
        ipcRenderer.send('submit-teams-discord', payload);
        showNotification('팀 정보를 봇으로 전송했습니다.');
    });

    lcuInviteBtn?.addEventListener('click', () => {
        const team1 = team1Slots.map(s => s.textContent).filter(Boolean);
        const team2 = team2Slots.map(s => s.textContent).filter(Boolean);
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

