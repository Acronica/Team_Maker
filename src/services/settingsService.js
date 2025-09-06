import { showNotification } from "../utils.js";

// 로컬 스토리지 키 정의
const CURRENT_SERVER_KEY = 'currentServer';
const SAVED_SERVERS_KEY = 'savedServers';

// 현재 선택된 서버 설정을 가져오는 함수
export const getCurrentServer = () => {
    try {
        return JSON.parse(localStorage.getItem(CURRENT_SERVER_KEY));
    } catch (e) {
        localStorage.removeItem(CURRENT_SERVER_KEY); 
        return null;
    }
};

// 현재 선택된 서버 설정을 저장하는 함수
export const setCurrentServer = (server) => {
    localStorage.setItem(CURRENT_SERVER_KEY, JSON.stringify(server));
};

// 저장된 모든 서버 목록을 가져오는 함수
export const getSavedServers = () => {
    try {
        const servers = JSON.parse(localStorage.getItem(SAVED_SERVERS_KEY)) || [];
        if (Array.isArray(servers)) {
            return servers.filter(s => s && typeof s === 'object' && s.id && s.name);
        }
        localStorage.removeItem(SAVED_SERVERS_KEY);
        return [];
    } catch (e) {
        console.error("손상된 서버 목록 데이터를 정리합니다:", e);
        localStorage.removeItem(SAVED_SERVERS_KEY);
        return [];
    }
};

// 서버 목록 전체를 저장하는 함수
export const setSavedServers = (servers) => {
    localStorage.setItem(SAVED_SERVERS_KEY, JSON.stringify(servers));
};

// 앱 시작 시 초기 사용자 데이터를 로드하는 함수
export async function loadInitialData() {
    try {
        const userData = await window.electronAPI.invoke('load-user-data');
        return userData;
    } catch (error) {
        showNotification('사용자 데이터를 불러오는 데 실패했습니다.', 'error');
        console.error('Failed to load user data:', error);
        return {};
    }
}

