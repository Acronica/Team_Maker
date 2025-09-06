// Component Initializers
import { initTitleBar } from './components/titleBar.js';
import { initSidePanel } from './components/sidePanel.js';
import { initMainGrid } from './components/mainGrid.js';
import { initRosterPanel } from './components/rosterPanel.js';
import { initBotSettingsModal } from './components/modals/botSettingsModal.js';
import { initPlayerInfoModal } from './components/modals/playerInfoModal.js';
import { initLadderModal } from './components/modals/ladderModal.js';
import { initRouletteModal } from './components/modals/rouletteModal.js';
import { initPatchNotesModal } from './components/modals/patchNotesModal.js';

// Services
import { ipcRenderer } from './services/ipcService.js';
import { loadInitialData } from './services/settingsService.js';
import { initializeLcuApi } from './services/lcuService.js';

// DOM이 완전히 로드된 후 스크립트를 실행합니다.
window.addEventListener('DOMContentLoaded', async () => {
    // 각 모듈 초기화 함수를 안전하게 호출하기 위한 래퍼 함수
    const safelyInitialize = (name, initFunction) => {
        try {
            initFunction();
            console.log(`✅ ${name} initialized successfully.`);
        } catch (error) {
            console.error(`❌ Failed to initialize ${name}:`, error);
        }
    };

    console.log("🚀 Initializing application modules...");

    // 1. 기본 UI 컴포넌트 초기화
    safelyInitialize('Title Bar', initTitleBar);
    safelyInitialize('Side Panel', initSidePanel); // 사이드 패널 초기화 추가
    safelyInitialize('Roster Panel', initRosterPanel);
    safelyInitialize('Main Grid', initMainGrid);

    // 2. 모든 모달 창 초기화
    safelyInitialize('Bot Settings Modal', initBotSettingsModal);
    safelyInitialize('Player Info Modal', initPlayerInfoModal);
    safelyInitialize('Ladder Modal', initLadderModal);
    safelyInitialize('Roulette Modal', initRouletteModal);
    safelyInitialize('Patch Notes Modal', initPatchNotesModal);
    
    // 3. 백그라운드 서비스 및 데이터 로딩
    try {
        await loadInitialData();
        console.log('✅ Initial data loaded.');
        initializeLcuApi();
        console.log('✅ LCU API service started.');
        ipcRenderer.invoke('check-for-updates');
        console.log('✅ Update check requested.');
    } catch (error) {
        console.error('❌ Failed during initial data loading or service startup:', error);
    }
    
    console.log("🎉 Application initialization complete.");
});

