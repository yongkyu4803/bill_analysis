// Supabase 클라이언트 초기화
const supabaseUrl = 'https://rxwztfdnragffxbmlscf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4d3p0ZmRucmFnZmZ4Ym1sc2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NzU2MDgsImV4cCI6MjA1ODA1MTYwOH0.KN8cR6_xHHHfuF1odUi9WwzkbOHCmwuRaK0FYe7b0Ig';

// 디버깅을 위한 코드
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key 길이:', supabaseAnonKey.length);

// 클라이언트 초기화
const supabaseClient = supabase ? supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

if (!supabaseClient) {
  console.error('Supabase 클라이언트를 초기화할 수 없습니다. supabase 객체가 존재하는지 확인하세요.');
}

// 전역 변수 정의
let bills = []; // 법안 목록을 저장할 배열
let currentCommittee = '전체'; // 현재 선택된 상임위

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
    // 단순한 쿼리로 연결 테스트
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

// 초기화 함수
document.addEventListener('DOMContentLoaded', async function() {
    // 모달 템플릿 로드
    loadModalTemplates();
    
    // Supabase 연결 테스트
    const isConnected = await testSupabaseConnection();
    
    if (!isConnected) {
        const billTableBody = document.getElementById('billTableBody');
        if (billTableBody) {
            billTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-3">Supabase 연결에 실패했습니다. 콘솔을 확인하세요.</td></tr>';
        }
        return;
    }
    
    // 초기 데이터 로딩
    loadBills();
    
    // 이벤트 리스너 설정
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
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
        
        if (!bills || bills.length === 0) {
            const billTableBody = document.getElementById('billTableBody');
            billTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-3">검색 결과가 없습니다.</td></tr>';
            return;
        }
        
        renderBillList(bills);
    } catch (error) {
        console.error('법안 검색 오류:', error);
        showAlert('검색 중 오류가 발생했습니다.', 'danger');
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
        billTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-3">등록된 보고서가 없습니다.</td></tr>`;
        return;
    }
    
    bills.forEach(bill => {
        // 날짜 형식 변경: YYYY-MM-DD
        const formattedDate = new Date(bill.created_at).toISOString().split('T')[0];
        
        // 위원회와 담당자에 기본값 설정
        const committee = bill.committee || '미지정';
        const writer = bill.writer || '미지정';
        
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
        `;
        billTableBody.appendChild(row);
    });
    
    // 법안명 클릭 이벤트 리스너 추가
    document.querySelectorAll('.bill-title').forEach(title => {
        title.addEventListener('click', function() {
            viewBillDetails(this.dataset.id);
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
        
        // 모달 생성
        createBillDetailModal(bill);
        
    } catch (error) {
        console.error('법안 상세 정보 조회 오류:', error);
        showAlert('법안 정보를 불러오는 중 오류가 발생했습니다.', 'danger');
    }
}

// 법안 상세 모달 생성
function createBillDetailModal(bill) {
    // 날짜 형식을 YYYY-MM-DD로 변경
    const createdDate = new Date(bill.created_at);
    const formattedDate = createdDate.toISOString().split('T')[0];
    
    // 기존 모달이 있다면 제거
    const existingModal = document.getElementById('billDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 모달 HTML 생성
    const modalHTML = `
    <div class="modal fade" id="billDetailModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${bill.bill_name}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <strong>위원회:</strong> 
                            <span class="badge bg-light text-dark border">${bill.committee || '미지정'}</span>
                        </div>
                        <div class="col-md-4">
                            <strong>담당자:</strong> ${bill.writer || '미지정'}
                        </div>
                        <div class="col-md-4">
                            <strong>등록일:</strong> ${formattedDate}
                        </div>
                    </div>
                    <hr>
                    <div class="bill-content mt-3">
                        ${bill.description ? renderBillContent(bill.description) : '<p class="text-muted">내용이 없습니다.</p>'}
                    </div>
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
    
    // 모달 표시
    const modal = new bootstrap.Modal(document.getElementById('billDetailModal'));
    modal.show();
}

// 법안 내용 렌더링 (HTML 또는 일반 텍스트)
function renderBillContent(content) {
    if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
        return `<iframe id="htmlContentFrame" style="width:100%; height:500px; border:none;"></iframe>
                <script>
                    setTimeout(() => {
                        const iframe = document.getElementById('htmlContentFrame');
                        if (iframe) {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            iframeDoc.open();
                            iframeDoc.write(\`${content.replace(/`/g, '\\`')}\`);
                            iframeDoc.close();
                        }
                    }, 100);
                </script>`;
    } else {
        return `<div class="p-3 bg-light rounded">${content}</div>`;
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

// 모달 템플릿 로드 함수
async function loadModalTemplates() {
    try {
        // 모달 템플릿 로드
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) return;
        
        // 기본 템플릿 추가
        modalContainer.innerHTML = `
            <!-- 법안 상세 모달은 동적으로 생성됩니다 -->
        `;
        
        console.log('모달 템플릿이 준비되었습니다.');
    } catch (error) {
        console.error('모달 템플릿 준비 오류:', error);
    }
}

// 알림 메시지 표시
function showAlert(message, type = 'info') {
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

// 추가 스타일 적용
document.head.insertAdjacentHTML('beforeend', `
<style>
    .bill-title {
        cursor: pointer;
        color: #0d6efd;
        font-weight: 500;
    }
    .bill-title:hover {
        text-decoration: underline;
    }
    .table td {
        vertical-align: middle;
    }
    @media (max-width: 767.98px) {
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