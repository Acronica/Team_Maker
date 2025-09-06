export function initTitleBar() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (window.electronAPI) {
        minimizeBtn?.addEventListener('click', () => window.electronAPI.send('minimize-window'));
        maximizeBtn?.addEventListener('click', () => window.electronAPI.send('maximize-window'));
        closeBtn?.addEventListener('click', () => window.electronAPI.send('close-window'));
    }
}

