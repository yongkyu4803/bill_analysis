/**
 * 데이터 저장소 관리 모듈
 * 로컬 스토리지를 사용하여 페이지 데이터 관리
 */

// 스토리지 키 상수
const STORAGE_KEY = 'page_data';

/**
 * 새 페이지 데이터 객체 생성
 * @param {string} title - 페이지 제목
 * @param {string} content - 페이지 내용
 * @param {string} author - 작성자
 * @returns {Object} - 생성된 페이지 데이터 객체
 */
function createPageData(title, content, author) {
    const now = new Date().toISOString();
    return {
        id: 'page-' + Date.now(),
        title: title,
        content: content,
        metadata: {
            author: author,
            createDate: now,
            updateDate: now
        },
        customFields: {}
    };
}

/**
 * 페이지 데이터 저장
 * @param {Object} data - 저장할 페이지 데이터
 */
function savePageData(data) {
    const pages = getAllPages();
    pages.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

/**
 * 모든 페이지 데이터 가져오기
 * @returns {Array} - 모든 페이지 데이터 배열
 */
function getAllPages() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

/**
 * ID로 특정 페이지 데이터 가져오기
 * @param {string} id - 찾을 페이지 ID
 * @returns {Object|null} - 찾은 페이지 데이터 또는 없을 경우 null
 */
function getPageById(id) {
    const pages = getAllPages();
    return pages.find(page => page.id === id) || null;
}

/**
 * 페이지 데이터 업데이트
 * @param {string} id - 업데이트할 페이지 ID
 * @param {Object} newData - 새로운 데이터
 * @returns {boolean} - 업데이트 성공 여부
 */
function updatePage(id, newData) {
    const pages = getAllPages();
    const index = pages.findIndex(page => page.id === id);
    
    if (index !== -1) {
        // 메타데이터 업데이트
        const updatedPage = {
            ...pages[index],
            ...newData,
            metadata: {
                ...pages[index].metadata,
                updateDate: new Date().toISOString()
            }
        };
        
        pages[index] = updatedPage;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
        return true;
    }
    
    return false;
}

/**
 * 페이지 삭제
 * @param {string} id - 삭제할 페이지 ID
 * @returns {boolean} - 삭제 성공 여부
 */
function deletePage(id) {
    const pages = getAllPages();
    const filteredPages = pages.filter(page => page.id !== id);
    
    if (filteredPages.length !== pages.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredPages));
        return true;
    }
    
    return false;
}

/**
 * 모든, 페이지 데이터 삭제
 */
function clearAllPages() {
    localStorage.removeItem(STORAGE_KEY);
} 