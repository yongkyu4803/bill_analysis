// 전역 변수 선언
let bills = [];
let currentEditingBill = null;
let isAuthenticated = false; // 인증 상태를 추적하는 변수
let meetings = [];
let currentEditingMeeting = null;

// 페이지 로드 시 실행되는 초기화 함수
document.addEventListener('DOMContentLoaded', async function() {
  console.log('관리자 페이지 초기화 중...');
  
  // 폼 컨테이너 초기에 숨김 처리
  const formContainer = document.getElementById('formContainer');
  if (formContainer) {
    formContainer.style.display = 'none';
    console.log('폼 컨테이너 초기 숨김 처리 완료');
  }
  
  // 모달 템플릿 로드
  loadModalTemplates();
  
  // 세션 확인
  await checkSession();
  
  // 이벤트 리스너 등록
  setupEventListeners();
  
  // 새 법안 등록 버튼 이벤트 리스너 추가
  const showFormBtn = document.getElementById('showFormBtn');
  if (showFormBtn) {
    showFormBtn.addEventListener('click', function() {
      console.log('새 법안 등록 버튼 클릭됨');
      // 수정 중인 법안 초기화
      currentEditingBill = null;
      
      // 폼 필드 초기화
      document.getElementById('billForm').reset();
      
      // 폼 표시
      const formContainer = document.getElementById('formContainer');
      formContainer.style.display = 'block';
      formContainer.classList.add('show');
      
      // 저장 버튼 텍스트 설정
      const submitBtn = document.getElementById('submitFormBtn');
      if (submitBtn) {
        submitBtn.textContent = '등록';
      }
    });
  }
  
  // 폼 취소 버튼 이벤트 리스너 추가
  const cancelFormBtn = document.getElementById('cancelFormBtn');
  if (cancelFormBtn) {
    cancelFormBtn.addEventListener('click', function() {
      console.log('폼 취소 버튼 클릭됨');
      resetForm();
    });
  }
  
  // 폼 제출 버튼 이벤트 리스너 - 직접 추가
  const submitFormBtn = document.getElementById('submitFormBtn');
  if (submitFormBtn) {
    // 이벤트 리스너 중복 방지를 위해 기존 리스너 제거
    submitFormBtn.removeEventListener('click', submitForm);
    
    // 새 이벤트 리스너 추가
    submitFormBtn.addEventListener('click', function(event) {
      console.log('폼 제출 버튼 클릭됨', '인증 상태:', isAuthenticated);
      if (!isAuthenticated) {
        showAlert('warning', '법안을 등록하려면 먼저 로그인하세요.');
        return;
      }
      submitForm();
    });
    
    console.log('폼 제출 버튼에 이벤트 리스너 직접 추가 완료');
  }
  
  // 미리보기 버튼 이벤트 리스너 추가
  const previewBtn = document.getElementById('previewBtn');
  if (previewBtn) {
    previewBtn.addEventListener('click', function() {
      console.log('미리보기 버튼 클릭됨');
      previewContent();
    });
    console.log('미리보기 버튼에 이벤트 리스너 추가 완료');
  }

  // 입력 유형 선택에 따른 필드 표시/숨김 처리
  const inputTypeSelect = document.getElementById('inputType');
  const billFields = document.getElementById('billFields');
  const meetingFields = document.getElementById('meetingFields');
  
  if (inputTypeSelect) {
    inputTypeSelect.addEventListener('change', function() {
      const selectedType = this.value;
      
      // 모든 필드 숨기기
      billFields.style.display = 'none';
      meetingFields.style.display = 'none';
      
      // 선택된 유형의 필드만 표시
      if (selectedType === 'bill') {
        billFields.style.display = 'block';
      } else if (selectedType === 'meeting') {
        meetingFields.style.display = 'block';
      }
    });
  }
  
  // 데이터 입력 폼 제출 처리
  const dataInputForm = document.getElementById('dataInputForm');
  if (dataInputForm) {
    dataInputForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // 로딩 상태 표시
      const submitBtn = document.getElementById('submitDataBtn');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 저장 중...';
      
      try {
        const inputType = document.getElementById('inputType').value;
        let data = {};
        
        if (inputType === 'bill') {
          // 법안 데이터 수집
          data = {
            bill_name: document.getElementById('billName').value,
            writer: document.getElementById('billWriter').value,
            committee: document.getElementById('billCommitteeSelect').value,
            description_markdown: document.getElementById('billDescription').value,
            created_at: new Date().toISOString()
          };
          
          // Supabase에 법안 데이터 저장
          const { error } = await supabaseClient
            .from('bill')
            .insert([data]);
          
          if (error) throw error;
          
        } else if (inputType === 'meeting') {
          // 상임위원회 회의 데이터 수집
          data = {
            meeting_name: document.getElementById('meetingName').value,
            committee: document.getElementById('meetingCommittee').value,
            meeting_date: document.getElementById('meetingDate').value,
            bill_name: document.getElementById('relatedBill').value,
            description_markdown: document.getElementById('meetingDescription').value,
            created_at: new Date().toISOString()
          };
          
          // Supabase에 회의 데이터 저장
          const { error } = await supabaseClient
            .from('committee_meeting')
            .insert([data]);
          
          if (error) throw error;
        }
        
        // 성공 메시지 표시
        showAlert('success', '데이터가 성공적으로 저장되었습니다.');
        
        // 폼 초기화
        dataInputForm.reset();
        billFields.style.display = 'none';
        meetingFields.style.display = 'none';
        
        // 법안 목록 새로고침
        if (inputType === 'bill') {
          await loadBills();
        }
        
      } catch (error) {
        console.error('데이터 저장 오류:', error);
        showAlert('danger', '데이터 저장 중 오류가 발생했습니다: ' + error.message);
      } finally {
        // 버튼 상태 복원
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }

  // 회의록 관련 이벤트 리스너 등록
  setupMeetingEventListeners();
  
  // 인증된 경우 회의록 목록 로드
  if (isAuthenticated) {
    await loadMeetings();
  }
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

// 인증된 사용자용 UI 업데이트
function updateUIForAuthenticatedUser(user) {
  // 로그인 버튼 텍스트 설정
  const loginBtn = document.getElementById('loginBtn');
  loginBtn.innerHTML = '<i class="bi bi-box-arrow-right me-1"></i>로그아웃';
  loginBtn.classList.remove('btn-outline-light');
  loginBtn.classList.add('btn-outline-danger');
  
  // 관리자 정보 표시
  const adminInfo = document.getElementById('adminInfo');
  adminInfo.innerHTML = `
    <p class="mb-1"><strong>이메일:</strong> ${user.email}</p>
    <p class="mb-1"><strong>역할:</strong> 관리자</p>
    <small class="text-success">로그인 됨</small>
  `;
  
  // 등록 폼 활성화
  document.getElementById('showFormBtn').disabled = false;
  
  // 방문자 통계 로드
  loadVisitStatistics();
  
  // 법안 목록 로드
  loadBills();
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

// 모달 템플릿 로드 함수
function loadModalTemplates() {
  const modalContainer = document.getElementById('modalContainer');
  
  // 단순화된 모달 템플릿 사용
  const basicModalTemplate = `
    <!-- 로그인 모달 -->
    <div class="modal fade" id="loginModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="loginModalTitle">관리자 로그인</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="loginModalBody">
            <!-- 내용은 동적으로 삽입됩니다 -->
          </div>
        </div>
      </div>
    </div>

    <!-- 상세 보기 모달 -->
    <div class="modal fade" id="viewBillModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="viewBillModalTitle">법안 상세 보기</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="viewBillModalBody">
            <!-- 내용은 동적으로 삽입됩니다 -->
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 삭제 확인 모달 -->
    <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="deleteConfirmModalTitle">삭제 확인</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="deleteConfirmModalBody">
            <!-- 내용은 동적으로 삽입됩니다 -->
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
  modalContainer.innerHTML = basicModalTemplate;
}

// 로그인 모달 표시 함수
function showLoginModal() {
  // 모달 객체 가져오기
  const modal = new bootstrap.Modal(document.getElementById('loginModal'));
  
  // 모달 내용 동적 생성
  const modalBody = document.getElementById('loginModalBody');
  modalBody.innerHTML = `
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
  `;
  
  // 폼 이벤트 리스너 추가
  document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    handleLogin(event);
  });
  
  // 모달 표시
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

// 법안 목록 로드 함수
async function loadBills() {
  try {
    // Supabase 연결 테스트 (간단한 쿼리로 변경)
    console.log('Supabase 연결 테스트 중...');
    const { error: testError } = await supabaseClient
      .from('bill') // 테이블 이름 확인: 'bill'
      .select('id', { count: 'exact', head: true }); // 헤더만 요청하여 데이터 전송량 최소화
    
    if (testError) {
      console.error('Supabase 연결 오류:', testError.message);
      console.error('오류 상세 정보:', testError);
      showAlert('danger', `서버 연결 오류: ${testError.message}. 콘솔을 확인해주세요.`);
      return;
    }
    console.log('Supabase 연결 확인됨');

    // 법안 목록 가져오기
    const { data, error } = await supabaseClient
      .from('bill')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('법안 목록 로드 오류:', error.message);
      console.error('오류 상세 정보:', error);
      showAlert('danger', `법안 목록 로드 오류: ${error.message}`);
      return;
    }
    
    bills = data;
    renderBillList(data);
    
  } catch (error) {
    console.error('법안 목록 로드 중 예외 발생:', error);
    showAlert('danger', `법안 목록 로드 중 오류 발생: ${error.message}`);
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
    
    // 수정 버튼 생성
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-outline-primary btn-sm me-1'; // me-1로 변경하여 여백 추가
    editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
    editBtn.dataset.billId = bill.id;
    
    // 삭제 버튼 생성
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-outline-danger btn-sm';
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
    deleteBtn.dataset.billId = bill.id;
    
    // 버튼 그룹 추가
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group btn-group-sm';
    btnGroup.appendChild(editBtn);
    btnGroup.appendChild(deleteBtn);
    actionsCell.appendChild(btnGroup);
    
    // 수정 버튼 클릭 이벤트 추가
    editBtn.addEventListener('click', function() {
      console.log('Edit button direct click handler triggered for bill ID:', bill.id);
      openEditForm(bill);
    });
    
    // 삭제 버튼 클릭 이벤트 추가
    deleteBtn.addEventListener('click', function() {
      console.log('Delete button direct click handler triggered for bill ID:', bill.id);
      showDeleteConfirmation(bill);
    });
    
    row.appendChild(nameCell);
    row.appendChild(committeeCell);
    row.appendChild(proposerCell);
    row.appendChild(dateCell);
    row.appendChild(actionsCell);
    
    tableBody.appendChild(row);
  });
  
  console.log('Bill list rendered with', billsData.length, 'items. Direct event handlers attached to edit/delete buttons.');
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
  
  // 문서 전체 클릭 이벤트 위임 (디버깅 로그 추가)
  document.addEventListener('click', function(event) {
    console.log('Document clicked. Target:', event.target);
    
    if (!isAuthenticated) {
      console.log('Click ignored: User not authenticated.');
      return; // 인증되지 않은 경우 이벤트 무시
    }
    
    // 법안 제목 클릭
    if (event.target.closest('.bill-title')) {
      console.log('Bill title clicked.');
      const row = event.target.closest('tr');
      const index = Array.from(row.parentNode.children).indexOf(row);
      if (bills[index]) {
        viewBillDetails(bills[index]);
      } else {
        console.error('Could not find bill for clicked title.');
      }
    }
    
    // 수정 버튼 클릭 (디버깅 로그 추가)
    const editButton = event.target.closest('.edit-btn');
    if (editButton) {
      console.log('Edit button clicked.');
      const billId = editButton.dataset.billId;
      console.log('Attempting to edit bill with ID:', billId);
      const bill = bills.find(b => b.id == billId);
      if (bill) {
        console.log('Bill found:', bill);
        openEditForm(bill);
      } else {
        console.error('Could not find bill with ID:', billId, 'in bills array:', bills);
      }
    }
    
    // 삭제 버튼 클릭 (디버깅 로그 추가)
    const deleteButton = event.target.closest('.delete-btn');
    if (deleteButton) {
      console.log('Delete button clicked.');
      const billId = deleteButton.dataset.billId;
      console.log('Attempting to delete bill with ID:', billId);
      const bill = bills.find(b => b.id == billId);
      if (bill) {
        console.log('Bill found for deletion:', bill);
        showDeleteConfirmation(bill);
      } else {
        console.error('Could not find bill for deletion with ID:', billId);
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
}

// 법안 상세 보기 함수
function viewBillDetails(bill) {
  console.log('viewBillDetails 함수 실행. bill:', bill);
  
  try {
    // 이미 존재하는 모달 인스턴스 제거 
    const existingModal = bootstrap.Modal.getInstance(document.getElementById('viewBillModal'));
    if (existingModal) {
      existingModal.dispose();
      console.log('기존 모달 인스턴스 제거됨');
    }
    
    // 기본 정보 생성
    const modalBody = document.getElementById('viewBillModalBody');
    modalBody.innerHTML = `
      <div class="bill-details">
        <h3 class="mb-3">${bill.bill_name}</h3>
        <div class="mb-3">
          <div class="row">
            <div class="col-md-6">
              <p><strong>담당자:</strong> ${bill.writer || '-'}</p>
            </div>
            <div class="col-md-6">
              <p><strong>위원회:</strong> ${bill.committee || '-'}</p>
            </div>
          </div>
          <p><strong>등록일:</strong> ${formatDate(bill.created_at)}</p>
        </div>
      </div>
      
      <!-- 탭 인터페이스 -->
      <ul class="nav nav-tabs mb-3" id="contentTabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" id="html-tab" data-bs-toggle="tab" data-bs-target="#html-view" type="button" role="tab">HTML 보기</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="text-tab" data-bs-toggle="tab" data-bs-target="#text-view" type="button" role="tab">텍스트 보기</button>
        </li>
      </ul>
      
      <div class="tab-content">
        <div class="tab-pane fade show active" id="html-view" role="tabpanel">
          <div id="billContentDisplay" class="border rounded p-3 bg-light overflow-auto" style="max-height: 500px;">
            <div class="text-center p-3">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">로딩 중...</span>
              </div>
              <p class="mt-2">내용을 불러오는 중...</p>
            </div>
          </div>
        </div>
        <div class="tab-pane fade" id="text-view" role="tabpanel">
          <div id="billTextDisplay" class="border rounded p-3 bg-light overflow-auto" style="max-height: 500px; white-space: pre-wrap;">
            <div class="text-center p-3">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">로딩 중...</span>
              </div>
              <p class="mt-2">내용을 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 모달 객체 새로 생성 및 표시
    const modal = new bootstrap.Modal(document.getElementById('viewBillModal'), {
      backdrop: 'static', // 배경 클릭으로 닫히지 않음
      keyboard: true // ESC로 닫기 가능
    });
    
    // 모달 표시
    modal.show();
    console.log('상세 보기 모달 표시됨');
    
    // 내용 표시 - 별도 처리하여 모달이 먼저 표시되도록 함
    setTimeout(() => {
      try {
        // HTML 내용 표시
        const contentDisplay = document.getElementById('billContentDisplay');
        if (bill.description && bill.description.trim() !== '') {
          // 안전하게 처리된 HTML로 표시
          contentDisplay.innerHTML = sanitizeHtml(bill.description);
        } else {
          contentDisplay.innerHTML = '<div class="p-3">내용이 없습니다.</div>';
        }
        
        // 순수 텍스트 버전 표시
        const textDisplay = document.getElementById('billTextDisplay');
        if (bill.description && bill.description.trim() !== '') {
          // HTML에서 텍스트만 추출
          const parser = new DOMParser();
          const doc = parser.parseFromString(bill.description, 'text/html');
          textDisplay.textContent = doc.body.textContent || '텍스트 내용을 추출할 수 없습니다.';
        } else {
          textDisplay.textContent = '내용이 없습니다.';
        }
        
        console.log('법안 내용 표시 완료');
      } catch (error) {
        console.error('내용 표시 중 오류 발생:', error);
      }
    }, 300);
  } catch (error) {
    console.error('모달 초기화 중 오류 발생:', error);
    showAlert('danger', '상세 정보를 표시하는 중 오류가 발생했습니다.');
  }
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

// 수정 폼 열기 함수
function openEditForm(bill) {
    console.log('openEditForm 함수 실행. bill:', bill);
    
    // 현재 편집 중인 법안으로 설정
    currentEditingBill = bill;
    
    // 폼 필드에 데이터 채우기
    document.getElementById('billTitle').value = bill.bill_name || '';
    document.getElementById('billProposer').value = bill.writer || '';
    document.getElementById('billCommittee').value = bill.committee || '';
    
    // HTML 내용 채우기
    const htmlEditor = document.getElementById('billContent');
    if (htmlEditor) {
        htmlEditor.value = bill.description || '';
        console.log('HTML 내용 설정 완료. 길이:', (bill.description || '').length);
    }
    
    // 마크다운 내용 채우기
    const markdownEditor = document.getElementById('markdownContent');
    if (markdownEditor) {
        if (bill.description_markdown) {
            console.log('마크다운 원본 데이터 발견:', bill.description_markdown.substring(0, 100) + '...');
            markdownEditor.value = bill.description_markdown;
        } else if (bill.description) {
            console.log('마크다운 데이터 없음, HTML에서 변환 시도 중...');
            try {
                const convertedMarkdown = convertHtmlToMarkdown(bill.description);
                console.log('HTML → 마크다운 변환 완료. 변환된 마크다운 길이:', convertedMarkdown.length);
                markdownEditor.value = convertedMarkdown;
            } catch (error) {
                console.error('HTML → 마크다운 변환 오류:', error);
                markdownEditor.value = '';
            }
        } else {
            console.log('HTML과 마크다운 모두 없음. 빈 내용으로 설정');
            markdownEditor.value = '';
        }
    } else {
        console.error('마크다운 에디터 요소를 찾을 수 없음! ID: markdownContent');
    }
    
    // 폼 표시
    const formContainer = document.getElementById('formContainer');
    formContainer.style.display = 'block';
    
    // bootstrap 5의 경우 collapse 클래스 관리
    formContainer.classList.add('show');
    
    // 저장 버튼 텍스트 변경
    const submitBtn = document.getElementById('submitFormBtn');
    if (submitBtn) {
        submitBtn.textContent = '수정';
    }
    
    // 폼으로 스크롤
    formContainer.scrollIntoView({ behavior: 'smooth' });
}

// 폼 제출 함수
async function submitForm() {
    console.log('폼 제출 처리 시작');
    
    // 필수 필드 검증
    const billTitle = document.getElementById('billTitle').value.trim();
    const billProposer = document.getElementById('billProposer').value.trim();
    
    if (!billTitle) {
        showAlert('warning', '법안 제목을 입력해주세요.');
        document.getElementById('billTitle').focus();
        return;
    }
    
    if (!billProposer) {
        showAlert('warning', '담당자 이름을 입력해주세요.');
        document.getElementById('billProposer').focus();
        return;
    }
    
    // 현재 활성화된 탭 확인 (마크다운 또는 HTML)
    const mdTab = document.getElementById('markdownTab');
    const htmlTab = document.getElementById('htmlTab');
    const isMarkdownTabActive = mdTab && mdTab.classList.contains('active');
    const isHtmlTabActive = htmlTab && htmlTab.classList.contains('active');
    
    console.log('현재 탭 상태:', { 마크다운: isMarkdownTabActive, HTML: isHtmlTabActive });
    
    // 법안 데이터 객체 초기화
    const billData = {
        bill_name: billTitle,
        writer: billProposer,
        committee: document.getElementById('billCommittee').value,
        created_at: new Date().toISOString()
    };
    
    if (isMarkdownTabActive) {
        // 마크다운 탭이 활성화된 경우
        const markdownContent = document.getElementById('markdownContent').value;
        console.log('[폼제출] 마크다운 입력 길이:', markdownContent ? markdownContent.length : 0);
        console.log('[폼제출] 마크다운 데이터 샘플:', markdownContent ? markdownContent.substring(0, 100) + '...' : '없음');
        
        // 마크다운 원본 저장
        billData.description_markdown = markdownContent;
        
        // HTML로 변환하여 description에도 저장
        billData.description = convertMarkdownToHtml(markdownContent);
        console.log('[폼제출] HTML 변환 결과 길이:', billData.description ? billData.description.length : 0);
    } else {
        // HTML 탭이 활성화된 경우 (기본값)
        billData.description = document.getElementById('billContent').value;
        console.log('[폼제출] HTML 입력 길이:', billData.description ? billData.description.length : 0);
    }
    
    console.log('저장할 데이터 필드:', Object.keys(billData).join(', '));
    
    try {
        // 저장 버튼 비활성화
        const submitBtn = document.getElementById('submitFormBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>저장 중...';
        
        let result;
        
        if (currentEditingBill) {
            // 기존 법안 수정
            console.log(`법안 ID ${currentEditingBill.id} 수정 중...`);
            result = await supabaseClient
                .from('bill')
                .update(billData)
                .eq('id', currentEditingBill.id);
            
            if (result.error) throw result.error;
            console.log('법안 수정 완료:', result);
            showAlert('success', '법안이 성공적으로 수정되었습니다.');
        } else {
            // 새 법안 등록
            console.log('새 법안 등록 중...');
            result = await supabaseClient
                .from('bill')
                .insert([billData]);
            
            if (result.error) throw result.error;
            console.log('새 법안 등록 완료:', result);
            showAlert('success', '새 법안이 성공적으로 등록되었습니다.');
        }
        
        // 폼 초기화 및 닫기
        resetForm();
        
        // 법안 목록 새로고침
        await loadBills();
        
    } catch (error) {
        console.error('법안 저장 중 오류:', error);
        showAlert('danger', `법안 저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        // 저장 버튼 상태 복원
        const submitBtn = document.getElementById('submitFormBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = currentEditingBill ? '수정' : '등록';
    }
}

// 폼 초기화 함수
function resetForm() {
  console.log('resetForm 함수 실행');
  document.getElementById('billForm').reset();
  
  // 현재 편집 중인 법안 초기화
  currentEditingBill = null;
  
  // 폼 닫기 (display 속성 사용)
  const formContainer = document.getElementById('formContainer');
  formContainer.style.display = 'none';
  formContainer.classList.remove('show');
  
  // 저장 버튼 텍스트 다시 '등록'으로 변경
  const submitBtn = document.getElementById('submitFormBtn');
  if (submitBtn) {
    submitBtn.textContent = '등록';
  }
  
  console.log('폼 초기화 및 숨김 처리 완료');
}

// 미리보기 함수
function previewContent() {
  console.log('미리보기 함수 실행');
  
  // 현재 활성화된 탭 확인 (마크다운 또는 HTML)
  const mdTab = document.getElementById('markdownTab');
  const htmlTab = document.getElementById('htmlTab');
  const isMarkdownTabActive = mdTab && mdTab.classList.contains('active');
  
  let content = '';
  
  if (isMarkdownTabActive) {
    // 마크다운 탭이 활성화된 경우
    const markdownContent = document.getElementById('markdownContent').value;
    console.log('마크다운 미리보기 - 원본 길이:', markdownContent ? markdownContent.length : 0);
    content = convertMarkdownToHtml(markdownContent);
    console.log('마크다운 → HTML 변환 완료 - 변환 후 길이:', content ? content.length : 0);
  } else {
    // HTML 탭이 활성화된 경우 (기본값)
    content = document.getElementById('billContent').value;
    console.log('HTML 미리보기 - 원본 길이:', content ? content.length : 0);
  }
  
  if (!content.trim()) {
    alert('미리보기할 내용이 없습니다. 먼저 내용을 입력해주세요.');
    return;
  }
  
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
        body { padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .preview-container { max-width: 800px; margin: 0 auto; }
        .header { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .content { border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="preview-container">
        <div class="header d-flex justify-content-between align-items-center">
          <h4 class="mb-0">미리보기</h4>
          <small class="text-muted">${isMarkdownTabActive ? '마크다운에서 변환됨' : 'HTML 직접 표시'}</small>
        </div>
        <div class="content">
          ${content}
        </div>
      </div>
    </body>
    </html>
  `);
  previewWindow.document.close();
  console.log('미리보기 창 열림');
}

// 삭제 확인 모달 표시 함수
function showDeleteConfirmation(bill) {
  console.log('showDeleteConfirmation 함수 실행. bill:', bill);
  currentEditingBill = bill;
  
  try {
    // 기존 모달 인스턴스 제거
    const existingModal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
    if (existingModal) {
      existingModal.dispose();
      console.log('기존 삭제 확인 모달 인스턴스 제거됨');
    }
    
    // 모달 내용 동적 생성
    const modalBody = document.getElementById('deleteConfirmModalBody');
    modalBody.innerHTML = `
      <p>정말 이 법안을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.</p>
      <p><strong>${bill.bill_name}</strong></p>
    `;
    
    // 새 모달 객체 생성
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'), {
      backdrop: 'static'
    });
    
    // 삭제 버튼 이벤트 리스너 추가 (기존 리스너 제거 후)
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const newConfirmDeleteBtn = confirmDeleteBtn.cloneNode(true);
    confirmDeleteBtn.parentNode.replaceChild(newConfirmDeleteBtn, confirmDeleteBtn);
    
    newConfirmDeleteBtn.addEventListener('click', function() {
      console.log('삭제 확인 버튼 클릭됨. ID:', currentEditingBill.id);
      deleteBill(currentEditingBill.id);
    });
    
    // 모달 표시
    modal.show();
    console.log('삭제 확인 모달 표시됨');
  } catch (error) {
    console.error('삭제 확인 모달 초기화 중 오류:', error);
    showAlert('danger', '삭제 확인 대화상자를 표시하는 중 오류가 발생했습니다.');
  }
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

// 방문자 통계 로드 함수
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
      .select('count, visit_date')
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
    
    // 방문자 차트 그리기 (최근 7일)
    if (allData && allData.length > 0) {
      drawVisitsChart(allData);
    }
    
  } catch (error) {
    console.error('방문 통계 로드 중 오류 발생:', error);
  }
}

// 방문자 차트 그리기 함수
function drawVisitsChart(visitsData) {
  // 최근 7일 데이터만 추출
  const recentData = visitsData.slice(-7);
  
  // 차트 컨테이너
  const chartContainer = document.getElementById('visitsChart');
  if (!chartContainer) return;
  
  // 간단한 차트 HTML 생성
  let chartHTML = '<div class="mt-3 small">';
  chartHTML += '<p class="text-muted mb-2">최근 7일 방문자 통계</p>';
  
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

// HTML을 마크다운으로 변환하는 함수
function convertHtmlToMarkdown(html) {
    console.log('HTML → 마크다운 변환 시작');
    
    if (!html || typeof html !== 'string') {
        console.warn('변환할 HTML이 없거나 문자열이 아닙니다');
        return '';
    }
    
    try {
        // TurndownService 라이브러리 사용
        if (typeof TurndownService === 'undefined') {
            console.error('TurndownService가 로드되지 않았습니다');
            return html;
        }
        
        const turndownService = new TurndownService({
            headingStyle: 'atx',         // # 스타일 헤더
            bulletListMarker: '-',       // 글머리 기호로 하이픈 사용
            codeBlockStyle: 'fenced',    // ```로 코드 블록 사용
            emDelimiter: '_'             // 기울임꼴에 _사용
        });
        
        const markdown = turndownService.turndown(html);
        console.log('HTML → 마크다운 변환 완료, 길이:', markdown.length);
        return markdown;
    } catch (error) {
        console.error('HTML → 마크다운 변환 오류:', error);
        return html; // 오류 시 원본 반환
    }
}

// 마크다운을 HTML로 변환하는 함수
function convertMarkdownToHtml(markdown) {
    console.log('마크다운 → HTML 변환 시작');
    
    if (!markdown || typeof markdown !== 'string') {
        console.warn('변환할 마크다운이 없거나 문자열이 아닙니다');
        return '';
    }
    
    try {
        // marked 라이브러리 사용
        if (typeof marked === 'undefined') {
            console.error('marked 라이브러리가 로드되지 않았습니다');
            return `<p>${markdown}</p>`;
        }
        
        // marked 옵션 설정
        marked.setOptions({
            breaks: true,       // 줄바꿈 허용
            gfm: true,          // GitHub Flavored Markdown 사용
            headerIds: true,    // 헤더에 ID 추가
            mangle: false,      // 헤더 ID에 유니크 접미사 추가 안함
            sanitize: false     // HTML 태그 허용
        });
        
        const html = marked.parse(markdown);
        console.log('마크다운 → HTML 변환 완료, 길이:', html.length);
        return html;
    } catch (error) {
        console.error('마크다운 → HTML 변환 오류:', error);
        return `<p>${markdown}</p>`; // 오류 시 기본 p 태그로 감싸서 반환
    }
}

// 회의록 관련 이벤트 리스너 설정
function setupMeetingEventListeners() {
    // 회의록 등록 버튼 이벤트
    const showMeetingFormBtn = document.getElementById('showMeetingFormBtn');
    if (showMeetingFormBtn) {
        showMeetingFormBtn.addEventListener('click', function() {
            console.log('회의록 등록 버튼 클릭됨');
            currentEditingMeeting = null;
            document.getElementById('meetingForm').reset();
            document.getElementById('submitMeetingFormBtn').textContent = '등록';
        });
    }

    // 회의록 폼 취소 버튼 이벤트
    const cancelMeetingFormBtn = document.getElementById('cancelMeetingFormBtn');
    if (cancelMeetingFormBtn) {
        cancelMeetingFormBtn.addEventListener('click', function() {
            console.log('회의록 폼 취소 버튼 클릭됨');
            resetMeetingForm();
        });
    }

    // 회의록 폼 제출 이벤트
    const meetingForm = document.getElementById('meetingForm');
    if (meetingForm) {
        meetingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await submitMeetingForm();
        });
    }

    // 회의록 미리보기 버튼 이벤트
    const previewMeetingBtn = document.getElementById('previewMeetingBtn');
    if (previewMeetingBtn) {
        previewMeetingBtn.addEventListener('click', function() {
            previewMeetingContent();
        });
    }
}

// 회의록 목록 로드 함수
async function loadMeetings() {
    try {
        const { data, error } = await supabaseClient
            .from('committee_meeting')
            .select('*')
            .order('meeting_date', { ascending: false });

        if (error) throw error;

        meetings = data;
        renderMeetingList(data);
        updateMeetingStatistics(data);
        
    } catch (error) {
        console.error('회의록 목록 로드 오류:', error);
        showAlert('danger', '회의록 목록을 불러오는 중 오류가 발생했습니다.');
    }
}

// 회의록 목록 렌더링 함수
function renderMeetingList(meetingsData) {
    const tableBody = document.getElementById('meetingTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!meetingsData || meetingsData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-3">등록된 회의록이 없습니다.</td>
            </tr>
        `;
        return;
    }

    meetingsData.forEach(meeting => {
        const row = document.createElement('tr');
        
        // 회의명
        const titleCell = document.createElement('td');
        titleCell.innerHTML = `<span class="meeting-title cursor-pointer">${meeting.meeting_name}</span>`;
        
        // 위원회
        const committeeCell = document.createElement('td');
        committeeCell.innerHTML = `<span class="badge bg-secondary">${meeting.committee || '-'}</span>`;
        
        // 회의일자
        const meetingDateCell = document.createElement('td');
        meetingDateCell.textContent = formatDate(meeting.meeting_date);
        
        // 등록일
        const createdAtCell = document.createElement('td');
        createdAtCell.textContent = formatDate(meeting.created_at);
        
        // 관리 버튼
        const actionsCell = document.createElement('td');
        actionsCell.className = 'text-end';
        
        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group btn-group-sm';
        
        // 수정 버튼
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn-outline-primary btn-sm me-1';
        editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
        editBtn.addEventListener('click', () => openMeetingEditForm(meeting));
        
        // 삭제 버튼
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-outline-danger btn-sm';
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
        deleteBtn.addEventListener('click', () => showMeetingDeleteConfirmation(meeting));
        
        btnGroup.appendChild(editBtn);
        btnGroup.appendChild(deleteBtn);
        actionsCell.appendChild(btnGroup);
        
        // 행에 셀 추가
        row.appendChild(titleCell);
        row.appendChild(committeeCell);
        row.appendChild(meetingDateCell);
        row.appendChild(createdAtCell);
        row.appendChild(actionsCell);
        
        // 제목 클릭 이벤트
        titleCell.addEventListener('click', () => viewMeetingDetails(meeting));
        
        tableBody.appendChild(row);
    });
}

// 회의록 통계 업데이트 함수
function updateMeetingStatistics(meetingsData) {
    // 전체 회의록 수
    const totalCount = meetingsData.length;
    document.getElementById('totalMeetingsCount').textContent = totalCount;

    // 이번 달 회의록 수
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const monthlyCount = meetingsData.filter(meeting => {
        const meetingDate = new Date(meeting.meeting_date);
        return meetingDate.getMonth() === thisMonth && meetingDate.getFullYear() === thisYear;
    }).length;
    document.getElementById('monthlyMeetingsCount').textContent = monthlyCount;

    // 위원회별 통계 차트
    const committeeStats = {};
    meetingsData.forEach(meeting => {
        if (meeting.committee) {
            committeeStats[meeting.committee] = (committeeStats[meeting.committee] || 0) + 1;
        }
    });

    // 차트 데이터 생성 및 표시
    const chartContainer = document.getElementById('committeeMeetingsChart');
    if (chartContainer) {
        let chartHTML = '<div class="mt-3 small">';
        
        Object.entries(committeeStats).forEach(([committee, count]) => {
            const percentage = Math.round((count / totalCount) * 100);
            chartHTML += `
                <div class="mb-2">
                    <div class="d-flex justify-content-between mb-1">
                        <span>${committee}</span>
                        <span class="text-primary">${count}건</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-info" role="progressbar" 
                             style="width: ${percentage}%" 
                             aria-valuenow="${percentage}" 
                             aria-valuemin="0" 
                             aria-valuemax="100"></div>
                    </div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }
}

// 회의록 폼 제출 처리 함수
async function submitMeetingForm() {
    try {
        const content = document.getElementById('meetingContent').value;
        const htmlContent = convertMarkdownToHtml(content);
        
        const meetingData = {
            meeting_name: document.getElementById('meetingTitle').value,
            committee: document.getElementById('meetingCommitteeSelect').value,
            meeting_date: document.getElementById('meetingDate').value,
            bill_name: document.getElementById('relatedBills').value,
            description_markdown: content,           // 원본 마크다운 저장
            description: htmlContent,               // 변환된 HTML 저장
            created_at: new Date().toISOString()
        };

        const submitBtn = document.getElementById('submitMeetingFormBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>저장 중...';

        let result;
        if (currentEditingMeeting) {
            // 수정
            result = await supabaseClient
                .from('committee_meeting')
                .update(meetingData)
                .eq('id', currentEditingMeeting.id);
        } else {
            // 새로 등록
            result = await supabaseClient
                .from('committee_meeting')
                .insert([meetingData]);
        }

        if (result.error) throw result.error;

        showAlert('success', `회의록이 성공적으로 ${currentEditingMeeting ? '수정' : '등록'}되었습니다.`);
        resetMeetingForm();
        await loadMeetings();

    } catch (error) {
        console.error('회의록 저장 오류:', error);
        showAlert('danger', '회의록 저장 중 오류가 발생했습니다.');
    } finally {
        const submitBtn = document.getElementById('submitMeetingFormBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = currentEditingMeeting ? '수정' : '등록';
    }
}

// 회의록 수정 폼 열기 함수
function openMeetingEditForm(meeting) {
    currentEditingMeeting = meeting;
    
    document.getElementById('meetingTitle').value = meeting.meeting_name;
    document.getElementById('meetingCommitteeSelect').value = meeting.committee;
    document.getElementById('meetingDate').value = meeting.meeting_date;
    document.getElementById('relatedBills').value = meeting.bill_name || '';
    document.getElementById('meetingContent').value = meeting.description_markdown || meeting.description || '';
    
    document.getElementById('submitMeetingFormBtn').textContent = '수정';
    
    const formContainer = document.getElementById('meetingFormContainer');
    formContainer.classList.add('show');
    formContainer.scrollIntoView({ behavior: 'smooth' });
}

// 회의록 삭제 확인 모달 표시 함수
function showMeetingDeleteConfirmation(meeting) {
    const modalBody = document.getElementById('deleteConfirmModalBody');
    modalBody.innerHTML = `
        <p>다음 회의록을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.</p>
        <p><strong>${meeting.meeting_name}</strong></p>
        <p class="text-muted mb-0">회의일자: ${formatDate(meeting.meeting_date)}</p>
    `;

    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    confirmDeleteBtn.onclick = async () => {
        await deleteMeeting(meeting.id);
        modal.hide();
    };
    
    modal.show();
}

// 회의록 삭제 함수
async function deleteMeeting(meetingId) {
    try {
        const { error } = await supabaseClient
            .from('committee_meeting')
            .delete()
            .eq('id', meetingId);

        if (error) throw error;

        showAlert('success', '회의록이 성공적으로 삭제되었습니다.');
        await loadMeetings();

    } catch (error) {
        console.error('회의록 삭제 오류:', error);
        showAlert('danger', '회의록 삭제 중 오류가 발생했습니다.');
    }
}

// 회의록 상세 보기 함수
function viewMeetingDetails(meeting) {
    const modalTitle = document.getElementById('viewBillModalTitle');
    const modalBody = document.getElementById('viewBillModalBody');
    
    modalTitle.textContent = '회의록 상세 보기';
    modalBody.innerHTML = `
        <div class="meeting-details">
            <h3 class="mb-3">${meeting.meeting_name}</h3>
            <div class="mb-3">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>위원회:</strong> ${meeting.committee || '-'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>회의일자:</strong> ${formatDate(meeting.meeting_date)}</p>
                    </div>
                </div>
                <p><strong>관련 법안:</strong> ${meeting.bill_name || '-'}</p>
                <p><strong>등록일:</strong> ${formatDate(meeting.created_at)}</p>
            </div>
            <div class="border rounded p-3 bg-light">
                <h4 class="fs-5 mb-3">회의 내용</h4>
                <div class="meeting-content">
                    ${meeting.description_markdown ? convertMarkdownToHtml(meeting.description_markdown) : (meeting.description || '내용이 없습니다.')}
                </div>
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('viewBillModal'));
    modal.show();
}

// 회의록 폼 초기화 함수
function resetMeetingForm() {
    document.getElementById('meetingForm').reset();
    currentEditingMeeting = null;
    
    const formContainer = document.getElementById('meetingFormContainer');
    formContainer.classList.remove('show');
    
    document.getElementById('submitMeetingFormBtn').textContent = '등록';
}