document.addEventListener('DOMContentLoaded', () => {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (window.electronAPI) {
        minimizeBtn.addEventListener('click', () => window.electronAPI.minimize());
        maximizeBtn.addEventListener('click', () => window.electronAPI.maximize());
        closeBtn.addEventListener('click', () => window.electronAPI.close());
    }

    const rosterList = document.getElementById('roster-list');
    const fetchButton = document.getElementById('fetch-users-btn');
    const moveTeamsBtn = document.getElementById('move-teams-btn');

    const TOTAL_SLOTS = 20;
    let rosterSlots = [];

    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const slot = document.createElement('div');
        slot.className = 'roster-slot';
        slot.setAttribute('draggable', true);
        rosterList.appendChild(slot);
        rosterSlots.push(slot);

        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            if (window.electronAPI) {
                window.electronAPI.send('item-dropped');
            }
        });
    }
    
    fetchButton.addEventListener('click', () => {
        window.electronAPI.send('fetch-discord-users');
        fetchButton.textContent = '...';
        fetchButton.disabled = true;
    });

    moveTeamsBtn.addEventListener('click', () => {
        const team1 = rosterSlots.map(s => s.textContent).filter(Boolean);
        if (team1.length === 0) {
            alert('이동할 인원이 없습니다.');
            return;
        }
        window.electronAPI.send('move-teams-discord', { team1: team1, team2: [] });
        moveTeamsBtn.textContent = '...';
        moveTeamsBtn.disabled = true;
    });

    if (window.electronAPI) {
        window.electronAPI.on('users-fetched-success', (users) => {
            rosterSlots.forEach(slot => slot.textContent = '');
            users.forEach((user, index) => {
                if (index < TOTAL_SLOTS) rosterSlots[index].textContent = user.name;
            });
            fetchButton.textContent = '불러오기';
            fetchButton.disabled = false;
        });

        window.electronAPI.on('users-fetched-error', (error) => {
            alert(`유저 목록 로딩 실패: ${error}`);
            fetchButton.textContent = '불러오기';
            fetchButton.disabled = false;
        });

        window.electronAPI.on('move-teams-success', (result) => {
            alert(`${result.movedCount}명의 이동이 완료되었습니다!`);
            moveTeamsBtn.textContent = '팀 이동';
            moveTeamsBtn.disabled = false;
        });

        window.electronAPI.on('move-teams-error', (error) => {
            alert(`팀 이동 실패: ${error}`);
            moveTeamsBtn.textContent = '팀 이동';
            moveTeamsBtn.disabled = false;
        });

        window.electronAPI.on('add-to-roster', ({ name }) => {
            const emptySlot = rosterSlots.find(slot => !slot.textContent);
            if (emptySlot) {
                emptySlot.textContent = name;
            } else {
                alert('인원 목록에 빈 슬롯이 없습니다.');
            }
        });
    }
});