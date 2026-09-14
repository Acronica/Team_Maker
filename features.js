/**
 * 기능 On/Off 스위치
 *
 * 디스코드 봇 서버나 롤 클라이언트가 없어도 팀 구성 · 랜덤 · VS 코인 플립 ·
 * 드래그 앤 드롭 · 사다리 타기 · 돌림판 · 클립보드 복사 등 기본 기능은
 * 그대로 동작합니다. 연동이 필요해지면 .env 에서 아래 값을 true 로 바꾸세요.
 *
 * 이 파일은 main 프로세스에서만 require 되며, 결과값은 preload 를 통해
 * 렌더러로 전달됩니다. (단일 소스)
 *
 * Riot API 키 여부는 설정 파일에서도 읽어야 하므로 main.js 에서 판정해
 * riotApi 값으로 함께 전달합니다.
 */
const isOn = (value) => /^(1|true|on|yes)$/i.test(String(value ?? '').trim());

module.exports = {
    // 디스코드 봇 연동: 인원 불러오기 / 팀 입력 / 채널 설정
    // 스위치가 켜져 있어도 서버 주소·키가 없으면 자동으로 비활성화됩니다.
    discord: isOn(process.env.ENABLE_DISCORD) && Boolean(process.env.API_BASE_URL && process.env.API_KEY),

    // 롤 클라이언트(LCU) 연동: 연결 상태 표시 / 파티 초대
    lcu: isOn(process.env.ENABLE_LCU),
};
