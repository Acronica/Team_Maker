// src/components/modals/rouletteModal.js
import { showNotification } from '../../utils.js';
import { ROULETTE_COLORS } from '../../config.js';

export function initRouletteModal() {
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
    const menuBtn = document.getElementById('menu-btn');

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
        spinTimeTotal = (Math.random() * 3000 + 4000);
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
        if (!sidePanel.classList.contains('open') && !document.getElementById('roster-panel').classList.contains('open')) {
            menuBtn.classList.remove('hidden');
        }
    });
}

