// Supabase 클라이언트 초기화
const supabaseUrl = 'https://rxwztfdnragffxbmlscf.supabase.co';

// anon key 사용 (public key)
// 주의: 이 키는 브라우저에 노출되어도 안전한 anon/public 키여야 합니다
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4d3p0ZmRucmFnZmZ4Ym1sc2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NzU2MDgsImV4cCI6MjA1ODA1MTYwOH0.KN8cR6_xHHHfuF1odUi9WwzkbOHCmwuRaK0FYe7b0Ig';

// 디버깅을 위한 코드
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key 길이:', supabaseAnonKey.length);

// 클라이언트 초기화 방법 변경
const supabaseClient = supabase ? supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

if (!supabaseClient) {
  console.error('Supabase 클라이언트를 초기화할 수 없습니다. supabase 객체가 존재하는지 확인하세요.');
}

// API 키가 유효한지 확인하기 위한 테스트 함수
async function testSupabaseConnection() {
  try {
    if (!supabaseClient) {
      console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
      return false;
    }

    console.log('Supabase 연결 테스트 중...');
    // 단순한 쿼리로 연결 테스트 (count 대신 exists 사용)
    const { data, error } = await supabaseClient
      .from('bill')
      .select('id', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('Supabase 연결 오류:', error);
      return false;
    }
    
    console.log('Supabase 연결 성공:', data);
    return true;
  } catch (err) {
    console.error('Supabase 연결 테스트 중 예외 발생:', err);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async function() {
    // 모달 템플릿 로드
    loadModalTemplates();
    
    // Supabase 연결 테스트
    const isConnected = await testSupabaseConnection();
    
    if (!isConnected) {
        const billListElement = document.getElementById('billList');
        if (billListElement) {
            billListElement.innerHTML = '<div class="alert alert-danger">Supabase 연결에 실패했습니다. 콘솔을 확인하세요.</div>';
        }
        return;
    }
    
    // 세션 상태 확인
    checkSession();
    
    // 초기 데이터 로딩
    loadBills();
    
    // 이벤트 리스너 설정
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 법안 등록 폼 제출
    const billForm = document.getElementById('billForm');
    if (billForm) {
        billForm.addEventListener('submit', handleFormSubmit);
    }
    
    // 검색 기능
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    // 분석 보고서 보기 버튼 추가
    const analysisReportBtn = document.getElementById('viewAnalysisBtn');
    if (analysisReportBtn) {
        analysisReportBtn.addEventListener('click', showAnalysisReport);
    }
    
    // 로그인 버튼
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    // 탭 전환 이벤트 처리
    setupTabEvents();
}

// 마크다운 <-> HTML 탭 전환 이벤트 설정
function setupTabEvents() {
    // HTML 탭과 마크다운 탭 요소
    const htmlTab = document.getElementById('html-tab');
    const markdownTab = document.getElementById('markdown-tab');
    
    if (!htmlTab || !markdownTab) return;
    
    // HTML -> 마크다운 변환 (탭 전환 시)
    markdownTab.addEventListener('shown.bs.tab', function(e) {
        const htmlContent = document.getElementById('billContent').value;
        const markdownContent = document.getElementById('billMarkdownContent');
        
        // HTML 내용이 있고 마크다운 내용이 없을 때만 변환
        if (htmlContent && !markdownContent.value) {
            markdownContent.value = convertHtmlToMarkdown(htmlContent);
        }
    });
    
    // 마크다운 -> HTML 변환 (탭 전환 시)
    htmlTab.addEventListener('shown.bs.tab', function(e) {
        const markdownContent = document.getElementById('billMarkdownContent').value;
        const htmlContent = document.getElementById('billContent');
        
        // 마크다운 내용이 있고 HTML 내용이 없을 때만 변환
        if (markdownContent && !htmlContent.value) {
            htmlContent.value = convertMarkdownToHtml(markdownContent);
        }
    });
    
    // 미리보기 버튼 이벤트
    const previewMarkdownBtn = document.getElementById('previewMarkdownBtn');
    if (previewMarkdownBtn) {
        previewMarkdownBtn.addEventListener('click', function() {
            showMarkdownPreview();
        });
    }
}

// HTML을 마크다운으로 변환하는 함수
function convertHtmlToMarkdown(html) {
    if (!html) return '';
    
    // 기본적인 HTML -> 마크다운 변환
    let markdown = html
        // 헤더 변환
        .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
        
        // 볼드 및 이탤릭
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        
        // 링크
        .replace(/<a href="(.*?)".*?>(.*?)<\/a>/gi, '[$2]($1)')
        
        // 이미지
        .replace(/<img src="(.*?)".*?alt="(.*?)".*?>/gi, '![$2]($1)')
        
        // 목록
        .replace(/<ul>(.*?)<\/ul>/gis, function(match, content) {
            return content.replace(/<li>(.*?)<\/li>/gi, '* $1\n');
        })
        
        // 코드
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')
        
        // 단락
        .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
        
        // 줄바꿈
        .replace(/<br\s*\/?>/gi, '\n');
    
    // 이스케이프된 HTML 요소 복원
    markdown = markdown
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    
    return markdown.trim();
}

// 법안 목록 로드
async function loadBills() {
    try {
        const billListElement = document.getElementById('billList');
        if (!billListElement) return;
        
        // 로딩 표시
        billListElement.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">로딩 중...</span></div></div>';
        
        console.log('법안 목록 불러오기 시작...');
        
        // Supabase에서 데이터 가져오기
        const { data: bills, error } = await supabaseClient
            .from('bill')
            .select('*')
            .order('created_at', { ascending: false });
        
        console.log('Supabase 응답:', { bills, error });
        
        if (error) throw error;
        
        if (!bills || bills.length === 0) {
            billListElement.innerHTML = '<div class="alert alert-info">등록된 법안이 없습니다.</div>';
            return;
        }
        
        // 법안 목록 렌더링
        renderBillList(bills);
        
    } catch (error) {
        console.error('법안 로드 오류:', error);
        const billListElement = document.getElementById('billList');
        if (billListElement) {
            billListElement.innerHTML = `<div class="alert alert-danger">데이터를 불러오는 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}</div>`;
        }
    }
}

// 법안 목록 렌더링
function renderBillList(bills) {
    const billListElement = document.getElementById('billList');
    if (!billListElement) return;
    
    // 현재 세션 확인 - 관리자 로그인 여부
    let isAdminLoggedIn = false;
    
    // 로그인 버튼 확인으로 로그인 상태 유추
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn && loginBtn.innerHTML.includes('로그아웃')) {
        isAdminLoggedIn = true;
    }
    
    console.log('관리자 로그인 상태:', isAdminLoggedIn);
    
    // 관리 버튼 표시 여부 결정 (관리자 로그인 시에는 표시)
    const adminBtnClass = isAdminLoggedIn ? '' : 'd-none';
    
    // 테이블 생성 - 체크박스 제거하고 상임위 컬럼 추가
    let html = `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead>
                    <tr>
                        <th style="width: 10%;">상임위</th>
                        <th style="width: 40%;">법안명</th>
                        <th style="width: 15%;">제안</th>
                        <th style="width: 15%;">등록</th>
                        <th style="width: 20%;">보기</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    bills.forEach(bill => {
        const date = new Date(bill.created_at).toLocaleDateString();
        
        // 상임위 배지 스타일 적용
        const committee = bill.committee || '';
        const committeeBadge = committee ? 
            `<span class="badge rounded-pill bg-light text-dark border">${committee}</span>` : '';
        
        html += `
            <tr>
                <td>${committeeBadge}</td>
                <td class="text-truncate">${bill.bill_name}</td>
                <td>${bill.writer}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-primary view-bill" data-id="${bill.id}" title="상세보기">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning edit-bill admin-only ${adminBtnClass}" data-id="${bill.id}" title="수정">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-bill admin-only ${adminBtnClass}" data-id="${bill.id}" title="삭제">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    
    billListElement.innerHTML = html;
    
    // 이벤트 리스너 추가
    addBillListEventListeners();
}

// 법안 목록의 이벤트 리스너 추가
function addBillListEventListeners() {
    // 상세 보기 버튼
    document.querySelectorAll('.view-bill').forEach(btn => {
        btn.addEventListener('click', function() {
            const billId = this.getAttribute('data-id');
            viewBillDetails(billId);
        });
    });
    
    // 수정 버튼
    document.querySelectorAll('.edit-bill').forEach(btn => {
        btn.addEventListener('click', function() {
            const billId = this.getAttribute('data-id');
            editBill(billId);
        });
    });
    
    // 삭제 버튼
    document.querySelectorAll('.delete-bill').forEach(btn => {
        btn.addEventListener('click', function() {
            const billId = this.getAttribute('data-id');
            deleteBill(billId);
        });
    });
}

// 법안 상세 정보 표시
async function viewBillDetails(billId) {
    try {
        const { data: bill, error } = await supabaseClient
            .from('bill')
            .select('*')
            .eq('id', billId)
            .single();
        
        if (error) throw error;
        
        if (!bill) {
            showAlert('법안을 찾을 수 없습니다.', 'danger');
            return;
        }
        
        // 법안명에 '분석'이 포함된 경우 분석 보고서 모달 표시
        if (bill.bill_name && bill.bill_name.includes('분석')) {
            showAnalysisReport();
            return;
        }
        
        // 모달에 데이터 채우기
        document.getElementById('billDetailTitle').textContent = bill.bill_name;
        document.getElementById('billDetailProposer').textContent = bill.writer;
        
        const date = new Date(bill.created_at).toLocaleDateString();
        document.getElementById('billDetailDate').textContent = date;
        
        // 상임위 설정 (있는 경우에만)
        const committeeElement = document.getElementById('billDetailCommittee');
        if (committeeElement) {
            if (bill.committee) {
                committeeElement.innerHTML = `<span class="badge rounded-pill bg-light text-dark border">${bill.committee}</span>`;
            } else {
                committeeElement.innerHTML = '-';
            }
        }
        
        // HTML 콘텐츠 여부 확인
        const contentElement = document.getElementById('billDetailContent');
        if (bill.description && (bill.description.includes('<!DOCTYPE html>') || bill.description.includes('<html'))) {
            // HTML 콘텐츠인 경우 iframe으로 표시
            contentElement.innerHTML = `<iframe id="htmlContentFrame" style="width:100%; height:500px; border:none;"></iframe>`;
            
            // iframe에 HTML 내용 설정
            setTimeout(() => {
                const iframe = document.getElementById('htmlContentFrame');
                if (iframe) {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    iframeDoc.open();
                    iframeDoc.write(bill.description);
                    iframeDoc.close();
                }
            }, 100);
        } else {
            // 일반 텍스트인 경우 그대로 표시
            contentElement.textContent = bill.description;
        }
        
        // 모달 표시
        const modal = new bootstrap.Modal(document.getElementById('billDetailModal'));
        modal.show();
    } catch (error) {
        console.error('법안 상세 정보 조회 오류:', error);
        showAlert('법안 정보를 불러오는 중 오류가 발생했습니다.', 'danger');
    }
}

// 법안 분석 보고서 모달 표시
function showAnalysisReport() {
    // 이미 모달이 존재하면 제거
    let existingModal = document.getElementById('analysisReportModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 모달 HTML 생성
    const modalHTML = `
    <div class="modal fade" id="analysisReportModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">법안 분석 보고서</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <iframe id="analysisReportFrame" style="width:100%; height:600px; border:none;"></iframe>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // 모달을 body에 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 보고서 HTML 내용
    const reportHTML = `<!DOCTYPE html> <html lang="ko"> <head> <meta charset="UTF-8"> <title>법안 분석 보고서</title> <style> body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; } h1, h2, h3 { color: #2c3e50; } section { margin-bottom: 40px; } ul { margin-left: 20px; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccc; padding: 8px; text-align: left; } th { background-color: #f8f8f8; } code { background-color: #f4f4f4; padding: 2px 4px; } </style> </head> <body> <h1>📄 법안 분석 보고서</h1> <p><strong>버전:</strong> 2025-04-21</p> <p><strong>대상 법안:</strong> 자본시장과 금융투자업에 관한 법률 일부개정법률안 (의안번호 2205423)</p> <p><strong>분석 기준일:</strong> 2025-04-21</p> <p><strong>상태:</strong> 계속 심사 중 (22대)</p> <section> <h2>📌 Executive Summary</h2> <ul> <li><strong>핵심 쟁점:</strong> 신탁업 수탁 재산 확대, 비금전신탁의 수익증권 발행 제도화, 신탁업무의 전문기관 위탁 허용</li> <li><strong>통과 가능성:</strong> 75%</li> <li><strong>예상 일정:</strong> 정무위 후속 심사 → 법사위 체계자구 심사 → 본회의 표결 (2025년 상반기 가능성 있음)</li> </ul> </section> <section> <h2>1. 법안 제출 배경 및 주요 내용</h2> <p>고령화 및 재산 다양화에 따른 종합재산관리 수요 대응을 위해 신탁제도의 유연화 및 확대 필요.</p> <ul> <li>수탁 가능 재산에 채무·담보권 포함</li> <li>전문기관(법무법인 등)에 신탁업무 위탁 허용</li> <li>비금전신탁 수익증권 발행 허용</li> </ul> </section> <section> <h2>2. 현재 절차상 위치 및 향후 일정</h2> <ul> <li>정무위원회 검토보고 완료 (2025년 2월 기준)</li> <li>예상: 2분기 소위 → 3분기 본회의 표결</li> </ul> </section> <section> <h2>3. 주요 조항 및 쟁점 분석</h2> <ul> <li><strong>제103조:</strong> 채무·담보권 포함 (신탁재산 확대)</li> <li><strong>제110조:</strong> 비금전신탁 수익증권 발행 허용 (조각투자 제도화)</li> <li><strong>제109조의2:</strong> 전문기관에 위탁 허용 (비금융기관 포함)</li> </ul> </section> <section> <h2>4. 이해관계자 분석</h2> <table> <thead> <tr> <th>이해관계자</th> <th>입장</th> <th>이유</th> </tr> </thead> <tbody> <tr><td>고령자·가계</td><td>긍정</td><td>재산관리 수요 충족</td></tr> <tr><td>신탁업자</td><td>매우 긍정</td><td>상품 다변화</td></tr> <tr><td>전문기관</td><td>긍정</td><td>신규 시장 진입</td></tr> <tr><td>금융위원회</td><td>전략적 지원</td><td>정책과제와 연계</td></tr> <tr><td>일반 투자자</td><td>긍정</td><td>투자자 보호 강화</td></tr> <tr><td>법조계</td><td>우려</td><td>법리적 부종성 문제</td></tr> </tbody> </table> </section> <section> <h2>5. 법률안 통과 가능성 예측</h2> <ul> <li><strong>정무위:</strong> 긍정적</li> <li><strong>법사위:</strong> 기술적 조율 필요</li> <li><strong>예측 확률:</strong> 75%</li> </ul> </section> <section> <h2>6. 시행 이후 예상 효과 및 파급력</h2> <h4>✅ 긍정적 효과</h4> <ul> <li>재산관리 맞춤형 신탁 활성화</li> <li>중소기업 자산 유동화 확대</li> <li>후견·유언 기능을 갖춘 신탁 서비스 가능</li> </ul> <h4>⚠️ 부정적 가능성</h4> <ul> <li>감독 사각지대 발생 우려</li> <li>신탁업자의 책임 가중</li> </ul> </section> <section> <h2>7. 비교 사례 및 시사점</h2> <ul> <li><strong>일본:</strong> 신탁 포괄 규정, 전문기관 위탁 허용</li> <li><strong>미국:</strong> 생활 밀착형 신탁 서비스 일상화</li> <li><strong>시사점:</strong> 자본시장법과 신탁법의 규율 정합성 확보 필요</li> </ul> </section> </body> </html>`;
    
    // iframe에 보고서 내용 설정
    setTimeout(() => {
        const iframe = document.getElementById('analysisReportFrame');
        if (iframe) {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(reportHTML);
            iframeDoc.close();
            
            // 모달 표시
            const modal = new bootstrap.Modal(document.getElementById('analysisReportModal'));
            modal.show();
        }
    }, 100);
}

// 법안 수정 폼 표시
async function editBill(billId) {
    try {
        // 법안 데이터 가져오기
        const { data: bill, error } = await supabaseClient
            .from('bill')
            .select('*')
            .eq('id', billId)
            .single();
        
        if (error) throw error;
        
        if (!bill) {
            showAlert('법안을 찾을 수 없습니다.', 'danger');
            return;
        }
        
        // 폼에 데이터 채우기
        const form = document.getElementById('billForm');
        if (!form) return;
        
        form.elements['billTitle'].value = bill.bill_name;
        form.elements['billProposer'].value = bill.writer;
        form.elements['billContent'].value = bill.description;
        
        // 상임위 선택
        if (form.elements['billCommittee']) {
            form.elements['billCommittee'].value = bill.committee || '';
        }
        
        // HTML이 있으면 마크다운으로도 변환해서 채우기
        if (bill.description) {
            const markdownContent = convertHtmlToMarkdown(bill.description);
            const markdownField = form.elements['billMarkdownContent'];
            if (markdownField) {
                markdownField.value = markdownContent;
            }
        }
        
        // 폼에 법안 ID 저장 (숨겨진 필드 사용)
        if (!form.elements['billId']) {
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = 'billId';
            hiddenField.id = 'billId';
            form.appendChild(hiddenField);
        }
        form.elements['billId'].value = billId;
        
        // 폼 제목 변경
        const formTitle = document.querySelector('.form-container h3');
        if (formTitle) {
            formTitle.textContent = '법안 수정';
        }
        
        // 제출 버튼 텍스트 변경
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '수정';
        }
        
        // 폼 컨테이너 표시
        const formContainer = document.getElementById('formContainer');
        if (formContainer) {
            const bsCollapse = new bootstrap.Collapse(formContainer);
            bsCollapse.show();
        }
        
        // 스크롤하여 폼 표시
        formContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('법안 수정 폼 오류:', error);
        showAlert('법안 정보를 불러오는 중 오류가 발생했습니다.', 'danger');
    }
}

// 법안 삭제
async function deleteBill(billId) {
    if (!confirm('이 법안을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('bill')
            .delete()
            .eq('id', billId);
        
        if (error) throw error;
        
        showAlert('법안이 성공적으로 삭제되었습니다.', 'success');
        loadBills(); // 목록 새로고침
    } catch (error) {
        console.error('법안 삭제 오류:', error);
        showAlert('법안 삭제 중 오류가 발생했습니다.', 'danger');
    }
}

// 폼 제출 처리
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    
    // 폼 요소가 존재하는지 확인
    if (!form.elements['billTitle'] || !form.elements['billProposer'] || !form.elements['billContent']) {
        console.error('필수 폼 필드가 누락되었습니다');
        showAlert('폼 필드가 올바르게 정의되지 않았습니다.', 'danger');
        return;
    }
    
    const billId = form.elements['billId'] ? form.elements['billId'].value : null;
    
    // 내용 가져오기 (HTML 또는 마크다운)
    let content = '';
    const activeTab = document.querySelector('.nav-link.active');
    
    if (activeTab && activeTab.id === 'markdown-tab') {
        // 마크다운 내용을 HTML로 변환
        const markdownContent = form.elements['billMarkdownContent'].value;
        content = convertMarkdownToHtml(markdownContent);
    } else {
        // 기본 HTML 내용
        content = form.elements['billContent'].value;
    }
    
    const billData = {
        bill_name: form.elements['billTitle'].value,
        writer: form.elements['billProposer'].value,
        description: content,
        committee: form.elements['billCommittee'].value || '' // 상임위 데이터 추가
    };
    
    console.log('폼 제출 - 데이터:', billData);
    
    try {
        let response;
        
        if (billId) {
            // 기존 법안 업데이트
            console.log('법안 업데이트 시도:', billId);
            response = await supabaseClient
                .from('bill')
                .update(billData)
                .eq('id', billId)
                .select();
                
            console.log('업데이트 응답:', response);
            
            if (response.error) throw response.error;
            showAlert('법안이 성공적으로 수정되었습니다.', 'success');
        } else {
            // 새 법안 추가
            console.log('새 법안 추가 시도');
            response = await supabaseClient
                .from('bill')
                .insert([billData])
                .select();
                
            console.log('추가 응답:', response);
            
            if (response.error) throw response.error;
            showAlert('새 법안이 성공적으로 등록되었습니다.', 'success');
        }
        
        // 폼 초기화
        form.reset();
        
        // 숨겨진 ID 필드 제거
        const idField = form.elements['billId'];
        if (idField) {
            idField.remove();
        }
        
        // 폼 제목과 버튼 텍스트 원상복구
        const formTitle = document.querySelector('.form-container h3');
        if (formTitle) {
            formTitle.textContent = '법안 등록';
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '등록';
        }
        
        // 폼 접기
        const formContainer = document.getElementById('formContainer');
        if (formContainer) {
            const bsCollapse = new bootstrap.Collapse(formContainer);
            bsCollapse.hide();
        }
        
        // 목록 새로고침
        loadBills();
    } catch (error) {
        console.error('법안 저장 오류:', error);
        // 상세 오류 정보 표시
        let errorMsg = '법안 저장 중 오류가 발생했습니다.';
        if (error.message) {
            errorMsg += ` (${error.message})`;
        }
        if (error.details) {
            errorMsg += ` - ${error.details}`;
        }
        if (error.hint) {
            errorMsg += ` - 힌트: ${error.hint}`;
        }
        showAlert(errorMsg, 'danger');
    }
}

// 마크다운을 HTML로 변환하는 함수
function convertMarkdownToHtml(markdown) {
    if (!markdown) return '';
    
    // 기본적인 마크다운 변환 (더 복잡한 변환은 라이브러리 사용 권장)
    let html = markdown
        // 헤더 변환
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        
        // 볼드 및 이탤릭
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        // 링크
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        
        // 목록
        .replace(/^\s*\n\* (.*)/gm, '<ul>\n<li>$1</li>')
        .replace(/^\* (.*)/gm, '<li>$1</li>')
        .replace(/^\s*\n- (.*)/gm, '<ul>\n<li>$1</li>')
        .replace(/^- (.*)/gm, '<li>$1</li>')
        
        // 코드
        .replace(/`(.*?)`/g, '<code>$1</code>')
        
        // 단락
        .replace(/^\s*\n\s*\n/gm, '</p><p>')
        
        // 이미지
        .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="img-fluid" />');
    
    // 단락으로 감싸기
    html = '<p>' + html + '</p>';
    
    return html;
}

// 검색 처리
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    
    if (!searchTerm) {
        loadBills();
        return;
    }
    
    searchBills(searchTerm);
}

// 법안 검색
async function searchBills(searchTerm) {
    try {
        const { data: bills, error } = await supabaseClient
            .from('bill')
            .select('*')
            .or(`bill_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,writer.ilike.%${searchTerm}%,committee.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const billListElement = document.getElementById('billList');
        if (!billListElement) return;
        
        if (!bills || bills.length === 0) {
            billListElement.innerHTML = '<div class="alert alert-info">검색 결과가 없습니다.</div>';
            return;
        }
        
        renderBillList(bills);
    } catch (error) {
        console.error('법안 검색 오류:', error);
        showAlert('검색 중 오류가 발생했습니다.', 'danger');
    }
}

// 알림 메시지 표시
function showAlert(message, type) {
    // 알림 컨테이너 찾기 또는 생성
    let alertContainer = document.getElementById('alertContainer');
    
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '20px';
        alertContainer.style.right = '20px';
        alertContainer.style.zIndex = '9999';
        document.body.appendChild(alertContainer);
    }
    
    // 알림 요소 생성
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type} alert-dismissible fade show`;
    alertEl.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // 알림 컨테이너에 추가
    alertContainer.appendChild(alertEl);
    
    // 5초 후 알림 자동 제거
    setTimeout(() => {
        alertEl.classList.remove('show');
        setTimeout(() => {
            alertEl.remove();
        }, 150);
    }, 5000);
}

// 모달 템플릿 로드 함수
async function loadModalTemplates() {
    try {
        // 모달 템플릿 로드
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) return;
        
        // 법안 상세 모달 템플릿 로드
        const response = await fetch('templates/bill_modal.html');
        if (!response.ok) {
            throw new Error(`모달 템플릿을 로드할 수 없습니다: ${response.status}`);
        }
        
        const modalTemplate = await response.text();
        modalContainer.innerHTML = modalTemplate;
        
        console.log('모달 템플릿이 성공적으로 로드되었습니다.');
    } catch (error) {
        console.error('모달 템플릿 로드 오류:', error);
        showAlert('모달 템플릿을 로드하는 중 오류가 발생했습니다.', 'danger');
    }
}

// 로그인 처리
async function handleLogin() {
    try {
        // 로그인 모달 생성
        let loginModal = document.getElementById('loginModal');
        
        if (!loginModal) {
            // 모달 HTML 생성
            const modalHTML = `
            <div class="modal fade" id="loginModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">관리자 로그인</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="loginForm">
                                <div class="mb-3">
                                    <label for="email" class="form-label">이메일</label>
                                    <input type="email" class="form-control" id="email" required>
                                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">비밀번호</label>
                                    <input type="password" class="form-control" id="password" required>
                                </div>
                                <div id="loginError" class="alert alert-danger d-none"></div>
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary">로그인</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            `;
            
            // 모달을 body에 추가
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            loginModal = document.getElementById('loginModal');
            
            // 로그인 폼 제출 이벤트 추가
            const loginForm = document.getElementById('loginForm');
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                try {
                    // 로그인 처리 중 표시
                    const submitBtn = loginForm.querySelector('button[type="submit"]');
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>로그인 중...';
                    submitBtn.disabled = true;
                    
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    
                    if (error) throw error;
                    
                    console.log('로그인 성공:', data);
                    
                    // 특별 처리: parkyongkyu0@gmail.com은 항상 성공
                    if (email === 'parkyongkyu0@gmail.com') {
                        console.log('관리자 이메일 확인됨 - 권한 부여');
                        
                        // parkyongkyu0@gmail.com의 경우 무조건 성공 처리
                        const modal = bootstrap.Modal.getInstance(loginModal);
                        modal.hide();
                        
                        // UI 업데이트
                        showAdminUI();
                        
                        // 로딩 새로고침 - admin UI 요소 확인
                        setTimeout(() => {
                            showAdminUI();
                        }, 1000);
                        
                        showAlert('관리자로 로그인되었습니다.', 'success');
                        return;
                    }
                    
                    // 로그인 성공 처리
                    const modal = bootstrap.Modal.getInstance(loginModal);
                    modal.hide();
                    
                    // 관리자 UI로 전환
                    showAdminUI();
                    
                    showAlert('관리자로 로그인되었습니다.', 'success');
                    
                    // 세션 정보 확인 및 권한 검사
                    const isAdmin = await checkUserRole(data.user);
                    
                    // 권한이 있으면 한번 더 UI 업데이트
                    if (isAdmin) {
                        setTimeout(() => {
                            showAdminUI();
                        }, 500);
                    }
                } catch (error) {
                    console.error('로그인 오류:', error);
                    const loginError = document.getElementById('loginError');
                    loginError.textContent = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
                    loginError.classList.remove('d-none');
                    
                    // 버튼 상태 복원
                    const submitBtn = loginForm.querySelector('button[type="submit"]');
                    submitBtn.innerHTML = '로그인';
                    submitBtn.disabled = false;
                }
            });
        }
        
        // 모달 표시
        const modal = new bootstrap.Modal(loginModal);
        modal.show();
    } catch (error) {
        console.error('로그인 모달 오류:', error);
        showAlert('로그인 처리 중 오류가 발생했습니다.', 'danger');
    }
}

// 관리자 UI로 전환
function showAdminUI() {
    console.log('관리자 UI 표시 중...');
    
    // 관리자용 UI 요소 표시
    const adminElements = document.querySelectorAll('.admin-only');
    console.log('관리자 요소 수:', adminElements.length);
    
    adminElements.forEach(el => {
        el.classList.remove('d-none');
        console.log('요소 표시:', el);
    });
    
    // 로그인 버튼을 로그아웃 버튼으로 변경
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-right me-1"></i>로그아웃';
        loginBtn.removeEventListener('click', handleLogin);
        loginBtn.addEventListener('click', handleLogout);
    }
    
    // 관리자 권한으로 법안 목록 새로고침
    loadBills();
    
    // 약간의 지연 후 버튼들의 가시성 다시 확인
    setTimeout(() => {
        const editButtons = document.querySelectorAll('.edit-bill');
        const deleteButtons = document.querySelectorAll('.delete-bill');
        
        console.log('수정 버튼 수:', editButtons.length);
        console.log('삭제 버튼 수:', deleteButtons.length);
        
        editButtons.forEach(btn => btn.classList.remove('d-none'));
        deleteButtons.forEach(btn => btn.classList.remove('d-none'));
    }, 500);
}

// 로그아웃 처리
async function handleLogout() {
    try {
        // 로그아웃 처리 중 표시
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>로그아웃 중...';
            loginBtn.disabled = true;
        }
        
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) throw error;
        
        // 로그아웃 버튼을 로그인 버튼으로 변경
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="bi bi-person-fill me-1"></i>관리자 로그인';
            loginBtn.disabled = false;
            loginBtn.removeEventListener('click', handleLogout);
            loginBtn.addEventListener('click', handleLogin);
        }
        
        // 관리자용 UI 요소 숨김
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.classList.add('d-none');
        });
        
        showAlert('로그아웃되었습니다.', 'success');
        
        // 목록 새로고침 (관리자 권한 없는 상태로)
        loadBills();
    } catch (error) {
        console.error('로그아웃 오류:', error);
        showAlert('로그아웃 중 오류가 발생했습니다.', 'danger');
        
        // 오류 발생 시 버튼 상태 복원
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="bi bi-box-arrow-right me-1"></i>로그아웃';
            loginBtn.disabled = false;
        }
    }
}

// 세션 상태 확인
async function checkSession() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('세션 확인 오류:', error);
            return;
        }
        
        // 현재 세션이 있는 경우 관리자 UI 표시
        if (data.session) {
            console.log('사용자 세션 발견:', data.session.user.email);
            
            // 권한 확인
            checkUserRole(data.session.user);
            
            // UI 업데이트
            showAdminUI();
        }
    } catch (error) {
        console.error('세션 확인 중 오류 발생:', error);
    }
}

// 사용자 권한 확인
async function checkUserRole(user) {
    try {
        console.log('사용자 권한 확인 중:', user);
        
        // 사용자 메타데이터에서 role 확인
        if (user && user.user_metadata && user.user_metadata.role === 'admin') {
            console.log('관리자 권한 확인됨 (메타데이터)');
            return true;
        }
        
        // Supabase에서 profiles 테이블 확인
        const userId = user ? user.id : null;
        
        if (!userId) {
            console.log('사용자 ID가 없습니다.');
            return false;
        }
        
        console.log('프로필 테이블에서 확인 중...');
        
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('사용자 프로필 조회 오류:', error);
            
            // 조회 오류지만 막지는 않음
            if (error.code === 'PGRST116') {
                console.log('프로필 레코드가 없음 - 관리자로 가정');
                return true;
            }
            return false;
        }
        
        console.log('프로필 데이터:', data);
        
        if (data && data.role === 'admin') {
            console.log('프로필에서 관리자 권한 확인됨');
            return true;
        }
        
        // 마지막 대안으로 이메일 주소로 직접 확인
        const { data: userData } = await supabaseClient.auth.getUser();
        
        if (userData && userData.user && userData.user.email === 'parkyongkyu0@gmail.com') {
            console.log('이메일 주소로 관리자 확인됨');
            return true;
        }
        
        console.log('관리자 권한 없음:', data);
        showAlert('관리자 권한이 없습니다.', 'warning');
        
        // 관리자 권한이 없으면 로그아웃
        handleLogout();
        return false;
    } catch (error) {
        console.error('권한 확인 오류:', error);
        // 오류 발생 시 관리자로 간주 (테스트용)
        return true;
    }
}

// 마크다운 미리보기 모달 표시
function showMarkdownPreview() {
    const markdownContent = document.getElementById('billMarkdownContent').value;
    
    if (!markdownContent) {
        showAlert('미리보기할 마크다운 내용이 없습니다.', 'warning');
        return;
    }
    
    // HTML로 변환
    const htmlContent = convertMarkdownToHtml(markdownContent);
    
    // 모달 HTML 생성
    let previewModal = document.getElementById('markdownPreviewModal');
    
    if (!previewModal) {
        const modalHTML = `
        <div class="modal fade" id="markdownPreviewModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">마크다운 미리보기</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="markdownPreviewContent" class="p-3 border rounded bg-light"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // 모달을 body에 추가
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        previewModal = document.getElementById('markdownPreviewModal');
    }
    
    // 미리보기 내용 설정
    const previewContent = document.getElementById('markdownPreviewContent');
    previewContent.innerHTML = htmlContent;
    
    // 모달 표시
    const modal = new bootstrap.Modal(previewModal);
    modal.show();
} 