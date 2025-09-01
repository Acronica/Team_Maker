window.addEventListener('DOMContentLoaded', () => {

    // =================================================
    // 0. 유틸리티 함수 및 설정 관리
    // =================================================
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        Object.assign(notification.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            padding: '12px 25px', borderRadius: '5px', color: '#f0e6d2',
            backgroundColor: type === 'error' ? 'rgba(200, 60, 60, 0.9)' : 'rgba(20, 120, 80, 0.9)',
            border: '1px solid #785a28', zIndex: '121',
            transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
            fontFamily: "'NanumSquare', sans-serif", fontSize: '16px', boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)'
        });
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translate(-50%, -50%) scale(1.05)';
        }, 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translate(-50%, -50%) scale(0.9)';
            notification.addEventListener('transitionend', () => notification.remove());
        }, 2500);
    };

    const setCurrentServer = (server) => {
        localStorage.setItem('currentServer', JSON.stringify(server));
        displayCurrentSettings(); 
    };

    const getSavedServers = () => {
        try {
            const servers = JSON.parse(localStorage.getItem('savedServers')) || [];
            if (Array.isArray(servers)) {
                return servers.filter(s => s && typeof s === 'object' && s.id && s.name);
            }
            localStorage.removeItem('savedServers');
            return [];
        } catch (e) {
            console.error("손상된 서버 목록 데이터를 정리합니다:", e);
            localStorage.removeItem('savedServers');
            return [];
        }
    };
    const setSavedServers = (servers) => localStorage.setItem('savedServers', JSON.stringify(servers));

    const getCurrentServer = () => {
        try {
            return JSON.parse(localStorage.getItem('currentServer'));
        } catch (e) {
            localStorage.removeItem('currentServer'); 
            return null;
        }
    };
    
    const displayCurrentSettings = () => {
        const displayDiv = document.getElementById('current-server-display');
        const settings = getCurrentServer();
         if (settings && settings.guild && settings.lobby) {
            displayDiv.innerHTML = `
                <h4>현재 선택된 서버</h4>
                <p>
                    <strong>서버:</strong> <span>${settings.guild.name}</span><br>
                    <strong>대기 채널:</strong> <span>${settings.lobby.name}</span>
                </p>
            `;
        } else {
            displayDiv.innerHTML = `<h4>현재 선택된 서버</h4><p>선택된 서버가 없습니다.</p>`;
        }
    };

    // =================================================
    // 1. 봇 설정 기능 초기화 (서버 수동 관리 방식)
    // =================================================
    function initBotSettings() {
        const modal = document.getElementById('bot-settings-modal');
        const openBtn = document.getElementById('panel-bot-settings-btn');
        const closeBtn = document.getElementById('bot-settings-close-btn');
        const serverListDiv = document.getElementById('saved-server-list');
        const serverIdInput = document.getElementById('server-id-input');
        const addServerBtn = document.getElementById('add-server-btn');

        const openModal = () => {
            sidePanel.classList.remove('open');
            menuBtn.classList.add('hidden');
            modal.style.display = 'flex';
            displayCurrentSettings();
            renderSavedServers();
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
                    deleteServer(server.id);
                });
                item.appendChild(deleteBtn);

                item.addEventListener('click', () => handleServerSelect(server));
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

        const deleteServer = (serverId) => {
            let savedServers = getSavedServers();
            savedServers = savedServers.filter(s => s.id !== serverId);
            setSavedServers(savedServers);

            const currentServer = getCurrentServer();
            if (currentServer && currentServer.guild.id === serverId) {
                localStorage.removeItem('currentServer');
            }
            
            renderSavedServers();
            displayCurrentSettings();
        };
        
        const handleServerSelect = async (server) => {
            const result = await window.electronAPI.invoke('get-server-config', server.id);
            if (result.success) {
                setCurrentServer(result.data);
                showNotification(`'${server.name}' 서버 설정이 동기화되었습니다.`);
                renderSavedServers();
            } else {
                showNotification(`설정 동기화 실패: ${result.error}`, 'error');
            }
        };

        const closeModal = () => {
            modal.style.display = 'none';
            if (!panel.classList.contains('open')) {
                menuBtn.classList.remove('hidden');
            }
        };

        openBtn.addEventListener('click', openModal);
        closeBtn.addEventListener('click', closeModal);
        addServerBtn.addEventListener('click', addServer);
        serverIdInput.addEventListener('keydown', e => { if (e.key === 'Enter') addServer(); });
    }

    // =================================================
    // 2. 사다리/돌림판 게임 초기화
    // =================================================
    function initLadder() {
        const ladderModal = document.getElementById('ladder-modal');
        const panelLadderBtn = document.getElementById('panel-ladder-btn');
        const ladderCloseBtn = document.getElementById('ladder-close-btn');
        const ladderCanvas = document.getElementById('ladder-canvas');
        if (!ladderCanvas) return;
        const ctxL = ladderCanvas.getContext('2d');
        const ladderCountSpan = document.getElementById('ladder-count');
        const ladderPlusBtn = document.getElementById('ladder-plus-btn');
        const ladderMinusBtn = document.getElementById('ladder-minus-btn');
        const nameInputsDiv = document.getElementById('ladder-name-inputs');
        const resultInputsDiv = document.getElementById('ladder-result-inputs');
        const generateBtn = document.getElementById('ladder-generate-btn');
        const resetBtn = document.getElementById('ladder-reset-btn');
        const resultBtn = document.getElementById('ladder-result-btn');
        const ladderResultModal = document.getElementById('ladder-result-modal');
        const ladderResultBody = document.getElementById('ladder-result-body');
        const ladderResultCloseBtn = document.getElementById('ladder-result-close-btn');
        const sidePanel = document.getElementById('side-panel');

        const LADDER_COLORS = ["#E63946", "#457B9D", "#F4A261", "#2A9D8F", "#264653", "#E9C46A", "#F15BB5", "#9B5DE5", "#E76F51", "#588157"];
        let numParticipants = 4;
        let rungs = [];
        let paths = [];
        let resultsMap = {};
        let isTracing = false;

        const updateLadderSlots = () => {
            numParticipants = parseInt(ladderCountSpan.textContent);
            nameInputsDiv.innerHTML = '';
            resultInputsDiv.innerHTML = '';
            nameInputsDiv.style.setProperty('--participant-count', numParticipants);
            resultInputsDiv.style.setProperty('--participant-count', numParticipants);
            for (let i = 0; i < numParticipants; i++) {
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.placeholder = `참가자 ${i + 1}`;
                nameInput.dataset.index = i;
                nameInputsDiv.appendChild(nameInput);
                const resultInput = document.createElement('input');
                resultInput.type = 'text';
                resultInput.placeholder = `결과 ${i + 1}`;
                resultInput.dataset.index = i;
                resultInputsDiv.appendChild(resultInput);
            }
        };

        const resetLadder = () => {
            rungs = [];
            paths = [];
            resultsMap = {};
            drawLadder();
            generateBtn.disabled = false;
            resultBtn.disabled = true;
        };

        const drawLadder = () => {
            if (!ladderCanvas.getContext) return;
            const w = ladderCanvas.width;
            const h = ladderCanvas.height;
            ctxL.clearRect(0, 0, w, h);
            if (numParticipants < 2) return;
            const xStep = w / numParticipants;
            ctxL.strokeStyle = '#c4b998';
            ctxL.lineWidth = 3;
            for (let i = 0; i < numParticipants; i++) {
                const x = xStep * (i + 0.5);
                ctxL.beginPath();
                ctxL.moveTo(x, 0);
                ctxL.lineTo(x, h);
                ctxL.stroke();
            }
            if (rungs.length === 0) return;
            const yStep = h / (rungs.length + 1);
            rungs.forEach((row, y) => {
                row.forEach((hasRung, x) => {
                    if (hasRung) {
                        const x1 = xStep * (x + 0.5);
                        const x2 = xStep * (x + 1.5);
                        const yPos = yStep * (y + 1);
                        ctxL.beginPath();
                        ctxL.moveTo(x1, yPos);
                        ctxL.lineTo(x2, yPos);
                        ctxL.stroke();
                    }
                });
            });
        };

        const generateLadder = () => {
            const numRungs = numParticipants * 3;
            rungs = Array(numRungs).fill(0).map(() => Array(numParticipants - 1).fill(false));
            for (let y = 0; y < numRungs; y++) {
                for (let x = 0; x < numParticipants - 1; x++) {
                    if (Math.random() > 0.65) {
                        if (x > 0 && rungs[y][x - 1]) continue;
                        rungs[y][x] = true;
                    }
                }
            }
            calculatePaths();
            drawLadder();
            generateBtn.disabled = true;
            resultBtn.disabled = false;
        };

        const calculatePaths = () => {
            paths = [];
            resultsMap = {};
            for (let i = 0; i < numParticipants; i++) {
                const path = [{ x: i, y: -1 }];
                let currentX = i;
                for (let y = 0; y < rungs.length; y++) {
                    if (currentX > 0 && rungs[y][currentX - 1]) {
                        path.push({ x: currentX, y: y });
                        currentX--;
                        path.push({ x: currentX, y: y });
                    } else if (currentX < numParticipants - 1 && rungs[y][currentX]) {
                        path.push({ x: currentX, y: y });
                        currentX++;
                        path.push({ x: currentX, y: y });
                    }
                }
                path.push({ x: currentX, y: rungs.length });
                paths.push(path);
                resultsMap[i] = currentX;
            }
        };
        
        const tracePath = (index) => {
            if (isTracing || !paths[index]) return;
            isTracing = true;
            const path = paths[index];
            let progress = 0;
            const w = ladderCanvas.width;
            const h = ladderCanvas.height;
            const xStep = w / numParticipants;
            const yStep = h / (rungs.length + 1);
            const animate = () => {
                drawLadder();
                ctxL.strokeStyle = LADDER_COLORS[index % LADDER_COLORS.length];
                ctxL.lineWidth = 5;
                ctxL.beginPath();
                for (let i = 0; i < progress; i++) {
                    const p1 = path[i];
                    const p2 = path[i + 1];
                    const x1 = xStep * (p1.x + 0.5);
                    const y1 = yStep * (p1.y + 1);
                    const x2 = xStep * (p2.x + 0.5);
                    const y2 = yStep * (p2.y + 1);
                    if (i === 0) ctxL.moveTo(x1, 0);
                    ctxL.lineTo(x2, y2);
                }
                ctxL.stroke();
                progress++;
                if (progress < path.length) {
                    requestAnimationFrame(animate);
                } else {
                    isTracing = false;
                }
            };
            animate();
        };

        const handleParticipantChange = () => {
            updateLadderSlots();
            resetLadder();
        };

        ladderPlusBtn.addEventListener('click', () => {
            if (numParticipants < 10) {
                numParticipants++;
                ladderCountSpan.textContent = numParticipants;
                handleParticipantChange();
            }
        });
        ladderMinusBtn.addEventListener('click', () => {
            if (numParticipants > 2) {
                numParticipants--;
                ladderCountSpan.textContent = numParticipants;
                handleParticipantChange();
            }
        });
        generateBtn.addEventListener('click', generateLadder);
        resetBtn.addEventListener('click', resetLadder);
        resultBtn.addEventListener('click', () => {
            ladderResultBody.innerHTML = '';
            const nameInputs = Array.from(nameInputsDiv.children);
            const resultInputs = Array.from(resultInputsDiv.children);
            for (let i = 0; i < numParticipants; i++) {
                const startName = nameInputs[i].value || `참가자 ${i + 1}`;
                const endIdx = resultsMap[i];
                const endName = resultInputs[endIdx].value || `결과 ${endIdx + 1}`;
                const item = document.createElement('div');
                item.className = 'ladder-result-item';
                item.innerHTML = `<span>${startName}</span><span class="arrow">→</span><span>${endName}</span>`;
                ladderResultBody.appendChild(item);
            }
            ladderResultModal.style.display = 'flex';
        });
        ladderCanvas.addEventListener('click', (e) => {
            if (generateBtn.disabled && !isTracing) {
                const rect = ladderCanvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const w = ladderCanvas.width;
                const xStep = w / numParticipants;
                const clickedIndex = Math.floor(x / xStep);
                if (clickedIndex >= 0 && clickedIndex < numParticipants) {
                    tracePath(clickedIndex);
                }
            }
        });
        panelLadderBtn.addEventListener('click', () => {
            sidePanel.classList.remove('open');
            menuBtn.classList.add('hidden');
            ladderModal.style.display = 'flex';
            requestAnimationFrame(() => {
                ladderCanvas.width = ladderCanvas.offsetWidth;
                ladderCanvas.height = ladderCanvas.offsetHeight;
                handleParticipantChange();
            });
        });
        ladderCloseBtn.addEventListener('click', () => {
            ladderModal.style.display = 'none';
            if (!panel.classList.contains('open')) {
               menuBtn.classList.remove('hidden');
            }
        });
        ladderResultCloseBtn.addEventListener('click', () => {
            ladderResultModal.style.display = 'none';
        });
    }

    function initRoulette() {
        const rouletteModal = document.getElementById('roulette-modal');
        const panelRouletteBtn = document.getElementById('panel-roulette-btn');
        const rouletteCloseBtn = document.getElementById('roulette-close-btn');
        const rouletteCanvas = document.getElementById('roulette-canvas');
        if(!rouletteCanvas) return;
        const ctxR = rouletteCanvas.getContext('2d');
        const spinBtn = document.getElementById('roulette-spin-btn');
        const resultDiv = document.getElementById('roulette-result');
        const countSpan = document.getElementById('roulette-count');
        const plusBtn = document.getElementById('roulette-plus-btn');
        const minusBtn = document.getElementById('roulette-minus-btn');
        const inputsDiv = document.getElementById('roulette-inputs');
        const sidePanel = document.getElementById('side-panel');

        const ROULETTE_COLORS = ["#ffadad", "#ffd6a5", "#fdffb6", "#caffbf", "#9bf6ff", "#a0c4ff", "#bdb2ff", "#ffc6ff", "#E76F51", "#588157"];
        let startAngle = 0;
        let spinAngleStart = 10;
        let spinTime = 0;
        let spinTimeTotal = 0;

        const updateRouletteInputs = () => {
            const count = parseInt(countSpan.textContent);
            inputsDiv.innerHTML = '';
            for (let i = 0; i < count; i++) {
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = `옵션 ${i + 1}`;
                input.addEventListener('input', drawRoulette);
                inputsDiv.appendChild(input);
            }
            drawRoulette();
        };

        const drawRoulette = () => {
            if (!rouletteCanvas.getContext) return;
            let options = Array.from(inputsDiv.children).map(input => input.value);
            let displayOptions = options.filter(Boolean).length > 0 ? options.filter(Boolean) : Array(options.length).fill("");
            
            const arc = Math.PI / (displayOptions.length / 2);
            const radius = rouletteCanvas.width / 2;
            ctxR.clearRect(0, 0, rouletteCanvas.width, rouletteCanvas.height);
            ctxR.save();
            ctxR.translate(radius, radius);
            ctxR.beginPath();
            ctxR.arc(0, 0, radius - 5, 0, Math.PI * 2);
            ctxR.strokeStyle = '#785a28';
            ctxR.lineWidth = 4;
            ctxR.stroke();
            ctxR.rotate(startAngle);
            
            displayOptions.forEach((opt, i) => {
                const angle = arc * i;
                ctxR.fillStyle = ROULETTE_COLORS[i % ROULETTE_COLORS.length];
                ctxR.beginPath();
                ctxR.arc(0, 0, radius - 10, angle, angle + arc, false);
                ctxR.arc(0, 0, 0, angle + arc, angle, true);
                ctxR.fill();

                if (opt) {
                    ctxR.save();
                    ctxR.fillStyle = "#000";
                    ctxR.font = 'bold 16px NanumSquare';
                    ctxR.translate(radius * 0.7 * Math.cos(angle + arc / 2), radius * 0.7 * Math.sin(angle + arc / 2));
                    ctxR.rotate(angle + arc / 2 + Math.PI / 2);
                    const text = opt.length > 10 ? opt.substring(0, 10) + '...' : opt;
                    ctxR.fillText(text, -ctxR.measureText(text).width / 2, 0);
                    ctxR.restore();
                }
            });
            ctxR.restore();
        };

        const rotateRoulette = () => {
            spinTime += 30;
            if (spinTime >= spinTimeTotal) {
                const options = Array.from(inputsDiv.children).map(input => input.value);
                const degrees = startAngle * 180 / Math.PI + 90;
                const arcd = 360 / options.length;
                const index = Math.floor((360 - degrees % 360) / arcd);
                resultDiv.textContent = `🎉 ${options[index] || '꽝'} 🎉`;
                resultDiv.classList.add('show');
                spinBtn.disabled = false;
                return;
            }
            const spinAngle = spinAngleStart - (spinTime / spinTimeTotal) * spinAngleStart;
            startAngle += (spinAngle * Math.PI / 180);
            drawRoulette();
            requestAnimationFrame(rotateRoulette);
        };

        spinBtn.addEventListener('click', () => {
            const options = Array.from(inputsDiv.children).map(input => input.value).filter(Boolean);
            if (options.length < 2) {
                showNotification('최소 2개 이상의 옵션을 입력하세요.', 'error');
                return;
            }
            spinBtn.disabled = true;
            resultDiv.classList.remove('show');
            resultDiv.textContent = '';
            spinAngleStart = Math.random() * 15 + 20; 
            spinTime = 0;
            spinTimeTotal = Math.random() * 1500 + 2000; 
            rotateRoulette();
        });

        plusBtn.addEventListener('click', () => {
            let count = parseInt(countSpan.textContent);
            if (count < 10) countSpan.textContent = ++count;
            updateRouletteInputs();
        });
        minusBtn.addEventListener('click', () => {
            let count = parseInt(countSpan.textContent);
            if (count > 2) countSpan.textContent = --count;
            updateRouletteInputs();
        });
        panelRouletteBtn.addEventListener('click', () => {
            sidePanel.classList.remove('open');
            menuBtn.classList.add('hidden');
            rouletteModal.style.display = 'flex';
            rouletteCanvas.width = 400;
            rouletteCanvas.height = 400;
            updateRouletteInputs();
        });
        rouletteCloseBtn.addEventListener('click', () => {
            rouletteModal.style.display = 'none';
            if (!panel.classList.contains('open')) {
               menuBtn.classList.remove('hidden');
            }
        });
    }

    // =================================================
    // 3. 패치노트 및 업데이트 기능 초기화
    // =================================================
    function initPatchNotesAndUpdate() {
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
            sidePanel.classList.remove('open');
            menuBtn.classList.add('hidden');
        };

        const closeModal = () => {
            patchNotesModal.style.display = 'none';
             if (!panel.classList.contains('open')) {
                menuBtn.classList.remove('hidden');
            }
        };

        panelPatchNotesBtn.addEventListener('click', openModal);
        patchNotesCloseBtn.addEventListener('click', closeModal);
        showPatchNotesLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
        
        // --- 업데이트 로직 ---
        let updateAvailableInfo = null;

        updateNowBtn.addEventListener('click', () => {
            if (updateNowBtn.dataset.action === 'install') {
                window.electronAPI.send('quit-and-install');
            } else {
                window.electronAPI.send('start-update');
                updateStatusText.textContent = '업데이트 다운로드를 시작합니다...';
                updateNowBtn.disabled = true;
            }
        });

        window.electronAPI.on('update-available', (info) => {
            updateAvailableInfo = info;
            updateNotificationBar.style.display = 'block';
            
            const badge = document.createElement('span');
            badge.className = 'update-badge';
            panelPatchNotesBtn.appendChild(badge);

            updateStatusText.textContent = `새로운 버전(v${info.version})을 설치할 수 있습니다.`;
            updateNowBtn.textContent = `v${info.version}으로 업데이트`;
            updateNowBtn.style.display = 'block';
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


    // =================================================
    // 4. 메인 로직 시작
    // =================================================
    
    initLadder();
    initRoulette();
    initBotSettings();
    initPatchNotesAndUpdate();

    let draggedInfo = null;
    
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');
    const menuBtn = document.getElementById('menu-btn');
    const sidePanel = document.getElementById('side-panel');
    const panelRosterBtn = document.getElementById('panel-roster-btn');

    if (window.electronAPI) {
        minimizeBtn.addEventListener('click', () => window.electronAPI.send('minimize-window'));
        maximizeBtn.addEventListener('click', () => window.electronAPI.send('maximize-window'));
        closeBtn.addEventListener('click', () => window.electronAPI.send('close-window'));
    }

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidePanel.classList.add('open');
        menuBtn.classList.add('hidden'); 
    });

    document.body.addEventListener('click', (e) => {
        const rosterPanel = document.getElementById('roster-panel');
        
        if (sidePanel.classList.contains('open') && !sidePanel.contains(e.target) && e.target !== menuBtn) {
            sidePanel.classList.remove('open');
             if (!rosterPanel.classList.contains('open')) {
                menuBtn.classList.remove('hidden');
            }
        }
        
        if (rosterPanel.classList.contains('open') && !rosterPanel.contains(e.target) && e.target !== panelRosterBtn && !panelRosterBtn.contains(e.target)) {
            rosterPanel.classList.remove('open');
             if (!sidePanel.classList.contains('open')) {
                menuBtn.classList.remove('hidden');
            }
        }
    });

    const gridSection = document.querySelector('.grid-section');
    const team1Slots = [], team2Slots = [];
    const positions = ["탑", "정글", "미드", "원딜", "서폿"];
    const positionColors = { "탑": "#c4443e", "정글": "#3a8d3b", "미드": "#4f80a8", "원딜": "#a88c4f", "서폿": "#8c4a9e" };

    positions.forEach((pos) => {
        const posLabel = document.createElement('div');
        posLabel.className = 'position-label';
        posLabel.textContent = pos;
        posLabel.style.backgroundColor = positionColors[pos];
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
            [team1Slot.textContent, team2Slot.textContent] = [team2Slot.textContent, team1Slot.textContent];
        });
        posLabel.addEventListener('click', () => [posLabel, team1Slot, swapButton, team2Slot].forEach(el => el.classList.toggle('highlight')));
    });
    
    const allGridSlots = [];
    for (let i = 0; i < 5; i++) {
        allGridSlots.push(team1Slots[i]);
        allGridSlots.push(team2Slots[i]);
    }
    
    const panel = document.getElementById('roster-panel');
    const rosterList = document.getElementById('roster-list');
    const fetchButton = document.getElementById('fetch-users-btn');
    const rosterCloseBtn = document.getElementById('roster-close-btn');
    const returnAllToRosterBtn = document.getElementById('return-all-to-roster-btn');
    let allRosterSlots = [];

    const addPlayerToRoster = (name) => {
        if (!name) return;
        const emptySlot = allRosterSlots.find(s => !s.textContent);
        if (emptySlot) {
            emptySlot.textContent = name;
        } else {
            const newSlot = createRosterSlot(name);
            rosterList.appendChild(newSlot);
            allRosterSlots.push(newSlot);
        }
    };

    const createRosterSlot = (name = '') => {
        const slot = document.createElement('div');
        slot.className = 'roster-slot';
        slot.textContent = name;
        slot.setAttribute('draggable', true);
        slot.addEventListener('dragstart', (e) => {
            if (!e.target.textContent) { e.preventDefault(); return; }
            draggedInfo = { element: e.target, name: e.target.textContent, origin: 'roster' };
            setTimeout(() => e.target.classList.add('dragging'), 0);
        });
        slot.addEventListener('dragend', () => {
            if (draggedInfo) draggedInfo.element.classList.remove('dragging');
            draggedInfo = null;
        });
        return slot;
    };

    const updateRosterList = (users = []) => {
        rosterList.innerHTML = '';
        allRosterSlots = [];
        const namesInGrid = allGridSlots.map(s => s.textContent).filter(Boolean);
        const filteredUsers = users.filter(user => !namesInGrid.includes(user.name));
        const totalSlots = Math.max(20, filteredUsers.length);
        for (let i = 0; i < totalSlots; i++) {
            const name = filteredUsers[i] ? filteredUsers[i].name : '';
            const slot = createRosterSlot(name);
            rosterList.appendChild(slot);
            allRosterSlots.push(slot);
        }
    };
    updateRosterList();

    allGridSlots.forEach(slot => {
        slot.setAttribute('draggable', true);
        slot.addEventListener('dragstart', (e) => {
            if (slot.classList.contains('locked') || !slot.textContent) { e.preventDefault(); return; }
            draggedInfo = { element: e.target, name: e.target.textContent, origin: 'grid' };
            setTimeout(() => e.target.classList.add('dragging'), 0);
        });
        slot.addEventListener('dragend', () => {
            if (draggedInfo) draggedInfo.element.classList.remove('dragging');
            draggedInfo = null;
        });
        slot.addEventListener('dragover', (e) => e.preventDefault());
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedInfo || e.currentTarget.classList.contains('locked')) return;
            const from = draggedInfo;
            const to = e.currentTarget;
            if (from.element === to) return;
            const toName = to.textContent;
            to.textContent = from.name;
            if (from.origin === 'grid') { from.element.textContent = toName; }
            else if (from.origin === 'roster') { from.element.textContent = ''; addPlayerToRoster(toName); }
            to.classList.add('flash');
            to.addEventListener('animationend', () => to.classList.remove('flash'), { once: true });
        });
    });

    rosterList.addEventListener('dragover', (e) => e.preventDefault());
    rosterList.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedInfo?.origin === 'grid') {
            addPlayerToRoster(draggedInfo.name);
            draggedInfo.element.textContent = '';
        }
    });

    panelRosterBtn.addEventListener('click', () => {
        sidePanel.classList.remove('open');
        panel.classList.toggle('open');
        menuBtn.classList.remove('hidden');
    });
    rosterCloseBtn.addEventListener('click', () => {
        panel.classList.remove('open');
        if (!sidePanel.classList.contains('open')) {
            menuBtn.classList.remove('hidden');
        }
    });

    returnAllToRosterBtn.addEventListener('click', () => {
        const playersMoved = [];
        allGridSlots.forEach(slot => {
            if (slot.textContent) {
                playersMoved.push(slot.textContent);
                addPlayerToRoster(slot.textContent);
                slot.textContent = '';
            }
        });
        if (playersMoved.length > 0) {
            showNotification(`${playersMoved.length}명의 인원이 목록으로 이동되었습니다.`);
        } else {
            showNotification('팀 슬롯에 인원이 없습니다.', 'error');
        }
    });

    const nameInput = document.getElementById('name-input');
    const addButton = document.getElementById('add-button');
    const resetButton = document.getElementById('reset-button');
    const shuffleAllButton = document.getElementById('shuffle-all-button');
    const shufflePosButton = document.getElementById('shuffle-pos-button');
    const teamSwapButton = document.getElementById('team-swap-button');
    const copyButton = document.getElementById('copy-button');
    const submitTeamsBtn = document.getElementById('submit-teams-btn');

    const addName = () => {
        const name = nameInput.value.trim();
        if (!name) return;
        const allNames = [...allGridSlots, ...allRosterSlots].map(s => s.textContent).filter(Boolean);
        if (allNames.includes(name)) {
            showNotification(`'${name}'은/는 이미 존재합니다.`, 'error');
        } else {
            let emptySlot = null;
            for (let i = 0; i < 5; i++) {
                if (!team1Slots[i].textContent) {
                    emptySlot = team1Slots[i];
                    break;
                }
                if (!team2Slots[i].textContent) {
                    emptySlot = team2Slots[i];
                    break;
                }
            }

            if (emptySlot) {
                emptySlot.textContent = name;
                emptySlot.classList.add('pop-in');
                emptySlot.addEventListener('animationend', () => emptySlot.classList.remove('pop-in'), { once: true });
            } else {
                showNotification('모든 팀 슬롯이 채워져 있습니다.', 'error'); return;
            }
        }
        nameInput.value = ''; nameInput.focus();
    };
    addButton.addEventListener('click', addName);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addName(); });
    resetButton.addEventListener('click', () => {
        allGridSlots.forEach(slot => { slot.textContent = ''; slot.classList.remove('locked'); });
        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
        showNotification('모든 슬롯이 초기화되었습니다.');
        nameInput.focus();
    });

    shuffleAllButton.addEventListener('click', async () => {
        const unlockedSlots = allGridSlots.filter(slot => !slot.classList.contains('locked') && slot.textContent);
        if (unlockedSlots.length < 2) return;

        const names = unlockedSlots.map(slot => slot.textContent).sort(() => Math.random() - 0.5);
        const finalAssignments = new Map();
        unlockedSlots.forEach((slot, index) => finalAssignments.set(slot, names[index]));

        unlockedSlots.forEach(slot => slot.style.opacity = '0');
        await new Promise(resolve => setTimeout(resolve, 200));

        for (const slot of unlockedSlots) {
            slot.textContent = finalAssignments.get(slot);
            slot.style.opacity = '1';
            slot.classList.add('pop-in');
            slot.addEventListener('animationend', () => slot.classList.remove('pop-in'), { once: true });
            await new Promise(resolve => setTimeout(resolve, 80));
        }
    });

    shufflePosButton.addEventListener('click', () => {
        positions.forEach((pos, i) => {
            const slot1 = team1Slots[i];
            const slot2 = team2Slots[i];
            if (!slot1.classList.contains('locked') && !slot2.classList.contains('locked') && slot1.textContent && slot2.textContent && Math.random() > 0.5) {
                [slot1.textContent, slot2.textContent] = [slot2.textContent, slot1.textContent];
                [slot1, slot2].forEach(s => {
                    s.classList.add('flash');
                    s.addEventListener('animationend', () => s.classList.remove('flash'), { once: true });
                });
            }
        });
    });

    teamSwapButton.addEventListener('click', () => {
        positions.forEach((pos, i) => {
            const slot1 = team1Slots[i];
            const slot2 = team2Slots[i];
            if (!slot1.classList.contains('locked') && !slot2.classList.contains('locked')) {
                [slot1.textContent, slot2.textContent] = [slot2.textContent, slot1.textContent];
            }
        });
        showNotification('1팀과 2팀의 모든 라인을 스왑했습니다.');
    });
    copyButton.addEventListener('click', async () => {
        let text = "1팀\t2팀\n";
        positions.forEach((pos, i) => { text += `${team1Slots[i].textContent || "-"} : ${team2Slots[i].textContent || "-"}\n`; });
        try {
            if (window.electronAPI) {
                await window.electronAPI.invoke('write-clipboard', text);
                showNotification('팀 구성이 클립보드에 복사되었습니다.');
            }
        } catch (err) { showNotification('클립보드 복사에 실패했습니다.', 'error'); }
    });
    fetchButton.addEventListener('click', () => {
        const currentServer = getCurrentServer();
        if (!currentServer?.lobby?.id) { showNotification('봇 설정을 통해 서버를 먼저 선택해주세요.', 'error'); return; }
        if (window.electronAPI) {
            window.electronAPI.send('fetch-discord-users', currentServer.lobby.id);
            fetchButton.textContent = '불러오는 중...'; fetchButton.disabled = true;
        }
    });

    submitTeamsBtn.addEventListener('click', () => {
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
        if (window.electronAPI) {
            const payload = { 
                guildId: currentServer.guild.id, 
                team1, 
                team2 
            };
            window.electronAPI.send('submit-teams-discord', payload);
        }
    });

    if (window.electronAPI) {
        window.electronAPI.on('users-fetched-success', (users) => {
            updateRosterList(users);
            fetchButton.textContent = '불러오기'; fetchButton.disabled = false;
        });
        window.electronAPI.on('users-fetched-error', (error) => {
            showNotification(`유저 목록 로딩 실패: ${error}`, 'error');
            fetchButton.textContent = '불러오기'; fetchButton.disabled = false;
        });
        window.electronAPI.on('submit-teams-success', (result) => {
            showNotification(result.message || '팀 정보가 봇으로 전송되었습니다.');
        });
        window.electronAPI.on('submit-teams-error', (error) => {
            showNotification(`팀 정보 전송 실패: ${error}`, 'error');
        });
    }

    allGridSlots.forEach(slot => {
        let clickTimer = null;
        slot.addEventListener('click', () => { clickTimer = setTimeout(() => { if (slot.textContent) slot.classList.toggle('locked'); }, 200); });
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
                const newName = input.value;
                const trimmedNewName = newName.trim();

                if (trimmedNewName === '') {
                    slot.textContent = '';
                    input.remove();
                    return;
                }

                const allNames = [...allGridSlots, ...allRosterSlots].map(s => s.textContent);
                const isDuplicate = trimmedNewName && allNames.includes(trimmedNewName) && trimmedNewName !== originalName;
                
                if (isDuplicate) {
                    slot.textContent = originalName;
                    showNotification(`'${trimmedNewName}'은/는 이미 존재합니다.`, 'error');
                } else {
                    slot.textContent = trimmedNewName;
                }
                input.remove();
            };
            input.addEventListener('blur', saveName);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur();
                else if (e.key === 'Escape') {
                    slot.textContent = originalName;
                    input.remove();
                }
            });
        });
    });

    // 앱 시작 시 버전 정보 가져와서 표시하기
    (async () => {
        const appVersion = await window.electronAPI.invoke('get-app-version');
        const versionDisplay = document.getElementById('app-version-display');
        if (versionDisplay) {
            versionDisplay.textContent = `Version ${appVersion}`;
        }
    })();
});

