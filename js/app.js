// Supabase 클라이언트 초기화
const supabaseUrl = 'https://rxwztfdnragffxbmlscf.supabase.co';

// anon key 사용 (public key)
// 주의: 이 키는 브라우저에 노출되어도 안전한 anon/public 키여야 합니다
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4d3p0ZmRucmFnZmZ4Ym1sc2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NzU2MDgsImV4cCI6MjA1ODA1MTYwOH0.KN8cR6_xHHHfuF1odUi9WwzkbOHCmwuRaK0FYe7b0Ig';

// 전역 변수 정의
let currentEditingId = null; // 현재 편집 중인 법안 ID
let bills = []; // 법안 목록을 저장할 배열
let currentCommittee = '전체'; // 현재 선택된 상임위 추가
let billsData = [];

// 디버깅을 위한 코드
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key 길이:', supabaseAnonKey.length);

// 클라이언트 초기화 방법 변경
const supabaseClient = supabase ? supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

if (!supabaseClient) {
  console.error('Supabase 클라이언트를 초기화할 수 없습니다. supabase 객체가 존재하는지 확인하세요.');
}

/**
 * Supabase 연결을 테스트합니다.
 */
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

/**
 * 법안 제목 클릭 처리를 위한 함수
 */
async function handleBillClick(event) {
    event.preventDefault();
    
    // 클릭된 요소가 법안 제목인 경우
    if (event.target.classList.contains('bill-title') || event.target.closest('.bill-title')) {
        const target = event.target.classList.contains('bill-title') ? event.target : event.target.closest('.bill-title');
        const billId = target.dataset.id;
        console.log('법안 이름 클릭:', billId);
        
        // 법안명에 '분석'이 포함된 경우 분석 보고서 모달 표시
        const billName = target.textContent;
        if (billName.includes('분석')) {
            showAnalysisReport(billId, billName);
        } else {
            // 일반 법안인 경우 수정 모달 열기
            openEditModal(billId);
        }
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
    
    // 폼 탭 상태 초기화
    initTabState();
    
    // 세션 상태 확인
    checkSession();
    
    // 초기 데이터 로딩
    loadBills();
    
    // 상임위 필터링 이벤트 설정
    document.querySelectorAll('.committee-nav .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const committee = this.getAttribute('data-committee');
            if (committee === 'all') {
                filterBillsByCommittee(null);
            } else {
                filterBillsByCommittee(committee);
            }
        });
    });
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 상임위 탭 이벤트 리스너 설정
    setupCommitteeFilter();
    
    // 마크다운 프리뷰 버튼 이벤트 리스너
    document.getElementById('previewBtn').addEventListener('click', showMarkdownPreview);
});

// 폼 탭 상태 초기화
function initTabState() {
    // 활성화된 탭 확인
    const activeTab = document.querySelector('.nav-link.active');
    const htmlContent = document.getElementById('billContent');
    const markdownContent = document.getElementById('billMarkdownContent');
    
    if (!htmlContent || !markdownContent) {
        console.error('HTML 또는 마크다운 컨텐츠 요소를 찾을 수 없습니다.');
        return;
    }
    
    console.log('탭 상태 초기화 중...', activeTab ? activeTab.id : '없음');
    
    // 기본으로 HTML 탭이 활성화되어 있을 경우, markdown의 required를 제거
    if (!activeTab || activeTab.id === 'html-tab') {
        console.log('HTML 탭 활성화 상태로 초기화합니다.');
        markdownContent.removeAttribute('required');
        htmlContent.setAttribute('required', 'required');
    } 
    // 마크다운 탭이 활성화되어 있을 경우, HTML의 required를 제거
    else if (activeTab.id === 'markdown-tab') {
        console.log('마크다운 탭 활성화 상태로 초기화합니다.');
        htmlContent.removeAttribute('required');
        markdownContent.setAttribute('required', 'required');
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 법안 등록 폼 제출
    const billForm = document.getElementById('billForm');
    if (billForm) {
        billForm.addEventListener('submit', handleFormSubmit);
    }
    
    // 폼 제출 버튼
    const submitFormBtn = document.getElementById('submitFormBtn');
    if (submitFormBtn) {
        submitFormBtn.addEventListener('click', function() {
            handleFormSubmit({ preventDefault: () => {} });
        });
    }
    
    // 폼 취소 버튼
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', function() {
            resetForm();
        });
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
    setupTabEventListeners();
}

// 탭 전환 이벤트 리스너
function setupTabEventListeners() {
    const htmlTab = document.getElementById('htmlTab');
    const markdownTab = document.getElementById('markdownTab');
    
    htmlTab.addEventListener('click', function() {
        // 마크다운 -> HTML 변환
        const markdownContent = document.getElementById('markdownContent');
        if (markdownContent && markdownContent.value.trim() !== '') {
            const htmlContent = convertMarkdownToHtml(markdownContent.value);
            tinymce.get('billContent').setContent(htmlContent);
        }
        // required 속성 관리
        document.getElementById('billContent').setAttribute('required', '');
        document.getElementById('markdownContent').removeAttribute('required');
    });
    
    markdownTab.addEventListener('click', function() {
        // HTML -> 마크다운 변환
        const htmlContent = tinymce.get('billContent').getContent();
        const markdownContent = convertHtmlToMarkdown(htmlContent);
        document.getElementById('markdownContent').value = markdownContent;
        // required 속성 관리
        document.getElementById('markdownContent').setAttribute('required', '');
        document.getElementById('billContent').removeAttribute('required');
    });
}

// HTML을 마크다운으로 변환하는 함수
function convertHtmlToMarkdown(html) {
    console.log('HTML 변환 시작:', html.substring(0, 30) + '...');
    
    try {
        // turndown 라이브러리가 로드됐는지 확인
        if (typeof TurndownService === 'undefined') {
            console.warn('TurndownService 라이브러리가 로드되지 않았습니다. 기본 변환을 사용합니다.');
            return html;
        }
        
        const turndownService = new TurndownService({
            headingStyle: 'atx',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced'
        });
        
        const markdown = turndownService.turndown(html);
        console.log('HTML 변환 완료');
        return markdown;
    } catch (error) {
        console.error('HTML 변환 중 오류:', error);
        return html;
    }
}

// 법안 목록 로드
async function loadBills() {
    try {
        console.log("법안 목록을 로드합니다...");
        let query = supabaseClient.from('bill').select('*').order('created_at', { ascending: false });
        
        // 상임위 필터 적용
        if (currentCommittee && currentCommittee !== '전체') {
            query = query.eq('committee', currentCommittee);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error("법안 로딩 중 오류 발생:", error);
            return;
        }
        
        console.log("로드된 법안:", data);
        bills = data || [];
        renderBillList(bills);
    } catch (error) {
        console.error("법안 로딩 중 예외 발생:", error);
    }
}

// 법안 목록 렌더링
function renderBillList(bills) {
    const billTableBody = document.getElementById('billTableBody');
    billTableBody.innerHTML = '';
    
    if (bills.length === 0) {
        billTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-3">등록된 보고서가 없습니다.</td></tr>`;
        return;
    }
    
    bills.forEach(bill => {
        // 날짜 형식 변경: YYYY-MM-DD
        const formattedDate = new Date(bill.created_at).toISOString().split('T')[0];
        
        // 위원회와 담당자에 기본값 설정
        const committee = bill.committee || '미지정';
        const writer = bill.writer || '미지정';
        
        // 관리자 여부 확인을 위한 변수
        const isAdmin = checkIfAdmin();
        
        // 모바일 친화적인 테이블 행 생성
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="bill-title fw-medium" data-id="${bill.id}">${bill.bill_name}</span>
                <div class="d-block d-md-none small text-muted mt-1">
                    <span class="me-2"><i class="bi bi-folder2"></i> ${committee}</span>
                    <span class="me-2"><i class="bi bi-person"></i> ${writer}</span>
                    <span><i class="bi bi-calendar3"></i> ${formattedDate}</span>
                </div>
            </td>
            <td class="d-none d-md-table-cell">${committee}</td>
            <td class="d-none d-md-table-cell">${writer}</td>
            <td class="d-none d-md-table-cell">${formattedDate}</td>
            <td class="text-end">
                <div class="btn-group btn-group-sm">
                    ${isAdmin ? `
                        <button class="btn btn-outline-primary edit-btn" data-id="${bill.id}">
                            <i class="bi bi-pencil"></i><span class="d-none d-sm-inline"> 수정</span>
                        </button>
                        <button class="btn btn-outline-danger delete-btn" data-id="${bill.id}">
                            <i class="bi bi-trash"></i><span class="d-none d-sm-inline"> 삭제</span>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        billTableBody.appendChild(row);
    });
    
    // 법안명 클릭 이벤트 리스너 추가
    document.querySelectorAll('.bill-title').forEach(title => {
        title.addEventListener('click', function() {
            viewBillDetails(this.dataset.id);
        });
    });
    
    // 수정 버튼 이벤트 리스너 추가 (관리자용)
    if (document.querySelectorAll('.edit-btn').length > 0) {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function() {
                editBill(this.dataset.id);
            });
        });
    }
    
    // 삭제 버튼 이벤트 리스너 추가 (관리자용)
    if (document.querySelectorAll('.delete-btn').length > 0) {
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                deleteBill(this.dataset.id);
            });
        });
    }
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
        
        // 날짜 형식을 YYYY-MM-DD로 변경
        const createdDate = new Date(bill.created_at);
        const year = createdDate.getFullYear();
        const month = String(createdDate.getMonth() + 1).padStart(2, '0');
        const day = String(createdDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        document.getElementById('billDetailDate').textContent = formattedDate;
        
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

// 법안 수정 모달 열기
async function openEditModal(id) {
    console.log(`법안 ID ${id} 수정 시작`);
    currentEditingId = id;
    
    try {
        // 해당 법안 데이터 가져오기
        const { data, error } = await supabaseClient
            .from('bill')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;
        if (!data) {
            alert('법안 정보를 찾을 수 없습니다.');
            return;
        }
        
        console.log('수정할 법안 데이터:', data);
        
        // 폼에 데이터 채우기
        const form = document.getElementById('billForm');
        document.getElementById('billTitle').value = data.bill_name || '';
        document.getElementById('billProposer').value = data.writer || '';
        document.getElementById('billCommittee').value = data.committee || '';
        
        // 에디터에 콘텐츠 설정
        const htmlContent = data.description || '';
        document.getElementById('billContent').value = htmlContent;
        
        // 마크다운 에디터에도 변환하여 설정
        const markdownContent = convertHtmlToMarkdown(htmlContent);
        document.getElementById('billMarkdownContent').value = markdownContent;
        
        // 저장 버튼 텍스트 변경
        const saveBtn = document.getElementById('submitFormBtn');
        if (saveBtn) saveBtn.textContent = '수정';
        
        // 폼 컨테이너 표시
        const formContainer = document.getElementById('formContainer');
        if (formContainer) {
            const bsCollapse = new bootstrap.Collapse(formContainer);
            bsCollapse.show();
        }
        
        // 스크롤하여 폼 표시
        formContainer.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('법안 수정 준비 중 오류:', error);
        alert('법안 정보를 불러오는 중 오류가 발생했습니다.');
    }
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
        
        // 현재 편집 중인 ID 저장
        currentEditingId = billId;
        
        // 폼에 데이터 채우기
        const form = document.getElementById('billForm');
        if (!form) return;
        
        form.elements['billTitle'].value = bill.bill_name;
        form.elements['billProposer'].value = bill.writer;
        form.elements['billContent'].value = bill.description || '';
        
        // 상임위 선택
        if (form.elements['billCommittee']) {
            form.elements['billCommittee'].value = bill.committee || '';
        }
        
        // 마크다운 필드 채우기
        const markdownField = form.elements['billMarkdownContent'];
        if (markdownField) {
            // description_markdown이 있으면 그것을 사용
            if (bill.description_markdown) {
                console.log('마크다운 원본 데이터 사용:', bill.description_markdown.substring(0, 30) + '...');
                markdownField.value = bill.description_markdown;
            } 
            // 없으면 HTML을 마크다운으로 변환
            else if (bill.description) {
                console.log('HTML을 마크다운으로 변환:', bill.description.substring(0, 30) + '...');
                markdownField.value = convertHtmlToMarkdown(bill.description);
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
        
        // 새 제출 버튼 텍스트 변경
        const newSubmitBtn = document.getElementById('submitFormBtn');
        if (newSubmitBtn) {
            newSubmitBtn.textContent = '수정';
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

/**
 * 폼 제출 처리
 */
function handleFormSubmit(event) {
    event.preventDefault();
    console.log('폼 제출 처리 시작');
    
    // 필수 필드 검증
    const billTitle = document.getElementById('billTitle').value.trim();
    const billProposer = document.getElementById('billProposer').value.trim();
    
    if (!billTitle) {
        alert('법안 제목을 입력해주세요.');
        document.getElementById('billTitle').focus();
        return;
    }
    
    if (!billProposer) {
        alert('발의자를 입력해주세요.');
        document.getElementById('billProposer').focus();
        return;
    }
    
    // 현재 활성화된 탭 확인 (마크다운 또는 HTML)
    const mdTab = document.getElementById('markdown-tab');
    const htmlTab = document.getElementById('html-tab');
    const isMarkdownTabActive = mdTab && mdTab.classList.contains('active');
    const isHtmlTabActive = htmlTab && htmlTab.classList.contains('active');
    
    console.log('활성 탭 상태:', { 마크다운: isMarkdownTabActive, HTML: isHtmlTabActive });
    
    // 법안 데이터 객체 초기화
    const billData = {
        bill_name: billTitle,
        writer: billProposer,
        committee: document.getElementById('billCommittee').value,
        created_at: new Date().toISOString()
    };
    
    if (isMarkdownTabActive) {
        // 마크다운 탭이 활성화된 경우
        const markdownContent = document.getElementById('billMarkdownContent').value;
        console.log('마크다운 입력 내용 길이:', markdownContent ? markdownContent.length : 0);
        
        // 마크다운 원본 저장
        billData.description_markdown = markdownContent;
        
        // HTML로 변환하여 description에도 저장
        billData.description = convertMarkdownToHtml(markdownContent);
    } else {
        // HTML 탭이 활성화된 경우 (기본값)
        billData.description = document.getElementById('billContent').value;
        console.log('HTML 입력 내용 길이:', billData.description ? billData.description.length : 0);
    }
    
    // 콘텐츠 로깅
    console.log('저장할 데이터:', billData);
    
    // 기존 데이터 수정 또는 새 데이터 추가
    if (currentEditingId) {
        updateBill(currentEditingId, billData);
    } else {
        saveBill(billData);
    }
    
    // 폼 초기화
    document.getElementById('billForm').reset();
    
    document.getElementById('submitFormBtn').textContent = '저장';
    currentEditingId = null;
    
    // 폼 영역 닫기
    const formContainer = document.getElementById('formContainer');
    if (formContainer) {
        const bsCollapse = new bootstrap.Collapse(formContainer);
        bsCollapse.hide();
    }
    
    return false;
}

/**
 * 현재 사용자가 관리자인지 확인합니다.
 */
function checkIfAdmin() {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return false;
    
    // 로그인 버튼이 '로그아웃'으로 표시되어 있으면 관리자로 판단
    return loginBtn.textContent.includes('로그아웃');
}

// 마크다운을 HTML로 변환하는 함수
function convertMarkdownToHtml(markdown) {
    console.log('마크다운 변환 시작:', markdown.substring(0, 30) + '...');
    
    try {
        // marked.js 라이브러리가 로드됐는지 확인
        if (typeof marked === 'undefined') {
            console.warn('marked 라이브러리가 로드되지 않았습니다. 기본 변환을 사용합니다.');
            return `<p>${markdown}</p>`;
        }
        
        // marked 옵션 설정
        marked.setOptions({
            breaks: true,        // 줄바꿈 허용
            gfm: true,           // GitHub 플레이버드 마크다운 사용
            headerIds: true,     // 헤더에 ID 추가
            sanitize: false      // HTML 태그 허용
        });
        
        // 마크다운을 HTML로 변환
        const html = marked.parse(markdown);
        console.log('마크다운 변환 완료');
        return html;
    } catch (error) {
        console.error('마크다운 변환 중 오류:', error);
        return `<p>${markdown}</p>`;
    }
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
        const editButtons = document.querySelectorAll('.edit-btn');
        const deleteButtons = document.querySelectorAll('.delete-btn');
        
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

// 마크다운 프리뷰 표시
function showMarkdownPreview() {
    console.log('마크다운 프리뷰 시작');
    
    // 현재 활성화된 탭 확인
    const isMarkdownTabActive = document.getElementById('markdownTab').classList.contains('active');
    const markdownTextarea = document.getElementById('markdownContent');
    
    // 마크다운 내용 가져오기
    let markdownText = '';
    if (isMarkdownTabActive && markdownTextarea) {
        markdownText = markdownTextarea.value.trim();
    } else {
        // HTML 탭이 활성화된 경우 HTML을 마크다운으로 변환
        const htmlContent = tinymce.get('billContent').getContent();
        markdownText = convertHtmlToMarkdown(htmlContent);
    }
    
    if (!markdownText) {
        alert('프리뷰할 내용이 없습니다.');
        return;
    }
    
    // 마크다운을 HTML로 변환
    const htmlContent = convertMarkdownToHtml(markdownText);
    
    // 모달 생성
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'markdownPreviewModal';
    modal.tabIndex = '-1';
    modal.setAttribute('aria-labelledby', 'markdownPreviewModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="markdownPreviewModalLabel">마크다운 프리뷰</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <iframe id="previewFrame" style="width: 100%; height: 500px; border: none;"></iframe>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 모달 표시
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    
    // iframe에 내용 로드
    const iframe = document.getElementById('previewFrame');
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    
    iframeDocument.open();
    iframeDocument.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>마크다운 프리뷰</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body {
                    padding: 20px;
                    font-family: sans-serif;
                    line-height: 1.6;
                }
                img {
                    max-width: 100%;
                }
                pre {
                    background-color: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin-bottom: 1rem;
                }
                table, th, td {
                    border: 1px solid #dee2e6;
                }
                th, td {
                    padding: 8px;
                    text-align: left;
                }
                blockquote {
                    border-left: 4px solid #ced4da;
                    padding-left: 15px;
                    color: #6a737d;
                    margin-left: 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                ${htmlContent}
            </div>
        </body>
        </html>
    `);
    iframeDocument.close();
    
    // 모달이 닫힐 때 모달 요소 제거
    modal.addEventListener('hidden.bs.modal', function() {
        modal.remove();
    });
}

// 상임위 필터링 함수 추가
function filterBillsByCommittee(committee) {
    currentCommittee = committee;
    
    // 모든 상임위 링크의 active 클래스 제거
    document.querySelectorAll('.committee-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // 선택된 상임위 링크에 active 클래스 추가
    if (committee) {
        document.querySelector(`.committee-nav .nav-link[data-committee="${committee}"]`).classList.add('active');
        renderBillList(bills.filter(bill => bill.committee === committee));
    } else {
        document.querySelector('.committee-nav .nav-link[data-committee="all"]').classList.add('active');
        renderBillList(bills);
    }
}

// 상임위 필터 설정 함수
function setupCommitteeFilter() {
    const committeeLinks = document.querySelectorAll('.committee-nav .nav-link');
    
    committeeLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 기존 active 클래스 제거
            committeeLinks.forEach(l => l.classList.remove('active'));
            
            // 현재 클릭된 링크에 active 클래스 추가
            this.classList.add('active');
            
            // 현재 선택된 상임위 저장
            currentCommittee = this.getAttribute('data-committee');
        });
    });
}

// 빌 저장 함수
async function saveBill(billData) {
    try {
        // 생성 시간 추가
        billData.created_at = new Date().toISOString();
        
        // 저장 버튼 비활성화
        const submitBtn = document.getElementById('submitFormBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '저장 중...';
        }

        // 새 법안 등록
        const result = await supabaseClient
            .from('bill')
            .insert([billData]);
            
        if (result.error) throw result.error;
        console.log('새 법안 저장 완료:', result);
        alert('새 법안이 등록되었습니다.');
        
        // 폼 리셋 및 법안 목록 새로고침
        resetForm();
        loadBills();
        
        // 폼 컨테이너 닫기
        const formContainer = document.getElementById('formContainer');
        if (formContainer) {
            const bsCollapse = new bootstrap.Collapse(formContainer);
            bsCollapse.hide();
        }
    } catch (error) {
        console.error('법안 저장 중 오류:', error);
        alert('법안 저장 중 오류가 발생했습니다.');
    } finally {
        // 저장 버튼 다시 활성화
        const submitBtn = document.getElementById('submitFormBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '등록';
        }
    }
}

// 빌 업데이트 함수
async function updateBill(id, billData) {
    try {
        // 저장 버튼 비활성화
        const submitBtn = document.getElementById('submitFormBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '수정 중...';
        }

        // 기존 법안 수정
        const result = await supabaseClient
            .from('bill')
            .update(billData)
            .eq('id', id);
            
        if (result.error) throw result.error;
        console.log('법안 수정 완료:', result);
        alert('법안이 수정되었습니다.');
        
        // 폼 리셋 및 법안 목록 새로고침
        resetForm();
        loadBills();
        
        // 폼 컨테이너 닫기
        const formContainer = document.getElementById('formContainer');
        if (formContainer) {
            const bsCollapse = new bootstrap.Collapse(formContainer);
            bsCollapse.hide();
        }
    } catch (error) {
        console.error('법안 수정 중 오류:', error);
        alert('법안 수정 중 오류가 발생했습니다.');
    } finally {
        // 저장 버튼 다시 활성화
        const submitBtn = document.getElementById('submitFormBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '수정';
        }
    }
}

// 폼 초기화
function resetForm() {
    console.log('폼 초기화');
    document.getElementById('billForm').reset();
    
    // TinyMCE 에디터 내용 초기화
    if (typeof tinymce !== 'undefined' && tinymce.get('billContent')) {
        try {
            tinymce.get('billContent').setContent('');
        } catch (error) {
            console.error('TinyMCE 에디터 초기화 오류:', error);
        }
    }
    
    // 마크다운 에디터 초기화
    document.getElementById('billMarkdown').value = '';
    
    // 편집 모드 초기화
    currentEditingId = null;
    
    // 저장 버튼 텍스트 복원
    const saveBtn = document.getElementById('submitFormBtn');
    if (saveBtn) saveBtn.textContent = '등록';
}

// 추가 스타일 적용
document.head.insertAdjacentHTML('beforeend', `
<style>
    .cursor-pointer {
        cursor: pointer;
    }
    .bill-title {
        cursor: pointer;
        display: block;
        color: #0d6efd;
    }
    .bill-title:hover {
        text-decoration: underline;
    }
    .badge {
        font-weight: normal;
    }
    .table td {
        vertical-align: middle;
    }
    @media (max-width: 767.98px) {
        .table thead th {
            border-bottom-width: 1px;
        }
        .table-responsive {
            margin-bottom: 0.5rem;
        }
        .table td {
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
        }
        .bill-title {
            font-size: 1.05rem;
        }
    }
</style>
`);

// 문서 전체 클릭 이벤트 리스너
document.addEventListener('click', e => {
    // 수정 버튼 클릭 시 처리
    if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
        const target = e.target.classList.contains('edit-btn') ? e.target : e.target.closest('.edit-btn');
        const billId = target.dataset.id;
        console.log('수정 버튼 클릭됨, ID:', billId);
        editBill(billId);
        e.stopPropagation();
        return;
    }
    
    // 삭제 버튼 클릭 시 처리
    if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
        const target = e.target.classList.contains('delete-btn') ? e.target : e.target.closest('.delete-btn');
        const billId = target.dataset.id;
        deleteBill(billId);
    }
});

// 법안 제목 클릭 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', function() {
    document.body.addEventListener('click', function(e) {
        // bill-title 클릭 시 처리
        if (e.target.classList.contains('bill-title') || e.target.closest('.bill-title')) {
            handleBillClick(e);
            e.stopPropagation(); // 이벤트 전파 중지
        }
    });
});

/**
 * 새 법안을 생성합니다.
 */
async function createBill(billData) {
    try {
        // 저장 버튼 비활성화
        const submitBtn = document.getElementById('submitFormBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '저장 중...';
        }
        
        // 법안 데이터 저장
        const { data, error } = await supabaseClient
            .from('bill')
            .insert([billData]);
            
        if (error) throw error;
        
        console.log('새 법안 저장 완료:', data);
        showAlert('법안이 성공적으로 등록되었습니다.', 'success');
        
        // 법안 목록 새로고침
        loadBills();
    } catch (error) {
        console.error('법안 저장 오류:', error);
        showAlert('법안 저장 중 오류가 발생했습니다.', 'danger');
    } finally {
        // 저장 버튼 다시 활성화
        const submitBtn = document.getElementById('submitFormBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '저장';
        }
    }
} 