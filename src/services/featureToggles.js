import { FEATURES } from '../config.js';

/**
 * 꺼져 있는 연동 기능의 UI를 화면에서 감춥니다.
 * 비활성화된 버튼을 남겨두면 눌렀을 때 에러만 보게 되므로 아예 숨깁니다.
 */

// 디스코드 봇 서버가 있어야 동작하는 요소
const DISCORD_ELEMENT_IDS = [
    'fetch-users-btn',        // 인원 목록 > 불러오기
    'submit-teams-btn',       // 팀 입력
    'panel-bot-settings-btn', // 메뉴 > 채널 설정
];

// 롤 클라이언트(LCU)가 있어야 동작하는 요소
const LCU_ELEMENT_IDS = [
    'lcu-invite-btn',       // 초대
    'lcu-status-indicator', // 타이틀바 연결 상태 표시등
];

const hide = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
};

export function applyFeatureToggles() {
    if (!FEATURES.discord) DISCORD_ELEMENT_IDS.forEach(hide);
    if (!FEATURES.lcu) LCU_ELEMENT_IDS.forEach(hide);

    if (!FEATURES.riotApi) {
        // 검증 없이 입력한 그대로 저장되므로 입력란에 미리 알려줍니다.
        const lolIdInput = document.getElementById('user-lol-id-input');
        if (lolIdInput) lolIdInput.placeholder = 'Riot ID (이름#태그) · 검증 안 함';
    }

    console.log(`🔌 Features: discord=${FEATURES.discord}, lcu=${FEATURES.lcu}, riotApi=${FEATURES.riotApi}`);
}
