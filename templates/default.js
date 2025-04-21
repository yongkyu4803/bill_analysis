/**
 * 기본 HTML 템플릿
 * 페이지 데이터를 기반으로 HTML 콘텐츠 생성
 */

/**
 * 기본 HTML 템플릿 생성
 * @param {Object} pageData - 페이지 데이터
 * @returns {string} - 생성된 HTML 문자열
 */
function defaultTemplate(pageData) {
    // 날짜 형식화
    const createDate = new Date(pageData.metadata.createDate).toLocaleDateString();
    const updateDate = new Date(pageData.metadata.updateDate).toLocaleDateString();
    
    return `
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
}

// 템플릿 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = defaultTemplate;
} 