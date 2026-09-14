/**
 * 창 크기에 맞춰 보드 전체 배율을 조절합니다.
 *
 * 보드는 1100px 기준으로 설계되어 있어서 창을 최대화해도 가운데에 그대로
 * 남아 있었습니다. 창의 가로·세로 여유 공간을 재서 그 중 작은 쪽에 맞춰
 * 배율을 정하므로 비율이 깨지지 않습니다.
 *
 * transform: scale() 대신 zoom 을 쓰는 이유는, 슬롯 뒤집기 애니메이션이
 * perspective 와 preserve-3d 를 사용하고 있어 조상 요소의 transform 이
 * 3D 렌더링 맥락을 끊어버리기 때문입니다. zoom 은 레이아웃 자체를 확대해
 * 드래그 앤 드롭의 좌표 계산도 그대로 맞습니다.
 */

const CONTAINER_MARGIN = 40; // .container 의 margin 20px * 2
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

export function initResponsiveScale() {
    const container = document.querySelector('.container');
    const main = document.querySelector('.main-content');
    if (!container || !main) return;

    let frame = null;

    const apply = () => {
        frame = null;

        // 기준 크기를 재려면 배율을 먼저 되돌려야 합니다.
        container.style.zoom = '1';
        const naturalWidth = container.offsetWidth;
        const naturalHeight = container.offsetHeight;
        if (!naturalWidth || !naturalHeight) return;

        const styles = getComputedStyle(main);
        const availableWidth = main.clientWidth
            - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight) - CONTAINER_MARGIN;
        const availableHeight = main.clientHeight
            - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom) - CONTAINER_MARGIN;

        const scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);
        container.style.zoom = String(Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)));
    };

    // 리사이즈 중에는 이벤트가 연달아 들어오므로 프레임당 한 번만 계산합니다.
    const schedule = () => {
        if (frame === null) frame = requestAnimationFrame(apply);
    };

    window.addEventListener('resize', schedule);

    // 업데이트 알림 바가 나타나거나 사라지면 본문 높이가 달라집니다.
    const notificationBar = document.getElementById('update-notification-bar');
    if (notificationBar && window.ResizeObserver) {
        new ResizeObserver(schedule).observe(notificationBar);
    }

    // 웹폰트가 늦게 로드되면 기준 크기가 달라질 수 있습니다.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(schedule).catch(() => {});
    }

    apply();
}
