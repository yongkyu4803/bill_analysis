/**
 * 폼 처리 관련 모듈
 * 데이터 입력, 수정 폼 처리 기능 제공
 */

// 현재 페이지 URL 확인
const currentPage = window.location.pathname.split('/').pop();

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    if (currentPage === 'index.html' || currentPage === '') {
        initMainForm();
    } else if (currentPage === 'edit.html') {
        initEditForm();
    }
});

/**
 * 메인 페이지 폼 초기화
 */
function initMainForm() {
    const dataForm = document.getElementById('dataForm');
    if (!dataForm) return;
    
    // 폼 제출 이벤트 처리
    dataForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 폼 데이터 가져오기
        const title = document.getElementById('title').value.trim();
        const author = document.getElementById('author').value.trim();
        const content = document.getElementById('content').value.trim();
        
        // 유효성 검증
        if (!title || !author || !content) {
            alert('모든 필드를 입력해주세요.');
            return;
        }
        
        // 데이터 생성 및 저장
        const pageData = createPageData(title, content, author);
        savePageData(pageData);
        
        // 폼 초기화 및 페이지 목록 업데이트
        dataForm.reset();
        updatePageList();
        
        alert('데이터가 성공적으로 저장되었습니다.');
    });
    
    // 페이지 로드 시 목록 업데이트
    updatePageList();
}

/**
 * 페이지 목록 업데이트
 */
function updatePageList() {
    const pageListElement = document.getElementById('pageList');
    if (!pageListElement) return;
    
    // 저장된 페이지 가져오기
    const pages = getAllPages();
    
    // 목록 초기화
    pageListElement.innerHTML = '';
    
    // 데이터가 없을 경우 메시지 표시
    if (pages.length === 0) {
        pageListElement.innerHTML = '<div class="message">저장된 데이터가 없습니다.</div>';
        return;
    }
    
    // 페이지 카드 생성
    pages.forEach(page => {
        const pageCard = document.createElement('div');
        pageCard.className = 'page-card';
        pageCard.dataset.id = page.id;
        
        // 날짜 형식화
        const createDate = new Date(page.metadata.createDate).toLocaleDateString();
        
        // 카드 내용 설정
        pageCard.innerHTML = `
            <h3>${page.title}</h3>
            <p>${truncateText(page.content, 100)}</p>
            <div class="metadata">
                <span>작성자: ${page.metadata.author}</span>
                <span>작성일: ${createDate}</span>
            </div>
        `;
        
        // 카드 클릭 이벤트 - 편집 페이지로 이동
        pageCard.addEventListener('click', function() {
            window.location.href = `edit.html?id=${page.id}`;
        });
        
        pageListElement.appendChild(pageCard);
    });
}

/**
 * 수정 페이지 폼 초기화
 */
function initEditForm() {
    const pageSelect = document.getElementById('pageSelect');
    const editForm = document.getElementById('editForm');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (!pageSelect || !editForm || !noDataMessage) return;
    
    // 현재 URL에서 ID 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const pageId = urlParams.get('id');
    
    // 저장된 페이지 가져오기
    const pages = getAllPages();
    
    // 데이터가 없을 경우 메시지 표시
    if (pages.length === 0) {
        pageSelect.classList.add('hidden');
        editForm.classList.add('hidden');
        noDataMessage.classList.remove('hidden');
        return;
    }
    
    // 선택 옵션 초기화
    pageSelect.innerHTML = '<option value="">-- 페이지 선택 --</option>';
    
    // 페이지 옵션 추가
    pages.forEach(page => {
        const option = document.createElement('option');
        option.value = page.id;
        option.textContent = page.title;
        pageSelect.appendChild(option);
    });
    
    // 페이지 선택 이벤트
    pageSelect.addEventListener('change', function() {
        const selectedId = this.value;
        
        if (!selectedId) {
            editForm.classList.add('hidden');
            return;
        }
        
        loadPageToForm(selectedId);
    });
    
    // URL에 ID가 있을 경우 해당 페이지 로드
    if (pageId) {
        pageSelect.value = pageId;
        
        if (pageSelect.value) {
            loadPageToForm(pageId);
        }
    }
    
    // 수정 폼 제출 이벤트
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const id = document.getElementById('pageId').value;
        const title = document.getElementById('editTitle').value.trim();
        const author = document.getElementById('editAuthor').value.trim();
        const content = document.getElementById('editContent').value.trim();
        
        // 유효성 검증
        if (!id || !title || !author || !content) {
            alert('모든 필드를 입력해주세요.');
            return;
        }
        
        // 데이터 업데이트
        const updated = updatePage(id, {
            title: title,
            content: content,
            metadata: {
                author: author
            }
        });
        
        if (updated) {
            alert('데이터가 성공적으로 수정되었습니다.');
            
            // 옵션 텍스트 업데이트
            const option = pageSelect.querySelector(`option[value="${id}"]`);
            if (option) {
                option.textContent = title;
            }
        } else {
            alert('데이터 수정에 실패했습니다.');
        }
    });
    
    // 삭제 버튼 이벤트
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            const id = document.getElementById('pageId').value;
            
            if (!id) return;
            
            if (confirm('정말 이 데이터를 삭제하시겠습니까?')) {
                const deleted = deletePage(id);
                
                if (deleted) {
                    alert('데이터가 삭제되었습니다.');
                    
                    // 옵션 제거 및 폼 리셋
                    const option = pageSelect.querySelector(`option[value="${id}"]`);
                    if (option) {
                        pageSelect.removeChild(option);
                    }
                    
                    // 남은 옵션이 없을 경우 메시지 표시
                    if (pageSelect.options.length <= 1) {
                        pageSelect.classList.add('hidden');
                        editForm.classList.add('hidden');
                        noDataMessage.classList.remove('hidden');
                    } else {
                        pageSelect.value = '';
                        editForm.classList.add('hidden');
                    }
                } else {
                    alert('데이터 삭제에 실패했습니다.');
                }
            }
        });
    }
    
    // 취소 버튼 이벤트
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            pageSelect.value = '';
            editForm.classList.add('hidden');
        });
    }
}

/**
 * 페이지 데이터를 폼에 로드
 * @param {string} id - 로드할 페이지 ID
 */
function loadPageToForm(id) {
    const page = getPageById(id);
    const editForm = document.getElementById('editForm');
    
    if (!page || !editForm) return;
    
    // 폼 필드에 데이터 설정
    document.getElementById('pageId').value = page.id;
    document.getElementById('editTitle').value = page.title;
    document.getElementById('editAuthor').value = page.metadata.author;
    document.getElementById('editContent').value = page.content;
    
    // 폼 표시
    editForm.classList.remove('hidden');
}

/**
 * 텍스트 길이 제한
 * @param {string} text - 원본 텍스트
 * @param {number} maxLength - 최대 길이
 * @returns {string} - 잘린 텍스트
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
} 