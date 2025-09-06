/**
 * Electron의 IPC 통신을 쉽게 사용할 수 있도록 래핑한 모듈입니다.
 * preload.js를 통해 노출된 window.electronAPI를 사용합니다.
 * 이 모듈을 사용하면 모든 파일에서 일관된 방식으로 Main 프로세스와 통신할 수 있습니다.
 */
export const ipcRenderer = {
  /**
   * Main 프로세스로 데이터를 보내는 단방향 통신
   * @param {string} channel - IPC 채널 이름
   * @param {any} data - 전송할 데이터
   */
  send: (channel, data) => {
    window.electronAPI.send(channel, data);
  },

  /**
   * Main 프로세스로 데이터를 보내고 응답을 받는 양방향 통신
   * @param {string} channel - IPC 채널 이름
   * @param {any} data - 전송할 데이터
   * @returns {Promise<any>} Main 프로세스로부터의 응답
   */
  invoke: (channel, data) => {
    return window.electronAPI.invoke(channel, data);
  },

  /**
   * Main 프로세스로부터 오는 이벤트를 수신 대기
   * @param {string} channel - IPC 채널 이름
   * @param {(...args: any[]) => void} callback - 이벤트 수신 시 실행될 콜백 함수
   */
  on: (channel, callback) => {
    window.electronAPI.on(channel, callback);
  }
};

