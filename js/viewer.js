// Supabase 클라이언트 초기화
const supabaseUrl = 'https://rxwztfdnragffxbmlscf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4d3p0ZmRucmFnZmZ4Ym1sc2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NzU2MDgsImV4cCI6MjA1ODA1MTYwOH0.KN8cR6_xHHHfuF1odUi9WwzkbOHCmwuRaK0FYe7b0Ig';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 전역 변수 선언
let bills = [];

// Supabase 연결 테스트 함수
async function testSupabaseConnection() {
  try {
    console.log('Supabase 연결 테스트 중...');
    const { data, error } = await supabaseClient
      .from('bill')
      .select('id', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('Supabase 연결 오류:', error);
      showAlert('danger', '서버 연결에 실패했습니다. 새로고침 후 다시 시도해주세요.');
      return false;
    }
    
    console.log('Supabase 연결 성공:', data);
    return true;
  } catch (error) {
    console.error('Supabase 연결 요청 오류:', error);
    showAlert('danger', '서버 연결에 실패했습니다. 새로고침 후 다시 시도해주세요.');
    return false;
  }
}

// 페이지 로드 시 실행되는 초기화 함수
document.addEventListener('DOMContentLoaded', async function() {
  // 모달 템플릿 로드
  loadModalTemplates();
  
  // Supabase 연결 테스트
  const isConnected = await testSupabaseConnection();
  if (!isConnected) return;
  
  // 법안 목록 로드
  await loadBills();
  
  // 통계 업데이트
  updateStatistics();
  
  // 이벤트 리스너 등록
  setupEventListeners();
});

// 모달 템플릿 로드 함수
function loadModalTemplates() {
  const modalContainer = document.getElementById('modalContainer');
  
  // 상세 보기 모달 템플릿
  const viewModalTemplate = `
    <div class="modal fade" id="viewBillModal" tabindex="-1" aria-labelledby="viewBillModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="viewBillModalLabel">법안 상세 보기</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="bill-details">
              <h3 id="billTitleDisplay" class="mb-3"></h3>
              <div class="mb-3">
                <div class="row">
                  <div class="col-md-6">
                    <p><strong>담당자:</strong> <span id="billProposerDisplay"></span></p>
                  </div>
                  <div class="col-md-6">
                    <p><strong>위원회:</strong> <span id="billCommitteeDisplay"></span></p>
                  </div>
                </div>
                <p><strong>등록일:</strong> <span id="billDateDisplay"></span></p>
              </div>
              <div id="billContentDisplay" class="border rounded p-3 bg-light overflow-auto" style="height: 500px;">
                <!-- 내용이 여기에 동적으로 표시됩니다 -->
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 법안 분석 보고서 모달 템플릿
  const analysisModalTemplate = `
    <div class="modal fade" id="analysisReportModal" tabindex="-1" aria-labelledby="analysisReportModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="analysisReportModalLabel">법안 분석 보고서</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="card mb-3">
              <div class="card-header bg-light">
                <h6 class="mb-0">기본 정보</h6>
              </div>
              <div class="card-body">
                <div class="row mb-3">
                  <div class="col-md-6">
                    <p><strong>법안명:</strong> <span id="analysisReportTitle"></span></p>
                    <p><strong>담당자:</strong> <span id="analysisReportProposer"></span></p>
                  </div>
                  <div class="col-md-6">
                    <p><strong>위원회:</strong> <span id="analysisReportCommittee"></span></p>
                    <p><strong>등록일:</strong> <span id="analysisReportDate"></span></p>
                  </div>
                </div>
              </div>
            </div>
            <div class="card">
              <div class="card-header bg-light">
                <h6 class="mb-0">분석 보고서 내용</h6>
              </div>
              <div class="card-body">
                <div id="analysisReportContent" class="overflow-auto" style="height: 600px;">
                  <!-- 내용이 여기에 동적으로 표시됩니다 -->
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 모달 템플릿을 컨테이너에 추가
  modalContainer.innerHTML = viewModalTemplate + analysisModalTemplate;
}

// 법안 목록 로드 함수
async function loadBills() {
  try {
    const { data, error } = await supabaseClient
      .from('bill')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('법안 목록 로드 오류:', error);
      showAlert('danger', '법안 목록을 불러오는데 실패했습니다.');
      return;
    }
    
    bills = data;
    renderBillList(data);
    renderRecentBills(data.slice(0, 5)); // 최근 5개 법안만 표시
    
  } catch (error) {
    console.error('법안 목록 로드 중 예외 발생:', error);
    showAlert('danger', '법안 목록을 불러오는데 실패했습니다.');
  }
}

// 법안 목록 렌더링 함수
function renderBillList(billsData) {
  const tableBody = document.getElementById('billTableBody');
  tableBody.innerHTML = '';
  
  if (billsData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-3">등록된 법안이 없습니다.</td>
      </tr>
    `;
    return;
  }
  
  billsData.forEach((bill) => {
    const row = document.createElement('tr');
    row.className = 'align-middle py-2';
    
    // 위원회 셀
    const committeeCell = document.createElement('td');
    committeeCell.style.paddingLeft = '16px';
    committeeCell.innerHTML = `<span class="badge bg-secondary">${bill.committee || '-'}</span>`;
    
    // 법안명 셀
    const nameCell = document.createElement('td');
    nameCell.style.paddingTop = '0.4rem';
    nameCell.style.paddingBottom = '0.4rem';
    nameCell.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <span class="bill-title fw-bold text-primary fs-6">${bill.bill_name}</span>
        <small class="text-muted ms-2 d-md-none">${formatDate(bill.created_at, true)}</small>
      </div>
      <div class="d-block d-md-none small mt-1">
        <div class="d-flex align-items-center">
          <span class="badge bg-secondary me-1">${bill.committee || '-'}</span>
          <small class="text-muted">${bill.writer || '-'}</small>
        </div>
      </div>
    `;
    
    // 담당자 셀
    const proposerCell = document.createElement('td');
    proposerCell.className = 'd-none d-md-table-cell text-muted';
    proposerCell.textContent = bill.writer || '-';
    
    // 날짜 셀
    const dateCell = document.createElement('td');
    dateCell.className = 'd-none d-md-table-cell text-muted';
    dateCell.style.paddingRight = '16px';
    dateCell.textContent = formatDate(bill.created_at, true); // 날짜만 표시
    
    row.appendChild(committeeCell);
    row.appendChild(nameCell);
    row.appendChild(proposerCell);
    row.appendChild(dateCell);
    
    tableBody.appendChild(row);
  });
}

// 최근 법안 목록 렌더링 함수
function renderRecentBills(recentBills) {
  const recentBillsList = document.getElementById('recentBillsList');
  recentBillsList.innerHTML = '';
  
  if (recentBills.length === 0) {
    recentBillsList.innerHTML = `
      <li class="list-group-item">
        <p class="text-center py-1 mb-0 small">최근 등록된 법안이 없습니다.</p>
      </li>
    `;
    return;
  }
  
  recentBills.forEach(bill => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item border-0 border-bottom py-2';
    listItem.innerHTML = `
      <a href="#" class="text-decoration-none recent-bill-link" data-bill-id="${bill.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <span class="d-block text-truncate fw-medium text-dark fs-6" style="max-width: 230px;">${bill.bill_name}</span>
            <div class="d-flex align-items-center mt-1 small">
              <span class="badge bg-secondary me-1">${bill.committee || '-'}</span>
              <small class="text-muted">${bill.writer || '-'}</small>
            </div>
          </div>
          <small class="text-muted ms-1">${formatDate(bill.created_at, true)}</small>
        </div>
      </a>
    `;
    recentBillsList.appendChild(listItem);
  });
}

// 통계 업데이트 함수
function updateStatistics() {
  // 전체 법안 수 업데이트
  const totalBillCount = document.getElementById('totalBillCount');
  totalBillCount.textContent = bills.length;
  
  // 위원회별 법안 수 집계
  const committeeCount = document.getElementById('committeeCount');
  const committees = {};
  
  bills.forEach(bill => {
    if (bill.committee) {
      committees[bill.committee] = (committees[bill.committee] || 0) + 1;
    }
  });
  
  const uniqueCommitteeCount = Object.keys(committees).length;
  committeeCount.textContent = uniqueCommitteeCount;
  
  // 차트 영역 업데이트
  const chartContainer = document.getElementById('committeeChart');
  if (uniqueCommitteeCount > 0) {
    let chartHTML = '<div class="mt-3 small">';
    
    // 각 위원회별 건수 표시
    Object.entries(committees).forEach(([committee, count]) => {
      const percentage = Math.round((count / bills.length) * 100);
      chartHTML += `
        <div class="mb-2">
          <div class="d-flex justify-content-between mb-1">
            <span>${committee}</span>
            <span class="text-primary">${count}건 (${percentage}%)</span>
          </div>
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-primary" role="progressbar" style="width: ${percentage}%" 
                 aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </div>
      `;
    });
    
    chartHTML += '</div>';
    chartContainer.innerHTML = chartHTML;
  } else {
    chartContainer.innerHTML = '';
  }
}

// 이벤트 리스너 설정 함수
function setupEventListeners() {
  // 법안 제목 클릭 이벤트
  document.addEventListener('click', function(event) {
    if (event.target.closest('.bill-title')) {
      const row = event.target.closest('tr');
      const index = Array.from(row.parentNode.children).indexOf(row);
      viewBillDetails(bills[index]);
    }
    
    // 최근 법안 클릭 이벤트
    if (event.target.closest('.recent-bill-link')) {
      event.preventDefault();
      const billId = event.target.closest('.recent-bill-link').dataset.billId;
      const bill = bills.find(b => b.id == billId);
      if (bill) {
        viewBillDetails(bill);
      }
    }
  });
  
  // 검색 버튼 클릭 이벤트
  document.getElementById('searchBtn').addEventListener('click', function() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (searchTerm === '') {
      renderBillList(bills);
      return;
    }
    
    const filteredBills = bills.filter(bill => 
      bill.bill_name.toLowerCase().includes(searchTerm) || 
      (bill.writer && bill.writer.toLowerCase().includes(searchTerm)) ||
      (bill.committee && bill.committee.toLowerCase().includes(searchTerm))
    );
    
    renderBillList(filteredBills);
  });
  
  // 검색창 엔터 키 이벤트
  document.getElementById('searchInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      document.getElementById('searchBtn').click();
    }
  });
}

// HTML 안전하게 처리하는 함수
function sanitizeHtml(html) {
  // 기본적인 살균 처리 (실제 프로덕션에서는 더 견고한 라이브러리 사용 권장)
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')  // 스크립트 태그 제거
    .replace(/javascript\s*:/gi, '')  // 자바스크립트 프로토콜 제거
    .replace(/on\w+\s*=/gi, '')  // 온로드 등 이벤트 핸들러 제거
    .replace(/style\s*=\s*"[^"]*"/gi, function(match) {
      // 스타일 속성에서 위험한 것 제거
      return match.replace(/expression|url\s*\(/gi, '');
    });
}

// 법안 상세 보기 함수
async function viewBillDetails(bill) {
  console.log('법안 상세 보기:', bill);
  
  // 분석 보고서인 경우 분석 보고서 모달 표시
  if (bill.bill_name.includes('분석')) {
    showAnalysisReport(bill);
    return;
  }
  
  // 일반 법안인 경우 상세 보기 모달 표시
  const modal = new bootstrap.Modal(document.getElementById('viewBillModal'));
  
  // 모달 내용 채우기
  document.getElementById('billTitleDisplay').textContent = bill.bill_name;
  document.getElementById('billProposerDisplay').textContent = bill.writer || '-';
  document.getElementById('billCommitteeDisplay').textContent = bill.committee || '-';
  document.getElementById('billDateDisplay').textContent = formatDate(bill.created_at);
  
  // 내용 표시 - iframe 대신 직접 표시
  const contentDisplay = document.getElementById('billContentDisplay');
  contentDisplay.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">내용을 불러오는 중...</p></div>';
  
  // 모달 표시
  modal.show();
  
  // 내용을 별도로 처리하여 모달 표시 후 로드
  setTimeout(() => {
    try {
      if (bill.description && bill.description.trim() !== '') {
        contentDisplay.innerHTML = sanitizeHtml(bill.description);
      } else {
        contentDisplay.innerHTML = '<div class="p-3">내용이 없습니다.</div>';
      }
    } catch (e) {
      console.error('내용 표시 오류:', e);
      contentDisplay.innerHTML = '<div class="alert alert-warning">내용을 표시하는 중 오류가 발생했습니다.</div>';
    }
  }, 300);
}

// 분석 보고서 모달 표시 함수
function showAnalysisReport(bill) {
  const modal = new bootstrap.Modal(document.getElementById('analysisReportModal'));
  
  // 모달 내용 채우기
  document.getElementById('analysisReportTitle').textContent = bill.bill_name;
  document.getElementById('analysisReportProposer').textContent = bill.writer || '-';
  document.getElementById('analysisReportCommittee').textContent = bill.committee || '-';
  document.getElementById('analysisReportDate').textContent = formatDate(bill.created_at);
  
  // 내용 표시 - iframe 대신 직접 표시
  const contentDisplay = document.getElementById('analysisReportContent');
  contentDisplay.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">내용을 불러오는 중...</p></div>';
  
  // 모달 표시
  modal.show();
  
  // 내용을 별도로 처리하여 모달 표시 후 로드
  setTimeout(() => {
    try {
      if (bill.description && bill.description.trim() !== '') {
        contentDisplay.innerHTML = sanitizeHtml(bill.description);
      } else {
        contentDisplay.innerHTML = '<div class="p-3">분석 보고서 내용이 없습니다.</div>';
      }
    } catch (e) {
      console.error('내용 표시 오류:', e);
      contentDisplay.innerHTML = '<div class="alert alert-warning">내용을 표시하는 중 오류가 발생했습니다.</div>';
    }
  }, 300);
}

// 날짜 포맷 함수
function formatDate(dateString, shortFormat = false) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
  // 항상 날짜만 표시 (시간 제거)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// 알림 표시 함수
function showAlert(type, message, duration = 5000) {
  const alertContainer = document.getElementById('alertContainer');
  const alertId = 'alert-' + Date.now();
  
  const alertElement = document.createElement('div');
  alertElement.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
  alertElement.style.zIndex = 1050;
  alertElement.id = alertId;
  alertElement.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  alertContainer.appendChild(alertElement);
  
  // 일정 시간 후 알림 자동 제거
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 150);
    }
  }, duration);
} 