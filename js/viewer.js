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
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // visits 테이블에서 오늘 데이터 확인
    const { data: existingVisit, error: selectError } = await supabaseClient
      .from('visits')
      .select('*')
      .eq('visit_date', dateStr)
      .maybeSingle();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('방문자 데이터 조회 오류:', selectError);
      return;
    }
    
    if (existingVisit) {
      // 오늘 데이터가 있으면 카운트 증가
      const { error: updateError } = await supabaseClient
        .from('visits')
        .update({ 
          count: existingVisit.count + 1,
          updated_at: today.toISOString()
        })
        .eq('visit_date', dateStr);
      
      if (updateError) {
        console.error('방문자 카운트 업데이트 오류:', updateError);
      }
    } else {
      // 오늘 데이터가 없으면 새로 생성
      const { error: insertError } = await supabaseClient
        .from('visits')
        .insert([{ 
          visit_date: dateStr,
          count: 1,
          created_at: today.toISOString(),
          updated_at: today.toISOString()
        }]);
      
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
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  // 법안 상세 보기 모달
  let viewBillModalTemplate = `
  <div class="modal fade" id="viewBillModal" tabindex="-1" aria-labelledby="viewBillModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
          <div class="modal-content" style="background-color: #ffffff !important;">
              <div class="modal-header">
                  <h5 class="modal-title" id="viewBillModalLabel" style="color: #000000 !important; font-weight: bold;">법안 상세 정보</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body" style="color: #000000 !important;">
                  <div class="bill-details mb-3">
                      <p><strong style="color: #000000 !important;">법안명:</strong> <span id="billModalName" style="color: #000000 !important;"></span></p>
                      <p><strong style="color: #000000 !important;">발의자:</strong> <span id="billModalWriter" style="color: #000000 !important;"></span></p>
                      <p><strong style="color: #000000 !important;">위원회:</strong> <span id="billModalCommittee" style="color: #000000 !important;"></span></p>
                      <p><strong style="color: #000000 !important;">등록일:</strong> <span id="billModalDate" style="color: #000000 !important;"></span></p>
                  </div>
                  
                  <div class="loading-spinner text-center my-4">
                      <div class="spinner-border text-primary" role="status">
                          <span class="visually-hidden">로딩 중...</span>
                      </div>
                      <p style="color: #000000 !important;">내용을 불러오는 중입니다...</p>
                  </div>

                  <ul class="nav nav-tabs" id="billContentTabs" role="tablist">
                      <li class="nav-item" role="presentation">
                          <button class="nav-link active" id="html-tab" data-bs-toggle="tab" data-bs-target="#billHtmlContentDisplay" type="button" role="tab" aria-controls="html-content" aria-selected="true" style="color: #000000 !important;">HTML 보기</button>
                      </li>
                      <li class="nav-item" role="presentation">
                          <button class="nav-link" id="text-tab" data-bs-toggle="tab" data-bs-target="#billTextContentDisplay" type="button" role="tab" aria-controls="text-content" aria-selected="false" style="color: #000000 !important;">텍스트 보기</button>
                      </li>
                  </ul>
                  
                  <div class="tab-content mt-3" id="billContentTabContent">
                      <div class="tab-pane fade show active" id="billHtmlContentDisplay" role="tabpanel" aria-labelledby="html-tab">
                          <div class="html-content-container" style="color: #000000 !important; background-color: #ffffff !important;"></div>
                      </div>
                      <div class="tab-pane fade" id="billTextContentDisplay" role="tabpanel" aria-labelledby="text-tab">
                          <div class="text-content-container" style="color: #000000 !important; background-color: #ffffff !important; white-space: pre-wrap;"></div>
                      </div>
                  </div>
              </div>
              <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" style="color: #ffffff !important;">닫기</button>
              </div>
          </div>
      </div>
  </div>`;

  // 분석 리포트 모달
  const reportModalTemplate = `
    <div class="modal-dialog modal-lg">
        <div class="modal-content" style="color: #000000 !important; transform: translateZ(0); -webkit-font-smoothing: antialiased;">
            <div class="modal-header">
                <h5 class="modal-title" id="reportModalLabel" style="color: #000000 !important;">상세 내용</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" style="color: #000000 !important;">
                <div class="report-loading text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">로딩 중...</span>
                    </div>
                    <p class="mt-2" style="color: #000000 !important;">내용을 불러오는 중...</p>
                </div>
                <div class="report-content" style="display: none;">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <p style="color: #000000 !important;"><strong>법안명:</strong> <span id="reportBillName" style="color: #000000 !important;"></span></p>
                        </div>
                        <div class="col-md-6">
                            <p style="color: #000000 !important;"><strong>등록자:</strong> <span id="reportWriter" style="color: #000000 !important;"></span></p>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <p style="color: #000000 !important;"><strong>위원회:</strong> <span id="reportCommittee" style="color: #000000 !important;"></span></p>
                        </div>
                        <div class="col-md-6">
                            <p style="color: #000000 !important;"><strong>등록일:</strong> <span id="reportDate" style="color: #000000 !important;"></span></p>
                        </div>
                    </div>
                    <ul class="nav nav-tabs mb-3" id="reportContentTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="html-tab" data-bs-toggle="tab" data-bs-target="#html-content" type="button" role="tab" aria-controls="html-content" aria-selected="true" style="color: #495057 !important;">HTML 보기</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="text-tab" data-bs-toggle="tab" data-bs-target="#text-content" type="button" role="tab" aria-controls="text-content" aria-selected="false" style="color: #495057 !important;">텍스트 보기</button>
                        </li>
                    </ul>
                    <div class="tab-content" id="reportContentTabsContent">
                        <div class="tab-pane fade show active" id="html-content" role="tabpanel" aria-labelledby="html-tab">
                            <div id="reportDescription" style="color: #000000 !important; background-color: #ffffff;"></div>
                        </div>
                        <div class="tab-pane fade" id="text-content" role="tabpanel" aria-labelledby="text-tab">
                            <pre id="reportTextContent" style="color: #000000 !important; background-color: #ffffff; white-space: pre-wrap; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px;"></pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

  // 모달 컨테이너에 템플릿 추가
  modalContainer.innerHTML = viewBillModalTemplate + reportModalTemplate;
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

// 안드로이드 기기 감지 함수
function isAndroidDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android/i.test(userAgent);
}

// 모바일 기기 감지 함수
function isMobileDevice() {
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|mobi/i.test(navigator.userAgent.toLowerCase());
}

// HTML에서 텍스트 추출 함수
function extractTextFromHtml(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }
    
    try {
        // DOMParser 사용하여 HTML을 DOM으로 변환
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 스크립트와 스타일 요소 제거
        const scripts = doc.querySelectorAll('script, style');
        scripts.forEach(script => script.remove());
        
        // 텍스트 추출
        return doc.body.textContent || '';
    } catch (error) {
        console.error('HTML에서 텍스트 추출 중 오류:', error);
        // 기본 방법으로 텍스트 추출 시도
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || '';
    }
}

// HTML 정제 함수 (없는 경우 정의)
function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }
    
    try {
        // DOMParser를 사용하여 HTML 파싱
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 위험한 태그 및 속성 제거
        const dangerousTags = ['script'];
        dangerousTags.forEach(tagName => {
            const elements = doc.querySelectorAll(tagName);
            elements.forEach(element => element.remove());
        });
        
        // 위험한 인라인 이벤트 속성 제거
        const allElements = doc.querySelectorAll('*');
        allElements.forEach(element => {
            const attributes = element.attributes;
            for (let i = attributes.length - 1; i >= 0; i--) {
                const attr = attributes[i];
                if (attr.name.startsWith('on') || attr.value.includes('javascript:')) {
                    element.removeAttribute(attr.name);
                }
            }
        });
        
        // 정제된 HTML 반환
        return doc.body.innerHTML;
    } catch (error) {
        console.error('HTML 정제 중 오류:', error);
        // 기본적인 정제 메서드 사용
        const div = document.createElement('div');
        div.innerHTML = html;
        const scripts = div.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        return div.innerHTML;
    }
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
            bill_id: formData.get('billId') || null,
            bill_name: formData.get('billName') || null,
            bill_info: formData.get('billInfo') || '지정된 법안 없음',
            created_at: new Date().toISOString()
        };
        
        console.log('제출 중인 데이터:', feedbackData);
        
        // Supabase에 데이터 저장
        const { data, error } = await supabaseClient
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

// 법안 상세보기
function viewBillDetails(bill) {
    // 안드로이드 기기 감지
    const isAndroid = isAndroidDevice();
    const isMobile = isMobileDevice();
    
    // 모달 콘텐츠 생성
    const modalContentHtml = `
        <div class="modal-header">
            <h5 class="modal-title" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; font-weight: bold;">법안 상세</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #ffffff !important;">
            <div class="bill-details mb-3">
                <p><strong style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">법안명:</strong> <span style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">${bill.name || ''}</span></p>
                <p><strong style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">발의자:</strong> <span style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">${bill.writer || '-'}</span></p>
                <p><strong style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">위원회:</strong> <span style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">${bill.committee || '-'}</span></p>
                <p><strong style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">등록일:</strong> <span style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">${formatDate(bill.created_at) || '-'}</span></p>
            </div>
            
            <div class="loading-spinner text-center my-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">로딩 중...</span>
                </div>
                <p style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">내용을 불러오는 중입니다...</p>
            </div>

            <ul class="nav nav-tabs" id="billContentTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${isAndroid ? '' : 'active'}" id="bill-html-tab" data-bs-toggle="tab" data-bs-target="#billHtmlContentDisplay" type="button" role="tab" aria-controls="billHtmlContentDisplay" aria-selected="${isAndroid ? 'false' : 'true'}" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #f8f9fa !important;">HTML 보기</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${isAndroid ? 'active' : ''}" id="bill-text-tab" data-bs-toggle="tab" data-bs-target="#billTextContentDisplay" type="button" role="tab" aria-controls="billTextContentDisplay" aria-selected="${isAndroid ? 'true' : 'false'}" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #f8f9fa !important;">텍스트 보기</button>
                </li>
            </ul>
            
            <div class="tab-content mt-2">
                <div class="tab-pane fade ${isAndroid ? '' : 'show active'}" id="billHtmlContentDisplay" role="tabpanel" aria-labelledby="bill-html-tab">
                    <div class="html-content-container" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #ffffff !important;">
                        <p class="content-placeholder">내용을 불러오는 중...</p>
                    </div>
                </div>
                <div class="tab-pane fade ${isAndroid ? 'show active' : ''}" id="billTextContentDisplay" role="tabpanel" aria-labelledby="bill-text-tab">
                    <div class="text-content-container" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #ffffff !important; white-space: pre-wrap;">
                        <p class="content-placeholder">내용을 불러오는 중...</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
        </div>
    `;
    
    // 모달 요소 가져오기
    const modalElement = document.getElementById('viewBillModal');
    const modalDialog = modalElement.querySelector('.modal-dialog');
    const modalContentElement = modalElement.querySelector('.modal-content');
    
    // 모달 크기 설정 (모바일에서는 전체 화면에 가깝게)
    if (isMobile) {
        modalDialog.classList.add('modal-fullscreen-sm-down');
    } else {
        modalDialog.classList.add('modal-lg');
    }
    
    // 모달 콘텐츠 설정
    modalContentElement.innerHTML = modalContentHtml;
    modalContentElement.style.transform = 'translateZ(0)'; // 하드웨어 가속 활성화
    modalContentElement.style.webkitTransform = 'translateZ(0)'; // iOS/Safari 지원
    modalContentElement.style.backgroundColor = '#ffffff';
    modalContentElement.style.color = '#000000';
    modalContentElement.style.opacity = '1';
    modalContentElement.style.webkitTextFillColor = '#000000';
    
    // 모달 표시
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // 내용 불러오기 및 표시 (약간의 지연을 두어 모달이 먼저 렌더링되도록 함)
    setTimeout(() => {
        try {
            // 로딩 표시 숨기기
            modalElement.querySelector('.loading-spinner').style.display = 'none';
            
            // 법안 내용 가져오기 - HTML 우선, 없으면 마크다운 사용
            let content = '';
            if (bill.description && bill.description.trim() !== '') {
                content = bill.description;
            } else if (bill.description_markdown && bill.description_markdown.trim() !== '') {
                content = bill.description_markdown;
            }
            
            // HTML 정제
            const sanitizedHTML = sanitizeHtml(content);
            
            // HTML 탭에 내용 표시
            const htmlContainer = modalElement.querySelector('#billHtmlContentDisplay .html-content-container');
            if (sanitizedHTML.trim()) {
                try {
                    htmlContainer.innerHTML = sanitizedHTML;
                    
                    // 모든 텍스트 요소에 색상 강제 적용
                    const textElements = htmlContainer.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li, td, th, a, strong, em, u, i, b');
                    textElements.forEach(el => {
                        el.style.color = '#000000';
                        el.style.opacity = '1';
                        el.style.webkitTextFillColor = '#000000';
                        // 글꼴 렌더링 개선
                        el.style.textRendering = 'optimizeLegibility';
                        el.style.webkitFontSmoothing = 'antialiased';
                        el.style.mozOsxFontSmoothing = 'grayscale';
                    });
                } catch (renderError) {
                    console.error('HTML 렌더링 오류:', renderError);
                    htmlContainer.innerHTML = '<p style="color: #000000 !important;">HTML 렌더링 중 오류가 발생했습니다.</p>';
                }
            } else {
                htmlContainer.innerHTML = '<p style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">내용이 없습니다.</p>';
            }
            
            // 텍스트 추출 및 텍스트 탭에 표시
            const textContainer = modalElement.querySelector('#billTextContentDisplay .text-content-container');
            try {
                const textContent = extractTextFromHtml(content);
                if (textContent.trim()) {
                    textContainer.textContent = textContent;
                    textContainer.style.color = '#000000';
                    textContainer.style.opacity = '1';
                    textContainer.style.webkitTextFillColor = '#000000';
                } else {
                    textContainer.textContent = '내용이 없습니다.';
                    textContainer.style.color = '#000000';
                    textContainer.style.opacity = '1';
                    textContainer.style.webkitTextFillColor = '#000000';
                }
            } catch (error) {
                console.error('텍스트 추출 오류:', error);
                textContainer.textContent = '텍스트 변환 중 오류가 발생했습니다.';
                textContainer.style.color = '#000000';
                textContainer.style.opacity = '1';
                textContainer.style.webkitTextFillColor = '#000000';
            }
        } catch (error) {
            console.error('법안 내용 표시 오류:', error);
            modalElement.querySelector('.modal-body').innerHTML += `
                <div class="alert alert-danger" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #f8d7da !important;">
                    법안 내용을 표시하는 중 오류가 발생했습니다.
                </div>
            `;
        }
    }, 300);
}

// 분석 보고서 표시
function showAnalysisReport(report) {
    // 안드로이드 기기 감지
    const isAndroid = isAndroidDevice();
    const isMobile = isMobileDevice();
    
    // 모달 콘텐츠 생성
    const modalContentHtml = `
        <div class="modal-header">
            <h5 class="modal-title" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; font-weight: bold;">분석 보고서</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #ffffff !important;">
            <div class="report-details mb-3">
                <p><strong style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">법안명:</strong> <span style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">${report.bill_name || ''}</span></p>
                <p><strong style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">발의자:</strong> <span style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">${report.writer || '-'}</span></p>
                <p><strong style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">위원회:</strong> <span style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">${report.committee || '-'}</span></p>
                <p><strong style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">등록일:</strong> <span style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">${formatDate(report.created_at) || '-'}</span></p>
            </div>
            
            <div class="loading-spinner text-center my-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">로딩 중...</span>
                </div>
                <p style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">내용을 불러오는 중입니다...</p>
            </div>

            <ul class="nav nav-tabs" id="reportContentTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${isAndroid ? '' : 'active'}" id="report-html-tab" data-bs-toggle="tab" data-bs-target="#reportHtmlContentDisplay" type="button" role="tab" aria-controls="reportHtmlContentDisplay" aria-selected="${isAndroid ? 'false' : 'true'}" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #f8f9fa !important;">HTML 보기</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${isAndroid ? 'active' : ''}" id="report-text-tab" data-bs-toggle="tab" data-bs-target="#reportTextContentDisplay" type="button" role="tab" aria-controls="reportTextContentDisplay" aria-selected="${isAndroid ? 'true' : 'false'}" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #f8f9fa !important;">텍스트 보기</button>
                </li>
            </ul>
            
            <div class="tab-content mt-2">
                <div class="tab-pane fade ${isAndroid ? '' : 'show active'}" id="reportHtmlContentDisplay" role="tabpanel" aria-labelledby="report-html-tab">
                    <div class="html-content-container" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #ffffff !important;">
                        <p class="content-placeholder">내용을 불러오는 중...</p>
                    </div>
                </div>
                <div class="tab-pane fade ${isAndroid ? 'show active' : ''}" id="reportTextContentDisplay" role="tabpanel" aria-labelledby="report-text-tab">
                    <div class="text-content-container" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #ffffff !important; white-space: pre-wrap;">
                        <p class="content-placeholder">내용을 불러오는 중...</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
        </div>
    `;
    
    // 모달 요소 가져오기
    const modalElement = document.getElementById('analysisReportModal');
    const modalDialog = modalElement.querySelector('.modal-dialog');
    const modalContentElement = modalElement.querySelector('.modal-content');
    
    // 모달 크기 설정 (모바일에서는 전체 화면에 가깝게)
    if (isMobile) {
        modalDialog.classList.add('modal-fullscreen-sm-down');
    } else {
        modalDialog.classList.add('modal-lg');
    }
    
    // 모달 콘텐츠 설정
    modalContentElement.innerHTML = modalContentHtml;
    modalContentElement.style.transform = 'translateZ(0)'; // 하드웨어 가속 활성화
    modalContentElement.style.webkitTransform = 'translateZ(0)'; // iOS/Safari 지원
    modalContentElement.style.backgroundColor = '#ffffff';
    modalContentElement.style.color = '#000000';
    modalContentElement.style.opacity = '1';
    modalContentElement.style.webkitTextFillColor = '#000000';
    
    // 모달 표시
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // 내용 불러오기 및 표시 (약간의 지연을 두어 모달이 먼저 렌더링되도록 함)
    setTimeout(() => {
        try {
            // 로딩 표시 숨기기
            modalElement.querySelector('.loading-spinner').style.display = 'none';
            
            // 보고서 내용 가져오기 - HTML 우선, 없으면 마크다운 사용
            let content = '';
            if (report.description && report.description.trim() !== '') {
                content = report.description;
            } else if (report.description_markdown && report.description_markdown.trim() !== '') {
                content = report.description_markdown;
            }
            
            // HTML 정제
            const sanitizedHTML = sanitizeHtml(content);
            
            // HTML 탭에 내용 표시
            const htmlContainer = modalElement.querySelector('#reportHtmlContentDisplay .html-content-container');
            if (sanitizedHTML.trim()) {
                try {
                    htmlContainer.innerHTML = sanitizedHTML;
                    
                    // 모든 텍스트 요소에 색상 강제 적용
                    const textElements = htmlContainer.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li, td, th, a, strong, em, u, i, b');
                    textElements.forEach(el => {
                        el.style.color = '#000000';
                        el.style.opacity = '1';
                        el.style.webkitTextFillColor = '#000000';
                        // 글꼴 렌더링 개선
                        el.style.textRendering = 'optimizeLegibility';
                        el.style.webkitFontSmoothing = 'antialiased';
                        el.style.mozOsxFontSmoothing = 'grayscale';
                    });
                } catch (renderError) {
                    console.error('HTML 렌더링 오류:', renderError);
                    htmlContainer.innerHTML = '<p style="color: #000000 !important;">HTML 렌더링 중 오류가 발생했습니다.</p>';
                }
            } else {
                htmlContainer.innerHTML = '<p style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important;">내용이 없습니다.</p>';
            }
            
            // 텍스트 추출 및 텍스트 탭에 표시
            const textContainer = modalElement.querySelector('#reportTextContentDisplay .text-content-container');
            try {
                const textContent = extractTextFromHtml(content);
                if (textContent.trim()) {
                    textContainer.textContent = textContent;
                    textContainer.style.color = '#000000';
                    textContainer.style.opacity = '1';
                    textContainer.style.webkitTextFillColor = '#000000';
                } else {
                    textContainer.textContent = '내용이 없습니다.';
                    textContainer.style.color = '#000000';
                    textContainer.style.opacity = '1';
                    textContainer.style.webkitTextFillColor = '#000000';
                }
            } catch (error) {
                console.error('텍스트 추출 오류:', error);
                textContainer.textContent = '텍스트 변환 중 오류가 발생했습니다.';
                textContainer.style.color = '#000000';
                textContainer.style.opacity = '1';
                textContainer.style.webkitTextFillColor = '#000000';
            }
        } catch (error) {
            console.error('보고서 내용 표시 오류:', error);
            modalElement.querySelector('.modal-body').innerHTML += `
                <div class="alert alert-danger" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; opacity: 1 !important; background-color: #f8d7da !important;">
                    보고서 내용을 표시하는 중 오류가 발생했습니다.
                </div>
            `;
        }
    }, 300);
}

// 홈페이지 초기화 함수
function initHomePage() {
    // 모달 템플릿 로드
    loadModalTemplates();
    
    // Supabase 연결 테스트
    testSupabaseConnection().then(isConnected => {
        if (!isConnected) return;
        
        // 방문자 기록
        recordVisit();
        
        // 관리자 체크
        checkAdminStatus();
        
        // 법안 목록 로드
        loadBills();
        
        // 통계 업데이트
        updateStatistics();
        
        // 이벤트 리스너 등록
        setupEventListeners();
    });
} 