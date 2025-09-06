// src/components/modals/ladderModal.js
import { LADDER_COLORS } from '../../config.js';

export function initLadderModal() {
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
    const menuBtn = document.getElementById('menu-btn');

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
        if (!sidePanel.classList.contains('open') && !document.getElementById('roster-panel').classList.contains('open')) {
            menuBtn.classList.remove('hidden');
        }
    });

    ladderResultCloseBtn.addEventListener('click', () => {
        ladderResultModal.style.display = 'none';
    });
}

