/**
 * 메인 스크립트
 * 공통 기능 및 초기화 로직
 */

// DOM 로드 후 공통 초기화 함수 실행
document.addEventListener('DOMContentLoaded', function() {
    // 공통 초기화 함수 호출
    initCommon();
});

/**
 * 공통 초기화 함수
 */
function initCommon() {
    // 콘솔에 초기화 메시지 표시
    console.log('데이터 관리 웹 뷰 초기화 완료');
    
    // 현재 경로에 따라 활성 메뉴 표시
    highlightActiveMenu();
    
    // 모바일 메뉴 처리
    setupMobileMenu();
}

/**
 * 현재 경로에 따라 네비게이션 메뉴 활성화
 */
function highlightActiveMenu() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const menuLinks = document.querySelectorAll('nav ul li a');
    
    menuLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        if (href === currentPath) {
            link.classList.add('active');
        } else if (currentPath === '' && href === 'index.html') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * 모바일 메뉴 설정
 */
function setupMobileMenu() {
    // 모바일 환경에서 필요한 메뉴 처리 로직
    // 필요 시 구현
}

/**
 * 날짜를 읽기 쉬운 형식으로 포맷팅
 * @param {string} dateString - ISO 형식 날짜 문자열
 * @returns {string} - 포맷팅된 날짜 문자열
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    
    // 유효하지 않은 날짜일 경우 원본 반환
    if (isNaN(date.getTime())) {
        return dateString;
    }
    
    // 로케일에 맞게 날짜 형식화
    return date.toLocaleDateString();
}

/**
 * 에러 메시지 표시
 * @param {string} message - 표시할 에러 메시지
 * @param {Element} [container] - 메시지를 표시할 컨테이너 (없으면 alert 사용)
 */
function showError(message, container) {
    if (container) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        // 기존 에러 메시지 제거
        const existingError = container.querySelector('.error-message');
        if (existingError) {
            container.removeChild(existingError);
        }
        
        container.appendChild(errorElement);
        
        // 5초 후 메시지 자동 제거
        setTimeout(() => {
            if (errorElement.parentNode === container) {
                container.removeChild(errorElement);
            }
        }, 5000);
    } else {
        // 컨테이너가 없으면 alert 사용
        alert(message);
    }
}

/**
 * 성공 메시지 표시
 * @param {string} message - 표시할 성공 메시지
 * @param {Element} [container] - 메시지를 표시할 컨테이너 (없으면 alert 사용)
 */
function showSuccess(message, container) {
    if (container) {
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = message;
        
        // 기존 성공 메시지 제거
        const existingSuccess = container.querySelector('.success-message');
        if (existingSuccess) {
            container.removeChild(existingSuccess);
        }
        
        container.appendChild(successElement);
        
        // 3초 후 메시지 자동 제거
        setTimeout(() => {
            if (successElement.parentNode === container) {
                container.removeChild(successElement);
            }
        }, 3000);
    } else {
        // 컨테이너가 없으면 alert 사용
        alert(message);
    }
} 