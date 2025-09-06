/**
 * 드래그 앤 드롭 상태를 관리하는 중앙 관리자 객체
 */
export const dragManager = {
    draggedItem: null, // { element: HTMLElement, name: string, origin: 'grid' | 'roster' }

    /**
     * 드래그 시작 시 호출됩니다.
     * @param {DragEvent} e - 드래그 이벤트 객체
     * @param {string} name - 드래그하는 아이템의 이름
     * @param {'grid' | 'roster'} origin - 드래그 시작 위치
     */
    start(e, name, origin) {
        if (!name) {
            e.preventDefault();
            return;
        }
        this.draggedItem = { element: e.target, name, origin };
        // 드래그 중인 요소에 시각적 효과를 주기 위해 클래스 추가
        setTimeout(() => e.target.classList.add('dragging'), 0);
    },

    /**
     * 드래그 종료 시 호출됩니다.
     */
    end() {
        if (this.draggedItem && this.draggedItem.element) {
            this.draggedItem.element.classList.remove('dragging');
        }
        this.draggedItem = null;
    }
};

