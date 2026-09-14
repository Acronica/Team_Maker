# 변경 내역

이 문서는 저장소에서 발견된 문제와 그 수정 내역을 기록합니다.
사용자에게 보여지는 버전별 패치 노트는 [`patch-notes.js`](patch-notes.js) 에 있습니다.

## [Unreleased]

### 저장소 소스를 v1.4.7 로 복원

저장소 소스가 v1.4.5 에 멈춰 있는 동안 v1.4.6 / v1.4.7 이 릴리스되어,
GitHub Releases 의 배포본과 저장소 내용이 두 버전만큼 어긋나 있었습니다.
원본 소스가 유실되어 배포된 `TeamMaker-Setup-1.4.7.exe` 의 `app.asar` 에서
소스를 추출해 복원했습니다. 추출된 파일은 번들링·난독화가 되어 있지 않아
원본과 동일합니다.

복원으로 되살아난 내용:

-   **v1.4.6** — 라인별 스왑 버튼을 없애고 미드 중앙에 VS 코인 플립 버튼 추가,
    팀 변경 시 3D 카드 뒤집기 애니메이션, 팀 이름표 진영 색상 빛 효과
-   **v1.4.7** — Riot API 키 인식 오류 수정 (설정 파일에서 키를 읽도록 변경)

`package.json` 은 asar 에 포함된 것이 패키징 과정에서 `scripts` / `devDependencies` /
`build` 가 제거된 형태이므로 저장소 것을 유지하고 `version` 만 올렸습니다.
`dependencies` 는 배포본과 동일함을 확인했습니다.

### 수정된 문제

#### 1. 디스코드 봇이 실행 불가능한 상태

-   `bot/index.js` 가 `bot/events/` 디렉터리를 `readdirSync` 하는데 해당 폴더가 없었습니다.
-   `bot/index.js` 가 `require('./events/interactionCreate.js')` 를 호출하는데
    실제 파일은 `bot/interactionCreate.js` 에 있었습니다.
-   봇이 사용하는 `discord.js`, `express`, `cors` 가 `package.json` 과
    `package-lock.json` 어디에도 선언되어 있지 않았습니다.

v1.4.7 까지도 그대로 남아 있던 문제입니다.

→ `bot/interactionCreate.js` 를 `bot/events/` 아래로 옮기고, 봇 전용
`bot/package.json` 을 추가해 의존성을 선언했습니다. 봇은 데스크톱 앱과 별도로
동작하는 서버이므로 의존성을 루트에 합치지 않고 분리했습니다.

#### 2. 봇 서버 주소와 API 키가 소스에 하드코딩

```js
const API_BASE_URL = 'http://34.158.219.243:3000/api';
const API_KEY = '3810';
```

공개 저장소에 봇 서버 IP 와 인증 키가 그대로 커밋되어 있었습니다. 봇 서버는
이 키 하나로 모든 API 를 인증하므로(`apiKeyAuth`), 저장소를 본 사람은 누구나
채널 멤버 조회와 팀 전송 API 를 호출할 수 있는 상태였습니다.

→ 두 값을 `.env` 로 옮기고 `.env.example` 을 추가했습니다.

> **주의**: 이 키는 커밋 히스토리에 남아 있습니다. 소스에서 제거한 것만으로는
> 노출이 사라지지 않으므로 **봇 서버 쪽 `API_KEY` 를 새 값으로 교체해야 합니다.**
> 통신이 `http://` 평문이라 키가 네트워크 구간에서도 노출되는 점은 별도 과제입니다.

### 추가된 것

#### 연동 기능 On/Off 스위치

디스코드 봇 서버나 롤 클라이언트 없이도 앱이 온전히 동작하도록 기능 스위치를
넣었습니다. 판정은 [`features.js`](features.js) 한 곳에서 이루어지고, main
프로세스가 `preload.js` 를 통해 렌더러로 전달합니다.

| 스위치 | 기본값 | 꺼지면 |
| --- | --- | --- |
| `ENABLE_DISCORD` | `false` | 불러오기 · 팀 입력 · 채널 설정 버튼을 숨김 |
| `ENABLE_LCU` | `false` | 초대 버튼과 연결 상태 표시등을 숨기고, LCU 폴링을 하지 않음 |
| `RIOT_API_KEY` | 없음 | 소환사명 검증을 건너뛰고 형식만 확인해 저장 |

비활성화된 버튼을 남겨두면 눌렀을 때 에러만 보게 되므로 화면에서 아예 숨깁니다.
`.env` 파일이 아예 없어도 기본값(전부 꺼짐)으로 실행됩니다.

Riot API 키는 `.env` 뿐 아니라 앱 설정 파일(`settings.json`) 에 저장된 값도
인식합니다. v1.4.7 에서 도입된 방식을 그대로 따릅니다.

#### portable 실행 파일과 아이콘

설치 없이 더블클릭으로 실행되는 단일 exe 를 NSIS 설치본과 함께 빌드합니다.

-   `TeamMaker-x.x.x-portable.exe` — 설치 불필요
-   `TeamMaker-Setup-x.x.x.exe` — 설치 프로그램 (자동 업데이트 지원)

아이콘 파일이 없어 기본 Electron 아이콘이 박히던 것을 `build/icon.ico` 로
대체했습니다. 포터블 실행 파일은 설치 경로가 없어 업데이트를 덮어쓸 수 없으므로
`PORTABLE_EXECUTABLE_DIR` 환경 변수로 감지해 업데이트 확인을 건너뜁니다.

패키징 시 `.env` 와 `bot/` 은 산출물에서 제외됩니다.

### 그 밖의 변경

-   `dotenv` 가 `cwd` 가 아니라 `__dirname` 기준으로 `.env` 를 읽도록 수정했습니다.
-   `.action-section` 과 `.roster-panel-header` 를 grid 에서 flex 로 바꿨습니다.
    버튼이 숨겨져도 남은 버튼이 가로 폭을 나눠 갖습니다.
-   `lcuService` 의 상태 표시등 조작에 null 가드를 추가했습니다.
-   `.gitignore` 에 중첩 `node_modules/` 를 추가했습니다.

### 알려진 제한

-   설치본/포터블 실행 파일에는 `.env` 가 포함되지 않으므로 디스코드·LCU 연동은
    항상 꺼진 상태로 동작합니다. 연동이 필요하면 소스에서 `npm start` 로 실행하세요.
-   Riot 개발자 API 키는 24시간마다 만료됩니다. 지속적으로 쓰려면 Riot 개발자
    포털에서 Personal API Key 를 신청해야 합니다.
-   `get-api-key` / `save-api-key` IPC 는 구현되어 있으나 이를 호출하는 UI 가
    아직 없습니다. 현재는 `settings.json` 을 직접 편집해야 합니다.
