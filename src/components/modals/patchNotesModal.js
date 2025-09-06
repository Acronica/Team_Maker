export function initPatchNotesModal() {
    const panelPatchNotesBtn = document.getElementById('panel-patch-notes-btn');
    const patchNotesModal = document.getElementById('patch-notes-modal');
    const patchNotesCloseBtn = document.getElementById('patch-notes-close-btn');
    const patchNotesBody = document.getElementById('patch-notes-body');
    const updateNotificationBar = document.getElementById('update-notification-bar');
    const showPatchNotesLink = document.getElementById('show-patch-notes-link');
    const updateStatusText = document.getElementById('update-status-text');
    const updateNowBtn = document.getElementById('update-now-btn');

    const openModal = async () => {
        const notesHTML = await window.electronAPI.invoke('get-patch-notes');
        patchNotesBody.innerHTML = notesHTML;
        patchNotesModal.style.display = 'flex';
        document.getElementById('side-panel').classList.remove('open');
        document.getElementById('menu-btn').classList.add('hidden');
    };

    const closeModal = () => {
        patchNotesModal.style.display = 'none';
        if (!document.getElementById('side-panel').classList.contains('open')) {
            document.getElementById('menu-btn').classList.remove('hidden');
        }
    };

    panelPatchNotesBtn?.addEventListener('click', openModal);
    patchNotesCloseBtn?.addEventListener('click', closeModal);
    showPatchNotesLink?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });
    
    updateNowBtn?.addEventListener('click', () => {
        if (updateNowBtn.dataset.action === 'install') {
            window.electronAPI.send('quit-and-install');
        } else {
            window.electronAPI.send('start-update');
            updateStatusText.textContent = '업데이트 다운로드를 시작합니다...';
            updateNowBtn.disabled = true;
        }
    });

    window.electronAPI.on('update-available', (info) => {
        updateNotificationBar.style.display = 'flex';
        const badge = document.createElement('span');
        badge.className = 'update-badge';
        panelPatchNotesBtn.appendChild(badge);
        updateStatusText.textContent = `새로운 버전(v${info.version})을 설치할 수 있습니다.`;
        updateNowBtn.textContent = `v${info.version}으로 업데이트`;
        updateNowBtn.style.display = 'block';
        updateNowBtn.disabled = false;
    });
    
    window.electronAPI.on('update-not-available', () => {
        updateStatusText.textContent = '최신 버전을 사용 중입니다.';
        updateNowBtn.style.display = 'none';
    });

    window.electronAPI.on('update-download-progress', (progressInfo) => {
        const percent = Math.round(progressInfo.percent);
        updateStatusText.textContent = `다운로드 중... ${percent}% (${(progressInfo.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s)`;
        updateNowBtn.textContent = `다운로드 중... ${percent}%`;
    });

    window.electronAPI.on('update-downloaded', () => {
        updateStatusText.textContent = '다운로드 완료! 앱을 재시작하면 업데이트가 설치됩니다.';
        updateNowBtn.textContent = '재시작하여 업데이트 설치';
        updateNowBtn.dataset.action = 'install';
        updateNowBtn.disabled = false;
    });

    window.electronAPI.on('update-error', (errorMessage) => {
        updateStatusText.textContent = `업데이트 오류: ${errorMessage}`;
        updateNowBtn.textContent = '업데이트';
        updateNowBtn.disabled = false;
    });
}

