/**
 * HTML 페이지 생성 모듈
 * 데이터를 기반으로 HTML 페이지 생성 및 미리보기 기능 제공
 */

// 현재 페이지 URL 확인
const currentPagePath = window.location.pathname.split('/').pop();

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    if (currentPagePath === 'preview.html') {
        initPreviewPage();
    }
});

/**
 * 미리보기 페이지 초기화
 */
function initPreviewPage() {
    const previewSelect = document.getElementById('previewSelect');
    const previewFrame = document.getElementById('previewFrame');
    const viewBtn = document.getElementById('viewBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const noPreviewData = document.getElementById('noPreviewData');
    
    if (!previewSelect || !previewFrame || !viewBtn || !downloadBtn || !noPreviewData) return;
    
    // 저장된 페이지 가져오기
    const pages = getAllPages();
    
    // 데이터가 없을 경우 메시지 표시
    if (pages.length === 0) {
        previewSelect.classList.add('hidden');
        viewBtn.classList.add('hidden');
        downloadBtn.classList.add('hidden');
        previewFrame.classList.add('hidden');
        noPreviewData.classList.remove('hidden');
        return;
    }
    
    // 선택 옵션 초기화
    previewSelect.innerHTML = '<option value="">-- 페이지 선택 --</option>';
    
    // 페이지 옵션 추가
    pages.forEach(page => {
        const option = document.createElement('option');
        option.value = page.id;
        option.textContent = page.title;
        previewSelect.appendChild(option);
    });
    
    // 페이지 선택 이벤트
    previewSelect.addEventListener('change', function() {
        const selectedId = this.value;
        
        if (!selectedId) {
            previewFrame.innerHTML = `
                <div class="placeholder-message">
                    페이지를 선택하면 미리보기가 여기에 표시됩니다.
                </div>
            `;
            viewBtn.disabled = true;
            downloadBtn.disabled = true;
            return;
        }
        
        // 선택된 페이지 로드
        const page = getPageById(selectedId);
        if (page) {
            // HTML 생성 및 미리보기 표시
            const generatedHTML = generateHTML(page);
            
            // 미리보기에 내용 설정
            previewFrame.innerHTML = `
                <div class="preview-content">
                    <h1>${page.title}</h1>
                    <p class="author">작성자: ${page.metadata.author}</p>
                    <div class="content">${page.content}</div>
                    <div class="footer">
                        <p>작성일: ${new Date(page.metadata.createDate).toLocaleDateString()}</p>
                        <p>마지막 수정일: ${new Date(page.metadata.updateDate).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
            
            // 버튼 활성화
            viewBtn.disabled = false;
            downloadBtn.disabled = false;
            
            // 현재 선택된 페이지 ID 저장
            previewFrame.dataset.pageId = selectedId;
        }
    });
    
    // 새 탭에서 보기 버튼 이벤트
    viewBtn.addEventListener('click', function() {
        const pageId = previewFrame.dataset.pageId;
        if (!pageId) return;
        
        const page = getPageById(pageId);
        if (page) {
            const html = generateHTML(page);
            
            // HTML Blob 생성
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            // 새 탭에서 열기
            window.open(url, '_blank');
        }
    });
    
    // 다운로드 버튼 이벤트
    downloadBtn.addEventListener('click', function() {
        const pageId = previewFrame.dataset.pageId;
        if (!pageId) return;
        
        const page = getPageById(pageId);
        if (page) {
            const html = generateHTML(page);
            
            // 다운로드 링크 생성
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `${page.title.replace(/\s+/g, '-').toLowerCase()}.html`;
            a.click();
            
            // URL 객체 해제
            setTimeout(() => URL.revokeObjectURL(url), 100);
        }
    });
}

/**
 * HTML 페이지 생성
 * @param {Object} pageData - 페이지 데이터
 * @returns {string} - 생성된 HTML
 */
function generateHTML(pageData) {
    // 날짜 형식화
    const createDate = new Date(pageData.metadata.createDate).toLocaleDateString();
    const updateDate = new Date(pageData.metadata.updateDate).toLocaleDateString();
    
    // 기본 템플릿 사용
    const template = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageData.title}</title>
    <style>
        /* 페이지 스타일 */
        body {
            font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
        }
        
        .header h1 {
            color: #2c3e50;
            margin: 0 0 10px 0;
        }
        
        .content {
            margin-bottom: 30px;
        }
        
        .footer {
            font-size: 0.9em;
            color: #7f8c8d;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .container {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${pageData.title}</h1>
            <p>작성자: ${pageData.metadata.author}</p>
        </div>
        
        <div class="content">
            ${pageData.content}
        </div>
        
        <div class="footer">
            <p>작성일: ${createDate}</p>
            <p>마지막 수정일: ${updateDate}</p>
        </div>
    </div>
</body>
</html>
`;
    
    return template;
}

/**
 * 텍스트에서 HTML 태그 이스케이프 처리
 * @param {string} text - 원본 텍스트
 * @returns {string} - 이스케이프 처리된 텍스트
 */
function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
} 