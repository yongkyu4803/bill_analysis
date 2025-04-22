// Supabase 클라이언트 초기화
const supabaseUrl = 'https://rxwztfdnragffxbmlscf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4d3p0ZmRucmFnZmZ4Ym1sc2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NzU2MDgsImV4cCI6MjA1ODA1MTYwOH0.KN8cR6_xHHHfuF1odUi9WwzkbOHCmwuRaK0FYe7b0Ig';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 전역 변수 선언
let bills = [];
let currentEditingBill = null;
let isAuthenticated = false; // 인증 상태를 추적하는 변수

// 페이지 로드 시 실행되는 초기화 함수
document.addEventListener('DOMContentLoaded', async function() {
  // 모달 템플릿 로드
  loadModalTemplates();
  
  // 세션 확인
  await checkSession();
  
  // 이벤트 리스너 등록
  setupEventListeners();
});

// 세션 확인 및 상태 업데이트 함수
async function checkSession() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('세션 확인 오류:', error);
      return;
    }
    
    if (session) {
      // 로그인된 상태
      isAuthenticated = true;
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      // UI 업데이트
      updateUIForAuthenticatedUser(user);
      
      // 법안 목록 로드
      await loadBills();
    } else {
      // 로그인되지 않은 상태
      isAuthenticated = false;
      updateUIForUnauthenticatedUser();
    }
  } catch (error) {
    console.error('세션 확인 중 오류 발생:', error);
    showAlert('danger', '세션 확인 중 오류가 발생했습니다.');
  }
}

// 로그인된 사용자용 UI 업데이트
function updateUIForAuthenticatedUser(user) {
  // 로그인 버튼 텍스트 변경
  const loginBtn = document.getElementById('loginBtn');
  loginBtn.innerHTML = '<i class="bi bi-box-arrow-right me-1"></i>로그아웃';
  loginBtn.classList.remove('btn-outline-light');
  loginBtn.classList.add('btn-outline-danger');
  
  // 관리자 정보 표시
  const adminInfo = document.getElementById('adminInfo');
  adminInfo.innerHTML = `
    <div class="d-flex align-items-center mb-2">
      <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style="width: 40px; height: 40px;">
        <i class="bi bi-person-fill"></i>
      </div>
      <div>
        <p class="mb-0 fw-bold">${user.email}</p>
        <small class="text-muted">관리자</small>
      </div>
    </div>
    <div class="d-grid gap-2 mt-3">
      <button class="btn btn-sm btn-outline-secondary" id="refreshBtn">
        <i class="bi bi-arrow-clockwise me-1"></i>새로고침
      </button>
    </div>
  `;
  
  // 폼 등록 버튼 활성화
  document.getElementById('showFormBtn').disabled = false;
  
  // 새로고침 버튼 이벤트 추가
  document.getElementById('refreshBtn').addEventListener('click', function() {
    loadBills();
  });
}

// 인증되지 않은 사용자용 UI 업데이트
function updateUIForUnauthenticatedUser() {
  // 로그인 버튼 텍스트 설정
  const loginBtn = document.getElementById('loginBtn');
  loginBtn.innerHTML = '<i class="bi bi-person-fill me-1"></i>관리자 로그인';
  loginBtn.classList.remove('btn-outline-danger');
  loginBtn.classList.add('btn-outline-light');
  
  // 관리자 정보 표시
  const adminInfo = document.getElementById('adminInfo');
  adminInfo.innerHTML = `
    <p class="text-muted mb-0">로그인이 필요합니다</p>
    <small class="text-danger">관리 기능을 사용하려면 로그인하세요</small>
  `;
  
  // 등록 폼 비활성화
  document.getElementById('showFormBtn').disabled = true;
  
  // 빈 테이블 표시
  const tableBody = document.getElementById('billTableBody');
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-3">
        <i class="bi bi-lock me-1"></i> 로그인이 필요합니다
      </td>
    </tr>
  `;
}

// 로그인 모달 표시 함수
function showLoginModal() {
  const modal = new bootstrap.Modal(document.getElementById('loginModal'));
  modal.show();
}

// 로그인 처리 함수
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    showAlert('warning', '이메일과 비밀번호를 모두 입력해주세요.');
    return;
  }
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) {
      throw error;
    }
    
    // 모달 닫기
    const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    modal.hide();
    
    // UI 업데이트
    isAuthenticated = true;
    updateUIForAuthenticatedUser(data.user);
    
    // 법안 목록 로드
    await loadBills();
    
    showAlert('success', '로그인에 성공했습니다.');
    
  } catch (error) {
    console.error('로그인 오류:', error);
    showAlert('danger', '로그인에 실패했습니다: ' + (error.message || '인증 오류'));
  }
}

// 로그아웃 처리 함수
async function handleLogout() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) {
      throw error;
    }
    
    // 세션 및 UI 초기화
    isAuthenticated = false;
    updateUIForUnauthenticatedUser();
    
    showAlert('success', '로그아웃되었습니다.');
    
  } catch (error) {
    console.error('로그아웃 오류:', error);
    showAlert('danger', '로그아웃 중 오류가 발생했습니다: ' + error.message);
  }
}

// 모달 템플릿 로드 함수
function loadModalTemplates() {
  const modalContainer = document.getElementById('modalContainer');
  
  // 로그인 모달 템플릿
  const loginModalTemplate = `
    <div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="loginModalLabel">관리자 로그인</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="loginForm">
              <div class="mb-3">
                <label for="loginEmail" class="form-label">이메일</label>
                <input type="email" class="form-control" id="loginEmail" required>
              </div>
              <div class="mb-3">
                <label for="loginPassword" class="form-label">비밀번호</label>
                <input type="password" class="form-control" id="loginPassword" required>
              </div>
              <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary">로그인</button>
              </div>
            </form>
            <div class="alert alert-info mt-3">
              <small>
                <strong>테스트 계정 정보:</strong><br>
                이메일: admin@example.com<br>
                비밀번호: adminpass123
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
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
              <div id="billContentDisplay" class="border rounded p-3 bg-light">
                <iframe id="billContentFrame" style="width: 100%; height: 500px; border: none;"></iframe>
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
  
  // 삭제 확인 모달 템플릿
  const deleteConfirmModalTemplate = `
    <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteConfirmModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="deleteConfirmModalLabel">삭제 확인</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>정말 이 법안을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.</p>
            <p><strong id="deleteBillName"></strong></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
            <button type="button" class="btn btn-danger" id="confirmDeleteBtn">삭제</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 모달 템플릿을 컨테이너에 추가
  modalContainer.innerHTML = loginModalTemplate + viewModalTemplate + deleteConfirmModalTemplate;
}

// 법안 목록 로드 함수
async function loadBills() {
  try {
    // Supabase 연결 테스트
    console.log('Supabase 연결 테스트 중...');
    const testConnection = await supabaseClient
      .from('bill')
      .select('id', { count: 'exact' })
      .limit(1);
    
    if (testConnection.error) {
      console.error('Supabase 연결 오류:', testConnection.error);
      showAlert('danger', '서버 연결에 실패했습니다. 새로고침 후 다시 시도해주세요.');
      return;
    }
    
    // 법안 목록 가져오기
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
        <td colspan="5" class="text-center py-3">등록된 법안이 없습니다.</td>
      </tr>
    `;
    return;
  }
  
  billsData.forEach((bill) => {
    const row = document.createElement('tr');
    
    // 법안명 셀
    const nameCell = document.createElement('td');
    nameCell.innerHTML = `<span class="bill-title">${bill.bill_name}</span>`;
    
    // 위원회 셀
    const committeeCell = document.createElement('td');
    committeeCell.className = 'd-none d-md-table-cell';
    committeeCell.innerHTML = `<span class="badge bg-secondary">${bill.committee || '-'}</span>`;
    
    // 담당자 셀
    const proposerCell = document.createElement('td');
    proposerCell.className = 'd-none d-md-table-cell';
    proposerCell.textContent = bill.writer || '-';
    
    // 날짜 셀
    const dateCell = document.createElement('td');
    dateCell.className = 'd-none d-md-table-cell';
    dateCell.textContent = formatDate(bill.created_at);
    
    // 관리 버튼 셀
    const actionsCell = document.createElement('td');
    actionsCell.className = 'text-end';
    actionsCell.innerHTML = `
      <div class="btn-group btn-group-sm">
        <button type="button" class="btn btn-outline-primary edit-btn" data-bill-id="${bill.id}">
          <i class="bi bi-pencil"></i>
        </button>
        <button type="button" class="btn btn-outline-danger delete-btn" data-bill-id="${bill.id}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
    
    row.appendChild(nameCell);
    row.appendChild(committeeCell);
    row.appendChild(proposerCell);
    row.appendChild(dateCell);
    row.appendChild(actionsCell);
    
    tableBody.appendChild(row);
  });
}

// 이벤트 리스너 설정 함수
function setupEventListeners() {
  // 로그인/로그아웃 버튼 클릭 이벤트
  document.getElementById('loginBtn').addEventListener('click', function() {
    if (isAuthenticated) {
      handleLogout();
    } else {
      showLoginModal();
    }
  });
  
  // 로그인 폼 제출 이벤트
  document.addEventListener('submit', function(event) {
    if (event.target.id === 'loginForm') {
      handleLogin(event);
    }
  });
  
  // 법안 제목 클릭 이벤트
  document.addEventListener('click', function(event) {
    if (!isAuthenticated) return; // 인증되지 않은 경우 이벤트 무시
    
    if (event.target.closest('.bill-title')) {
      const row = event.target.closest('tr');
      const index = Array.from(row.parentNode.children).indexOf(row);
      viewBillDetails(bills[index]);
    }
    
    // 수정 버튼 클릭 이벤트
    if (event.target.closest('.edit-btn')) {
      const billId = event.target.closest('.edit-btn').dataset.billId;
      const bill = bills.find(b => b.id == billId);
      if (bill) {
        openEditForm(bill);
      }
    }
    
    // 삭제 버튼 클릭 이벤트
    if (event.target.closest('.delete-btn')) {
      const billId = event.target.closest('.delete-btn').dataset.billId;
      const bill = bills.find(b => b.id == billId);
      if (bill) {
        showDeleteConfirmation(bill);
      }
    }
  });
  
  // 검색 버튼 클릭 이벤트
  document.getElementById('searchBtn').addEventListener('click', function() {
    if (!isAuthenticated) {
      showAlert('warning', '검색하려면 먼저 로그인하세요.');
      return;
    }
    
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
  
  // 폼 제출 이벤트
  document.getElementById('submitFormBtn').addEventListener('click', function() {
    if (!isAuthenticated) {
      showAlert('warning', '법안을 등록하려면 먼저 로그인하세요.');
      return;
    }
    submitForm();
  });
  
  // 미리보기 버튼 이벤트
  document.getElementById('previewBtn').addEventListener('click', previewContent);
  
  // 삭제 확인 버튼 이벤트
  document.addEventListener('click', function(event) {
    if (event.target.id === 'confirmDeleteBtn') {
      deleteBill(currentEditingBill.id);
    }
  });
}

// 법안 상세 보기 함수
function viewBillDetails(bill) {
  const modal = new bootstrap.Modal(document.getElementById('viewBillModal'));
  
  // 모달 내용 채우기
  document.getElementById('billTitleDisplay').textContent = bill.bill_name;
  document.getElementById('billProposerDisplay').textContent = bill.writer || '-';
  document.getElementById('billCommitteeDisplay').textContent = bill.committee || '-';
  document.getElementById('billDateDisplay').textContent = formatDate(bill.created_at);
  
  // 내용 표시 (HTML인 경우 iframe에 로드)
  const contentFrame = document.getElementById('billContentFrame');
  if (bill.description && bill.description.trim() !== '') {
    const blob = new Blob([bill.description], { type: 'text/html' });
    contentFrame.src = URL.createObjectURL(blob);
  } else {
    contentFrame.srcdoc = '<div class="p-3">내용이 없습니다.</div>';
  }
  
  modal.show();
}

// 수정 폼 열기 함수
function openEditForm(bill) {
  currentEditingBill = bill;
  
  // 폼 필드 채우기
  document.getElementById('billTitle').value = bill.bill_name;
  document.getElementById('billProposer').value = bill.writer || '';
  document.getElementById('billCommittee').value = bill.committee || '';
  document.getElementById('billContent').value = bill.description || '';
  
  // 폼이 닫혀 있으면 열기
  const formContainer = document.getElementById('formContainer');
  if (!formContainer.classList.contains('show')) {
    document.getElementById('showFormBtn').click();
  }
}

// 폼 제출 함수
async function submitForm() {
  // 폼 데이터 가져오기
  const billTitle = document.getElementById('billTitle').value.trim();
  const billProposer = document.getElementById('billProposer').value.trim();
  const billCommittee = document.getElementById('billCommittee').value;
  const billContent = document.getElementById('billContent').value;
  
  // 유효성 검사
  if (!billTitle) {
    showAlert('warning', '법안명을 입력해주세요.');
    return;
  }
  
  if (!billProposer) {
    showAlert('warning', '담당자를 입력해주세요.');
    return;
  }
  
  try {
    let result;
    
    // 기존 법안 수정 또는 새 법안 등록
    if (currentEditingBill) {
      // 기존 법안 수정
      result = await supabaseClient
        .from('bill')
        .update({
          bill_name: billTitle,
          writer: billProposer,
          committee: billCommittee,
          description: billContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentEditingBill.id);
      
      if (result.error) {
        throw result.error;
      }
      
      showAlert('success', '법안이 성공적으로 수정되었습니다.');
    } else {
      // 새 법안 등록
      result = await supabaseClient
        .from('bill')
        .insert({
          bill_name: billTitle,
          writer: billProposer,
          committee: billCommittee,
          description: billContent
        });
      
      if (result.error) {
        throw result.error;
      }
      
      showAlert('success', '새 법안이 성공적으로 등록되었습니다.');
    }
    
    // 폼 초기화 및 목록 새로고침
    resetForm();
    await loadBills();
    
  } catch (error) {
    console.error('법안 저장 오류:', error);
    showAlert('danger', '법안 저장 중 오류가 발생했습니다: ' + error.message);
  }
}

// 폼 초기화 함수
function resetForm() {
  document.getElementById('billForm').reset();
  
  // 현재 편집 중인 법안 초기화
  currentEditingBill = null;
  
  // 폼 닫기
  const formContainer = document.getElementById('formContainer');
  if (formContainer.classList.contains('show')) {
    document.getElementById('cancelFormBtn').click();
  }
}

// 미리보기 함수
function previewContent() {
  // 내용 가져오기
  const content = document.getElementById('billContent').value;
  
  // 새 창에서 미리보기 열기
  const previewWindow = window.open('', '_blank');
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>미리보기</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body { padding: 20px; }
        .preview-container { max-width: 800px; margin: 0 auto; }
      </style>
    </head>
    <body>
      <div class="preview-container">
        <h4 class="mb-3">미리보기</h4>
        <div class="border p-3 bg-light">
          ${content}
        </div>
      </div>
    </body>
    </html>
  `);
  previewWindow.document.close();
}

// 삭제 확인 모달 표시 함수
function showDeleteConfirmation(bill) {
  currentEditingBill = bill;
  const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
  document.getElementById('deleteBillName').textContent = bill.bill_name;
  modal.show();
}

// 법안 삭제 함수
async function deleteBill(billId) {
  try {
    const { error } = await supabaseClient
      .from('bill')
      .delete()
      .eq('id', billId);
    
    if (error) {
      throw error;
    }
    
    // 모달 닫기
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
    modal.hide();
    
    // 목록 새로고침
    await loadBills();
    showAlert('success', '법안이 성공적으로 삭제되었습니다.');
    
  } catch (error) {
    console.error('법안 삭제 오류:', error);
    showAlert('danger', '법안 삭제 중 오류가 발생했습니다: ' + error.message);
  }
}

// 날짜 포맷 함수
function formatDate(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
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