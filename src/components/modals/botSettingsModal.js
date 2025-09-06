import { showNotification } from '../../utils.js';
import { getCurrentServer, setCurrentServer, getSavedServers, setSavedServers } from '../../services/settingsService.js';

export function initBotSettingsModal() {
    const modal = document.getElementById('bot-settings-modal');
    const openBtn = document.getElementById('panel-bot-settings-btn');
    const closeBtn = document.getElementById('bot-settings-close-btn');
    const serverListDiv = document.getElementById('saved-server-list');
    const serverIdInput = document.getElementById('server-id-input');
    const addServerBtn = document.getElementById('add-server-btn');
    const displayDiv = document.getElementById('current-server-display');

    const displayCurrentSettings = () => {
        const settings = getCurrentServer();
        if (settings && settings.guild && settings.lobby) {
            displayDiv.innerHTML = `
                <h4>현재 선택된 서버</h4>
                <p>
                    <strong>서버:</strong> <span>${settings.guild.name}</span><br>
                    <strong>대기 채널:</strong> <span>${settings.lobby.name}</span>
                </p>`;
        } else {
            displayDiv.innerHTML = `<h4>현재 선택된 서버</h4><p>선택된 서버가 없습니다.</p>`;
        }
    };

    const renderSavedServers = () => {
        serverListDiv.innerHTML = '';
        const savedServers = getSavedServers();
        const currentServer = getCurrentServer();

        if (savedServers.length === 0) {
            serverListDiv.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">추가된 서버가 없습니다.</p>';
            return;
        }

        savedServers.forEach(server => {
            const item = document.createElement('div');
            item.className = 'select-item';
            if (currentServer && currentServer.guild.id === server.id) {
                item.classList.add('selected');
            }
            
            const serverName = document.createElement('span');
            serverName.textContent = server.name;
            item.appendChild(serverName);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-server-btn';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let currentServers = getSavedServers();
                currentServers = currentServers.filter(s => s.id !== server.id);
                setSavedServers(currentServers);
                if (currentServer && currentServer.guild.id === server.id) {
                    localStorage.removeItem('currentServer');
                }
                renderSavedServers();
                displayCurrentSettings();
            });
            item.appendChild(deleteBtn);

            item.addEventListener('click', async () => {
                 const result = await window.electronAPI.invoke('get-server-config', server.id);
                 if (result.success) {
                     setCurrentServer(result.data);
                     showNotification(`'${server.name}' 서버 설정이 동기화되었습니다.`);
                     renderSavedServers();
                     displayCurrentSettings();
                 } else {
                     showNotification(`설정 동기화 실패: ${result.error}`, 'error');
                 }
            });
            serverListDiv.appendChild(item);
        });
    };

    const addServer = async () => {
        const serverId = serverIdInput.value.trim();
        if (!serverId) {
            showNotification('서버 ID를 입력해주세요.', 'error');
            return;
        }

        const savedServers = getSavedServers();
        if (savedServers.some(s => s.id === serverId)) {
            showNotification('이미 추가된 서버입니다.', 'error');
            return;
        }

        const result = await window.electronAPI.invoke('get-server-info', serverId);
        if (result.success) {
            const newServer = { id: result.data.id, name: result.data.name };
            savedServers.push(newServer);
            setSavedServers(savedServers);
            renderSavedServers();
            serverIdInput.value = '';
            showNotification(`'${newServer.name}' 서버가 추가되었습니다.`);
        } else {
            showNotification(`서버를 찾을 수 없습니다: ${result.error}`, 'error');
        }
    };

    openBtn?.addEventListener('click', () => {
        document.getElementById('side-panel').classList.remove('open');
        document.getElementById('menu-btn').classList.add('hidden');
        modal.style.display = 'flex';
        displayCurrentSettings();
        renderSavedServers();
    });

    closeBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
        if (!document.getElementById('side-panel').classList.contains('open')) {
            document.getElementById('menu-btn').classList.remove('hidden');
        }
    });

    addServerBtn?.addEventListener('click', addServer);
    serverIdInput?.addEventListener('keydown', e => { if (e.key === 'Enter') addServer(); });
}

