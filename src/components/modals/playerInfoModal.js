import { showNotification } from '../../utils.js';

let userData = {};

async function loadAndRenderUsers() {
    userData = await window.electronAPI.invoke('load-user-data');
    renderSavedUsers();
}

function renderSavedUsers() {
    const userListDiv = document.getElementById('saved-user-list');
    userListDiv.innerHTML = '';
    const userEntries = Object.entries(userData).sort((a, b) => a[0].localeCompare(b[0]));

    if (userEntries.length === 0) {
        userListDiv.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">저장된 유저가 없습니다.</p>';
        return;
    }

    userEntries.forEach(([discordName, info]) => {
        const item = document.createElement('div');
        item.className = 'select-item';

        const namePair = document.createElement('span');
        namePair.className = 'name-pair';
        namePair.innerHTML = `${discordName} <span class="lol-id">→ ${info.lolId}</span>`;
        item.appendChild(namePair);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-user-btn';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            delete userData[discordName];
            await window.electronAPI.invoke('save-user-data', userData);
            showNotification(`'${discordName}'님의 정보가 삭제되었습니다.`);
            renderSavedUsers();
        });
        item.appendChild(deleteBtn);

        item.addEventListener('click', () => {
            document.getElementById('user-discord-name-input').value = discordName;
            document.getElementById('user-lol-id-input').value = info.lolId;
        });
        userListDiv.appendChild(item);
    });
}

export function initPlayerInfoModal() {
    const modal = document.getElementById('player-info-modal');
    const openBtn = document.getElementById('panel-player-info-btn');
    const closeBtn = document.getElementById('player-info-close-btn');
    const addUserBtn = document.getElementById('add-user-btn');
    const discordNameInput = document.getElementById('user-discord-name-input');
    const lolIdInput = document.getElementById('user-lol-id-input');

    const saveUser = async () => {
        const discordName = discordNameInput.value.trim();
        const lolId = lolIdInput.value.trim();
        if (!discordName || !lolId) {
            showNotification('디스코드 이름과 Riot ID를 모두 입력해주세요.', 'error');
            return;
        }

        addUserBtn.disabled = true;
        addUserBtn.textContent = '확인 중...';

        const verificationResult = await window.electronAPI.invoke('verify-summoner', lolId);
        if (!verificationResult.success) {
            showNotification(verificationResult.error, 'error');
        } else {
            const verifiedRiotId = verificationResult.data.name;
            userData[discordName] = { lolId: verifiedRiotId };
            const saveResult = await window.electronAPI.invoke('save-user-data', userData);
            if (saveResult.success) {
                showNotification(`'${discordName}'님의 정보가 저장되었습니다. (Riot ID: ${verifiedRiotId})`);
                renderSavedUsers();
                discordNameInput.value = '';
                lolIdInput.value = '';
                discordNameInput.focus();
            } else {
                showNotification(`저장 실패: ${saveResult.error}`, 'error');
            }
        }
        addUserBtn.disabled = false;
        addUserBtn.textContent = '저장';
    };

    openBtn?.addEventListener('click', () => {
        document.getElementById('side-panel').classList.remove('open');
        document.getElementById('menu-btn').classList.add('hidden');
        modal.style.display = 'flex';
        loadAndRenderUsers();
    });

    closeBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
        if (!document.getElementById('side-panel').classList.contains('open')) {
            document.getElementById('menu-btn').classList.remove('hidden');
        }
    });

    addUserBtn?.addEventListener('click', saveUser);
    lolIdInput?.addEventListener('keydown', e => { if(e.key === 'Enter') saveUser(); });
}

