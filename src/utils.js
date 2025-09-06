/**
 * 화면 중앙에 알림 메시지를 표시하는 함수
 * @param {string} message - 표시할 메시지
 * @param {'info' | 'error'} type - 알림 종류 ('info' 또는 'error')
 */
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    Object.assign(notification.style, {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        padding: '12px 25px', borderRadius: '5px', color: '#f0e6d2',
        backgroundColor: type === 'error' ? 'rgba(200, 60, 60, 0.9)' : 'rgba(20, 120, 80, 0.9)',
        border: '1px solid #785a28', zIndex: '1000', opacity: '0',
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

/**
 * 텍스트 길이에 따라 슬롯의 스타일을 조정하고 텍스트를 설정합니다.
 * @param {HTMLElement} slot - 텍스트를 설정할 슬롯 요소
 * @param {string} text - 설정할 텍스트
 */
export function setSlotText(slot, text) {
    if (!slot) return;
    const newText = text || '';
    slot.textContent = newText;
    
    // 텍스트 길이에 따라 클래스를 동적으로 추가/제거하여 CSS에서 스타일을 제어
    if (newText.length > 12) { 
        slot.classList.add('text-overflow');
    } else {
        slot.classList.remove('text-overflow');
    }
}

