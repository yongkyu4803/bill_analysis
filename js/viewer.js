// Supabase 클라이언트 초기화
const supabaseUrl = 'https://rxwztfdnragffxbmlscf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4d3p0ZmRucmFnZmZ4Ym1sc2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NzU2MDgsImV4cCI6MjA1ODA1MTYwOH0.KN8cR6_xHHHfuF1odUi9WwzkbOHCmwuRaK0FYe7b0Ig';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 전역 변수 선언
let bills = [];
let isAdmin = false;

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
  
  // 방문자 기록
  await recordVisit();
  
  // 관리자 체크 (로컬 스토리지에서 토큰 확인)
  checkAdminStatus();
  
  // 법안 목록 로드
  await loadBills();
  
  // 통계 업데이트
  updateStatistics();
  
  // 이벤트 리스너 등록
  setupEventListeners();
});

// 방문자 기록 함수
async function recordVisit() {
  try {
    // 현재 날짜 (YYYY-MM-DD 형식)
    const today = new Date().toISOString().split('T')[0];
    
    // visits 테이블에서 오늘 데이터 확인
    const { data: existingVisit, error: selectError } = await supabaseClient
      .from('visits')
      .select('*')
      .eq('visit_date', today)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') { // PGRST116: 결과 없음
      console.error('방문자 데이터 조회 오류:', selectError);
      return;
    }
    
    if (existingVisit) {
      // 오늘 데이터가 있으면 카운트 증가
      const { error: updateError } = await supabaseClient
        .from('visits')
        .update({ count: existingVisit.count + 1 })
        .eq('visit_date', today);
      
      if (updateError) {
        console.error('방문자 카운트 업데이트 오류:', updateError);
      }
    } else {
      // 오늘 데이터가 없으면 새로 생성
      const { error: insertError } = await supabaseClient
        .from('visits')
        .insert([{ visit_date: today, count: 1 }]);
      
      if (insertError) {
        console.error('방문자 데이터 생성 오류:', insertError);
      }
    }
  } catch (error) {
    console.error('방문자 기록 중 오류 발생:', error);
  }
}

// 관리자 상태 확인
function checkAdminStatus() {
  const adminToken = localStorage.getItem('adminToken');
  
  if (adminToken) {
    try {
      // JWT 형식의 토큰 검증 (간단한 예시)
      const tokenData = JSON.parse(atob(adminToken.split('.')[1]));
      const expTime = tokenData.exp * 1000; // 초를 밀리초로 변환
      
      if (expTime > Date.now()) {
        isAdmin = true;
        // 관리자 통계 영역 표시
        const adminStatsElem = document.getElementById('adminStatistics');
        if (adminStatsElem) {
          adminStatsElem.classList.remove('d-none');
          loadVisitStatistics(); // 방문 통계 로드
        }
      } else {
        // 만료된 토큰
        localStorage.removeItem('adminToken');
      }
    } catch (e) {
      console.error('토큰 검증 오류:', e);
      localStorage.removeItem('adminToken');
    }
  }
}

// 방문 통계 로드
async function loadVisitStatistics() {
  try {
    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0];
    
    // 오늘 방문자 수 조회
    const { data: todayData, error: todayError } = await supabaseClient
      .from('visits')
      .select('count')
      .eq('visit_date', today)
      .single();
    
    if (todayError && todayError.code !== 'PGRST116') {
      console.error('오늘 방문자 조회 오류:', todayError);
    }
    
    // 전체 방문자 수 조회
    const { data: allData, error: allError } = await supabaseClient
      .from('visits')
      .select('count')
      .order('visit_date', { ascending: true });
    
    if (allError) {
      console.error('전체 방문자 조회 오류:', allError);
    }
    
    // UI 업데이트
    const todayVisitsElem = document.getElementById('todayVisits');
    const totalVisitsElem = document.getElementById('totalVisits');
    
    if (todayVisitsElem) {
      todayVisitsElem.textContent = todayData ? todayData.count : 0;
    }
    
    if (totalVisitsElem && allData) {
      const totalCount = allData.reduce((sum, item) => sum + item.count, 0);
      totalVisitsElem.textContent = totalCount;
    }
    
    // 간단한 방문자 차트 그리기 (최근 7일)
    if (allData && allData.length > 0) {
      drawVisitsChart(allData);
    }
    
  } catch (error) {
    console.error('방문 통계 로드 중 오류 발생:', error);
  }
}

// 방문자 차트 그리기
function drawVisitsChart(visitsData) {
  // 최근 7일 데이터만 추출
  const recentData = visitsData.slice(-7);
  
  // 차트 컨테이너
  const chartContainer = document.getElementById('visitsChart');
  if (!chartContainer) return;
  
  // 간단한 차트 HTML 생성
  let chartHTML = '<div class="mt-3 small">';
  chartHTML += '<p class="text-muted">최근 7일 방문자 통계</p>';
  
  recentData.forEach(visit => {
    const date = new Date(visit.visit_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    const maxCount = Math.max(...recentData.map(item => item.count));
    const percentage = Math.round((visit.count / maxCount) * 100);
    
    chartHTML += `
      <div class="mb-2">
        <div class="d-flex justify-content-between mb-1">
          <span>${date}</span>
          <span class="text-primary">${visit.count}명</span>
        </div>
        <div class="progress" style="height: 8px;">
          <div class="progress-bar bg-info" role="progressbar" style="width: ${percentage}%" 
               aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  chartContainer.innerHTML = chartHTML;
}

// 모달 템플릿 로드 함수
function loadModalTemplates() {
  const modalContainer = document.getElementById('modalContainer');
  
  // 상세 보기 모달 템플릿
  const viewModalTemplate = `
    <div class="modal fade" id="viewBillModal" tabindex="-1" aria-labelledby="viewBillModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content" style="transform: translateZ(0); background-color: #ffffff !important;">
          <div class="modal-header">
            <h5 class="modal-title" id="viewBillModalLabel" style="color: #000000 !important;">법안 상세 보기</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="bill-details">
              <h3 id="billTitleDisplay" class="mb-3" style="color: #000000 !important;"></h3>
              <div class="mb-3">
                <div class="row">
                  <div class="col-md-6">
                    <p style="color: #000000 !important;"><strong style="color: #000000 !important;">담당자:</strong> <span id="billProposerDisplay" style="color: #000000 !important;"></span></p>
                  </div>
                  <div class="col-md-6">
                    <p style="color: #000000 !important;"><strong style="color: #000000 !important;">위원회:</strong> <span id="billCommitteeDisplay" style="color: #000000 !important;"></span></p>
                  </div>
                </div>
                <p style="color: #000000 !important;"><strong style="color: #000000 !important;">등록일:</strong> <span id="billDateDisplay" style="color: #000000 !important;"></span></p>
              </div>
              
              <!-- 탭 인터페이스 추가 -->
              <ul class="nav nav-tabs mb-3" id="billContentTabs" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link active" id="html-tab" data-bs-toggle="tab" data-bs-target="#html-content" 
                    type="button" role="tab" aria-controls="html-content" aria-selected="true" 
                    style="color: #000000 !important;">HTML 보기</button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" id="text-tab" data-bs-toggle="tab" data-bs-target="#text-content" 
                    type="button" role="tab" aria-controls="text-content" aria-selected="false"
                    style="color: #000000 !important;">텍스트 보기</button>
                </li>
              </ul>
              
              <div class="tab-content" id="billContentTabContent">
                <!-- HTML 탭 콘텐츠 -->
                <div class="tab-pane fade show active" id="html-content" role="tabpanel" aria-labelledby="html-tab">
                  <div id="billContentDisplay" class="border rounded p-3 bg-light overflow-auto" style="height: 400px; color: #000000 !important; opacity: 1 !important;">
                    <div class="text-center p-3" style="color: #000000 !important;">
                      <div class="spinner-border text-primary" role="status"></div>
                      <p class="mt-2" style="color: #000000 !important;">내용을 불러오는 중...</p>
                    </div>
                  </div>
                </div>
                
                <!-- 텍스트 탭 콘텐츠 -->
                <div class="tab-pane fade" id="text-content" role="tabpanel" aria-labelledby="text-tab">
                  <div id="billTextDisplay" class="border rounded p-3 bg-light overflow-auto" style="height: 400px; color: #000000 !important; opacity: 1 !important; white-space: pre-wrap;">
                    <div class="text-center p-3" style="color: #000000 !important;">
                      <div class="spinner-border text-primary" role="status"></div>
                      <p class="mt-2" style="color: #000000 !important;">텍스트를 추출하는 중...</p>
                    </div>
                  </div>
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
  
  // 법안 분석 보고서 모달 템플릿 - 또한 동일한 탭 인터페이스 적용
  const analysisModalTemplate = `
    <div class="modal fade" id="analysisReportModal" tabindex="-1" aria-labelledby="analysisReportModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content" style="transform: translateZ(0); background-color: #ffffff !important;">
          <div class="modal-header">
            <h5 class="modal-title" id="analysisReportModalLabel" style="color: #000000 !important;">법안 분석 보고서</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="card mb-3">
              <div class="card-header bg-light">
                <h6 class="mb-0" style="color: #000000 !important;">기본 정보</h6>
              </div>
              <div class="card-body">
                <div class="row mb-3">
                  <div class="col-md-6">
                    <p style="color: #000000 !important;"><strong style="color: #000000 !important;">법안명:</strong> <span id="analysisReportTitle" style="color: #000000 !important;"></span></p>
                    <p style="color: #000000 !important;"><strong style="color: #000000 !important;">담당자:</strong> <span id="analysisReportProposer" style="color: #000000 !important;"></span></p>
                  </div>
                  <div class="col-md-6">
                    <p style="color: #000000 !important;"><strong style="color: #000000 !important;">위원회:</strong> <span id="analysisReportCommittee" style="color: #000000 !important;"></span></p>
                    <p style="color: #000000 !important;"><strong style="color: #000000 !important;">등록일:</strong> <span id="analysisReportDate" style="color: #000000 !important;"></span></p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 탭 인터페이스 추가 -->
            <ul class="nav nav-tabs mb-3" id="analysisContentTabs" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="analysis-html-tab" data-bs-toggle="tab" data-bs-target="#analysis-html-content" 
                  type="button" role="tab" aria-controls="analysis-html-content" aria-selected="true" 
                  style="color: #000000 !important;">HTML 보기</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="analysis-text-tab" data-bs-toggle="tab" data-bs-target="#analysis-text-content" 
                  type="button" role="tab" aria-controls="analysis-text-content" aria-selected="false"
                  style="color: #000000 !important;">텍스트 보기</button>
              </li>
            </ul>
            
            <div class="tab-content" id="analysisContentTabContent">
              <!-- HTML 탭 콘텐츠 -->
              <div class="tab-pane fade show active" id="analysis-html-content" role="tabpanel" aria-labelledby="analysis-html-tab">
                <div id="analysisReportContent" class="overflow-auto" style="height: 500px; color: #000000 !important; opacity: 1 !important;">
                  <div class="text-center p-3" style="color: #000000 !important;">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2" style="color: #000000 !important;">내용을 불러오는 중...</p>
                  </div>
                </div>
              </div>
              
              <!-- 텍스트 탭 콘텐츠 -->
              <div class="tab-pane fade" id="analysis-text-content" role="tabpanel" aria-labelledby="analysis-text-tab">
                <div id="analysisReportTextContent" class="overflow-auto" style="height: 500px; color: #000000 !important; opacity: 1 !important; white-space: pre-wrap;">
                  <div class="text-center p-3" style="color: #000000 !important;">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2" style="color: #000000 !important;">텍스트를 추출하는 중...</p>
                  </div>
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
        <a href="report-viewer.html?id=${bill.id}" class="bill-title fw-bold text-primary fs-6 text-decoration-none">${bill.bill_name}</a>
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
      <a href="report-viewer.html?id=${bill.id}" class="text-decoration-none recent-bill-link">
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

// HTML 내용을 안전하게 정리하는 함수
function sanitizeHtml(html) {
  if (!html) return '';
  
  try {
    // 새로운 DOMParser 생성
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 모든 script 태그 제거
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // 모든 이벤트 핸들러 속성 제거 (onclick, onload 등)
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
      const attributes = el.attributes;
      const attrsToRemove = [];
      
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        // 이벤트 핸들러 속성 제거
        if (attr.name.startsWith('on')) {
          attrsToRemove.push(attr.name);
        }
        // javascript: 프로토콜이 있는 href 속성 제거
        if (attr.name === 'href' && attr.value.toLowerCase().startsWith('javascript:')) {
          el.setAttribute('href', '#');
        }
      }
      
      // 제거할 속성들 제거
      attrsToRemove.forEach(attr => el.removeAttribute(attr));
    });
    
    return doc.body.innerHTML;
  } catch (error) {
    console.error('HTML 정리 중 오류 발생:', error);
    return '콘텐츠를 표시할 수 없습니다.';
  }
}

// HTML에서 텍스트만 추출하는 함수
function extractTextFromHtml(html) {
  if (!html) return '';
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 스크립트와 스타일 태그 제거
    const scripts = doc.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());
    
    // 텍스트 추출
    const body = doc.body;
    return body.textContent || body.innerText || '';
  } catch (error) {
    console.error('HTML에서 텍스트 추출 중 오류 발생:', error);
    return '텍스트 추출 실패';
  }
}

// 법안 상세 정보 보기 함수
function viewBillDetails(bill) {
  document.getElementById('billModalLabel').textContent = bill.bill_name;
  
  // 모달 본문에 법안 정보 표시
  const modalBody = document.querySelector('#billModal .modal-body');
  
  // 로딩 상태 표시
  modalBody.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">로딩 중...</span>
      </div>
    </div>
    <p class="text-center text-dark">법안 내용을 로드하고 있습니다...</p>
  `;
  
  // 모달 표시
  const billModal = new bootstrap.Modal(document.getElementById('billModal'));
  billModal.show();
  
  // 모바일 기기 감지
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 탭 구조로 HTML과 텍스트 버전 모두 표시
  modalBody.innerHTML = `
    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <span class="fw-bold">담당자:</span> <span class="text-dark">${bill.writer || '-'}</span>
        </div>
        <div>
          <span class="fw-bold">위원회:</span> <span class="badge bg-secondary">${bill.committee || '-'}</span>
        </div>
      </div>
      <div>
        <span class="fw-bold">등록일:</span> <span class="text-dark">${formatDate(bill.created_at) || '-'}</span>
      </div>
    </div>
    
    <ul class="nav nav-tabs" id="billContentTabs" role="tablist" style="background-color: #ffffff;">
      <li class="nav-item" role="presentation">
        <a class="nav-link" id="htmlTab" data-bs-toggle="tab" href="#htmlContent" role="tab" 
           aria-controls="htmlContent" aria-selected="true" style="color: #000000;">HTML 보기</a>
      </li>
      <li class="nav-item" role="presentation">
        <a class="nav-link active" id="textTab" data-bs-toggle="tab" href="#textContent" role="tab" 
           aria-controls="textContent" aria-selected="false" style="color: #000000;">텍스트 보기</a>
      </li>
    </ul>
    
    <div class="tab-content pt-3" id="billContentTabContent">
      <div class="tab-pane fade" id="htmlContent" role="tabpanel" aria-labelledby="htmlTab">
        <div id="htmlContentDisplay" style="color: #000000;"></div>
      </div>
      <div class="tab-pane fade show active" id="textContent" role="tabpanel" aria-labelledby="textTab">
        <div id="textContentDisplay" style="white-space: pre-wrap; color: #000000;"></div>
      </div>
    </div>
  `;
  
  const htmlContentDisplay = document.getElementById('htmlContentDisplay');
  const textContentDisplay = document.getElementById('textContentDisplay');
  
  // 짧은 지연 후 콘텐츠 로드 (모달이 완전히 표시된 후)
  setTimeout(() => {
    try {
      // HTML 콘텐츠 처리
      const sanitizedHtml = sanitizeHtml(bill.description);
      htmlContentDisplay.innerHTML = sanitizedHtml || '<p style="color: #000000 !important;">내용이 없습니다.</p>';
      
      // 텍스트 콘텐츠 처리
      const plainText = extractTextFromHtml(bill.description);
      textContentDisplay.textContent = plainText || '내용이 없습니다.';
      
      // 모바일에서 텍스트 색상 강제 적용
      if (isMobile) {
        const contentElements = htmlContentDisplay.querySelectorAll('*');
        contentElements.forEach(el => {
          el.style.color = '#000000';
          el.style.opacity = '1';
        });
      }
    } catch (error) {
      console.error('법안 내용 로드 중 오류 발생:', error);
      htmlContentDisplay.innerHTML = '<div class="alert alert-danger" style="color: #000000 !important;">법안 내용을 표시하는 중 오류가 발생했습니다.</div>';
      textContentDisplay.textContent = '법안 내용을 표시하는 중 오류가 발생했습니다.';
    }
  }, 300);
}

// 분석 보고서 표시 함수
function showAnalysisReport(bill) {
  document.getElementById('analysisModalLabel').textContent = bill.bill_name;
  
  // 모달 본문에 보고서 정보 표시
  const modalBody = document.querySelector('#analysisModal .modal-body');
  
  // 로딩 상태 표시
  modalBody.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">로딩 중...</span>
      </div>
    </div>
    <p class="text-center text-dark">분석 보고서를 로드하고 있습니다...</p>
  `;
  
  // 모달 표시
  const analysisModal = new bootstrap.Modal(document.getElementById('analysisModal'));
  analysisModal.show();
  
  // 모바일 기기 감지
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 탭 구조로 HTML과 텍스트 버전 모두 표시
  modalBody.innerHTML = `
    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <span class="fw-bold">담당자:</span> <span class="text-dark">${bill.writer || '-'}</span>
        </div>
        <div>
          <span class="fw-bold">위원회:</span> <span class="badge bg-secondary">${bill.committee || '-'}</span>
        </div>
      </div>
      <div>
        <span class="fw-bold">등록일:</span> <span class="text-dark">${formatDate(bill.created_at) || '-'}</span>
      </div>
    </div>
    
    <ul class="nav nav-tabs" id="analysisContentTabs" role="tablist" style="background-color: #ffffff;">
      <li class="nav-item" role="presentation">
        <a class="nav-link" id="analysisHtmlTab" data-bs-toggle="tab" href="#analysisHtmlContent" role="tab" 
           aria-controls="analysisHtmlContent" aria-selected="true" style="color: #000000;">HTML 보기</a>
      </li>
      <li class="nav-item" role="presentation">
        <a class="nav-link active" id="analysisTextTab" data-bs-toggle="tab" href="#analysisTextContent" role="tab" 
           aria-controls="analysisTextContent" aria-selected="false" style="color: #000000;">텍스트 보기</a>
      </li>
    </ul>
    
    <div class="tab-content pt-3" id="analysisContentTabContent">
      <div class="tab-pane fade" id="analysisHtmlContent" role="tabpanel" aria-labelledby="analysisHtmlTab">
        <div id="htmlContentDisplay" style="color: #000000;"></div>
      </div>
      <div class="tab-pane fade show active" id="analysisTextContent" role="tabpanel" aria-labelledby="analysisTextTab">
        <div id="textContentDisplay" style="white-space: pre-wrap; color: #000000;"></div>
      </div>
    </div>
  `;
  
  const htmlContentDisplay = document.getElementById('htmlContentDisplay');
  const textContentDisplay = document.getElementById('textContentDisplay');
  
  // 짧은 지연 후 콘텐츠 로드 (모달이 완전히 표시된 후)
  setTimeout(() => {
    try {
      // HTML 콘텐츠 처리
      const sanitizedHtml = sanitizeHtml(bill.analysis_report);
      htmlContentDisplay.innerHTML = sanitizedHtml || '<p style="color: #000000 !important;">분석 보고서가 없습니다.</p>';
      
      // 텍스트 콘텐츠 처리
      const plainText = extractTextFromHtml(bill.analysis_report);
      textContentDisplay.textContent = plainText || '분석 보고서가 없습니다.';
      
      // 모바일에서 텍스트 색상 강제 적용
      if (isMobile) {
        const contentElements = htmlContentDisplay.querySelectorAll('*');
        contentElements.forEach(el => {
          el.style.color = '#000000';
          el.style.opacity = '1';
        });
      }
    } catch (error) {
      console.error('분석 보고서 로드 중 오류 발생:', error);
      htmlContentDisplay.innerHTML = '<div class="alert alert-danger" style="color: #000000 !important;">분석 보고서를 표시하는 중 오류가 발생했습니다.</div>';
      textContentDisplay.textContent = '분석 보고서를 표시하는 중 오류가 발생했습니다.';
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

// 상세 보고서 페이지 초기화
function initReportPage() {
    // URL에서 ID 파라미터 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('id');
    
    if (!reportId) {
        displayErrorMessage('리포트 ID가 제공되지 않았습니다.');
        return;
    }
    
    loadReportDetails(reportId);
    
    // 인쇄 버튼 이벤트 핸들러
    document.getElementById('printBtn').addEventListener('click', function() {
        window.print();
    });
    
    // 특정 법안에 대한 피드백 버튼 이벤트 핸들러
    document.getElementById('specificFeedbackBtn').addEventListener('click', function(e) {
        e.preventDefault();
        const billTitle = document.getElementById('reportTitle').textContent;
        window.location.href = `feedback.html?billId=${reportId}&billName=${encodeURIComponent(billTitle)}`;
    });
    
    // 하단 피드백 버튼 이벤트 핸들러
    document.getElementById('bottomFeedbackBtn').addEventListener('click', function(e) {
        e.preventDefault();
        const billTitle = document.getElementById('reportTitle').textContent;
        window.location.href = `feedback.html?billId=${reportId}&billName=${encodeURIComponent(billTitle)}`;
    });
}

// 피드백 페이지 초기화
function initFeedbackPage() {
    // URL에서 bill ID와 bill Name 파라미터 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('billId');
    const billName = urlParams.get('billName');
    
    // 법안 정보가 있으면 입력 필드에 자동으로 채우기
    if (billId && billName) {
        const billInfoField = document.getElementById('billInfo');
        if (billInfoField) {
            billInfoField.value = `법안 ID: ${billId}, 법안명: ${billName}`;
        }
        
        // 제목 필드가 있으면 접두어 추가
        const subjectField = document.getElementById('subject');
        if (subjectField && !subjectField.value) {
            subjectField.value = `[${billName}] 관련 피드백`;
        }
    }
    
    // 피드백 제출 버튼 이벤트 핸들러
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', handleFeedbackSubmit);
    }
}

// 피드백 제출 처리
async function handleFeedbackSubmit(e) {
    e.preventDefault();
    
    const submitButton = document.querySelector('#feedbackForm button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 제출 중...';
    
    try {
        // 폼 데이터 수집
        const formData = new FormData(e.target);
        const feedbackData = {
            name: formData.get('name'),
            email: formData.get('email'),
            subject: formData.get('subject'),
            message: formData.get('message'),
            billInfo: formData.get('billInfo') || '지정된 법안 없음',
            createdAt: new Date().toISOString()
        };
        
        // Supabase에 데이터 저장
        const { data, error } = await supabase
            .from('feedback')
            .insert([feedbackData]);
            
        if (error) throw error;
        
        // 성공 메시지 표시
        document.getElementById('feedbackForm').classList.add('d-none');
        document.getElementById('successMessage').classList.remove('d-none');
        
        // 3초 후 홈페이지로 리다이렉트
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        
    } catch (error) {
        console.error('피드백 제출 오류:', error);
        document.getElementById('errorText').textContent = '피드백 제출 중 오류가 발생했습니다. 다시 시도해주세요.';
        document.getElementById('errorMessage').classList.remove('d-none');
        
        // 버튼 상태 복원
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

// 페이지 초기화 기능
function initPage() {
    // 현재 페이지 확인
    const currentPage = window.location.pathname.split('/').pop();
    
    // 페이지별 초기화 함수 호출
    if (currentPage === 'index.html' || currentPage === '') {
        initHomePage();
    } else if (currentPage === 'report-viewer.html') {
        initReportPage();
    } else if (currentPage === 'feedback.html') {
        initFeedbackPage();
    }
}

// DOM이 로드되면 페이지 초기화
document.addEventListener('DOMContentLoaded', initPage); 