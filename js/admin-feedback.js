// Supabase 클라이언트 초기화
const supabaseUrl = 'https://rxwztfdnragffxbmlscf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4d3p0ZmRucmFnZmZ4Ym1sc2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NzU2MDgsImV4cCI6MjA1ODA1MTYwOH0.KN8cR6_xHHHfuF1odUi9WwzkbOHCmwuRaK0FYe7b0Ig';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 전역 변수
let feedbacks = [];
let currentPage = 1;
const PAGE_SIZE = 10;
let currentFeedback = null;

// DOM 로드 시 실행
document.addEventListener('DOMContentLoaded', async function() {
    // 관리자 로그인 확인
    const isLoggedIn = await checkAdminLogin();
    if (!isLoggedIn) {
        showLoginForm();
        return;
    }
    
    // 피드백 관리 UI 표시
    showFeedbackManagement();
    
    // 피드백 목록 로드
    loadFeedbacks();
    
    // 이벤트 리스너 등록
    setupEventListeners();
});

// 관리자 로그인 확인 함수
async function checkAdminLogin() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        return !!session;
    } catch (error) {
        console.error('세션 확인 오류:', error);
        return false;
    }
}

// 로그인 폼 표시 함수
function showLoginForm() {
    const mainContainer = document.getElementById('mainContainer');
    const loginForm = `
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-4">
                <div class="card shadow">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0 fs-5">관리자 로그인</h4>
                    </div>
                    <div class="card-body">
                        <form id="loginForm">
                            <div class="mb-3">
                                <label for="loginEmail" class="form-label">이메일</label>
                                <input type="email" class="form-control" id="loginEmail" required>
                            </div>
                            <div class="mb-3">
                                <label for="loginPassword" class="form-label">비밀번호</label>
                                <input type="password" class="form-control" id="loginPassword" required>
                            </div>
                            <div id="loginError" class="alert alert-danger d-none" role="alert"></div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">로그인</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    mainContainer.innerHTML = loginForm;
    
    // 로그인 폼 이벤트 리스너
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

// 로그인 처리 함수
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        errorElement.textContent = '이메일과 비밀번호를 모두 입력해주세요.';
        errorElement.classList.remove('d-none');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // 로그인 성공
        showFeedbackManagement();
        loadFeedbacks();
        setupEventListeners();
        
    } catch (error) {
        console.error('로그인 오류:', error);
        errorElement.textContent = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
        errorElement.classList.remove('d-none');
    }
}

// 피드백 관리 UI 표시 함수
function showFeedbackManagement() {
    const mainContainer = document.getElementById('mainContainer');
    const managementUI = `
        <div class="row mb-4">
            <div class="col-md-6">
                <h2 class="fs-4">피드백 관리</h2>
                <p class="text-muted">사용자가 제출한 피드백을 관리하고 응답할 수 있습니다.</p>
            </div>
            <div class="col-md-6 text-end d-flex justify-content-end align-items-center">
                <select id="filterStatus" class="form-select form-select-sm me-2" style="width: auto;">
                    <option value="all">모든 상태</option>
                    <option value="대기중">대기중</option>
                    <option value="처리중">처리중</option>
                    <option value="완료">완료</option>
                </select>
                <select id="filterType" class="form-select form-select-sm me-2" style="width: auto;">
                    <option value="all">모든 유형</option>
                    <option value="개선요청">개선요청</option>
                    <option value="오류신고">오류신고</option>
                    <option value="칭찬">칭찬</option>
                    <option value="제안">제안</option>
                    <option value="기타">기타</option>
                </select>
                <button id="refreshBtn" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-arrow-clockwise me-1"></i> 새로고침
                </button>
                <button id="logoutBtn" class="btn btn-outline-danger btn-sm ms-2">
                    <i class="bi bi-box-arrow-right me-1"></i> 로그아웃
                </button>
            </div>
        </div>
        
        <div class="card shadow-sm">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="bg-light">
                            <tr>
                                <th style="width: 10%">ID</th>
                                <th style="width: 10%">유형</th>
                                <th style="width: 30%">제목</th>
                                <th style="width: 15%">작성자</th>
                                <th style="width: 15%">작성일</th>
                                <th style="width: 10%">상태</th>
                                <th style="width: 10%">관리</th>
                            </tr>
                        </thead>
                        <tbody id="feedbackTableBody">
                            <!-- 피드백 목록이 동적으로 표시됩니다 -->
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="card-footer">
                <nav aria-label="피드백 페이지네이션">
                    <ul class="pagination justify-content-center mb-0" id="pagination">
                        <!-- 페이지네이션이 동적으로 표시됩니다 -->
                    </ul>
                </nav>
            </div>
        </div>
    `;
    
    mainContainer.innerHTML = managementUI;
}

// 이벤트 리스너 설정 함수
function setupEventListeners() {
    // 새로고침 버튼
    document.getElementById('refreshBtn')?.addEventListener('click', loadFeedbacks);
    
    // 필터링
    document.getElementById('filterStatus')?.addEventListener('change', loadFeedbacks);
    document.getElementById('filterType')?.addEventListener('change', loadFeedbacks);
    
    // 로그아웃 버튼
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
}

// 로그아웃 처리 함수
async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        showLoginForm();
    } catch (error) {
        console.error('로그아웃 오류:', error);
        showAlert('danger', '로그아웃에 실패했습니다.');
    }
}

// 피드백 목록 로드 함수
async function loadFeedbacks() {
    try {
        const statusFilter = document.getElementById('filterStatus')?.value || 'all';
        const typeFilter = document.getElementById('filterType')?.value || 'all';
        
        // 피드백 목록 로드
        let query = supabaseClient
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });
        
        // 필터링 적용
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }
        
        if (typeFilter !== 'all') {
            query = query.eq('type', typeFilter);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        feedbacks = data || [];
        
        // 페이지네이션 설정
        setupPagination(feedbacks.length);
        
        // 현재 페이지의 피드백 표시
        renderFeedbacks(paginate(feedbacks, currentPage, PAGE_SIZE));
        
    } catch (error) {
        console.error('피드백 목록 로드 오류:', error);
        showAlert('danger', '피드백 목록을 불러오는데 실패했습니다.');
    }
}

// 페이지네이션 설정 함수
function setupPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    const pagination = document.getElementById('pagination');
    
    if (!pagination) return;
    
    pagination.innerHTML = '';
    
    // 이전 버튼
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>`;
    pagination.appendChild(prevLi);
    
    // 페이지 번호
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        pagination.appendChild(li);
    }
    
    // 다음 버튼
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>`;
    pagination.appendChild(nextLi);
    
    // 페이지 클릭 이벤트
    pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (!this.parentElement.classList.contains('disabled') && !this.parentElement.classList.contains('active')) {
                currentPage = parseInt(this.dataset.page);
                loadFeedbacks();
            }
        });
    });
}

// 페이지네이션 함수
function paginate(items, currentPage, pageSize) {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
}

// 피드백 렌더링 함수
function renderFeedbacks(feedbacksData) {
    const tableBody = document.getElementById('feedbackTableBody');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (feedbacksData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-3">등록된 피드백이 없습니다.</td>
            </tr>
        `;
        return;
    }
    
    feedbacksData.forEach(feedback => {
        const row = document.createElement('tr');
        
        // 뱃지 색상 설정
        let badgeClass = 'bg-secondary';
        switch (feedback.type) {
            case '개선요청': badgeClass = 'bg-primary'; break;
            case '오류신고': badgeClass = 'bg-danger'; break;
            case '칭찬': badgeClass = 'bg-success'; break;
            case '제안': badgeClass = 'bg-info'; break;
            case '기타': badgeClass = 'bg-secondary'; break;
        }
        
        // 상태에 따른 뱃지 설정
        let statusBadge = '';
        switch (feedback.status) {
            case '대기중': statusBadge = '<span class="badge bg-secondary">대기중</span>'; break;
            case '처리중': statusBadge = '<span class="badge bg-warning text-dark">처리중</span>'; break;
            case '완료': statusBadge = '<span class="badge bg-success">완료</span>'; break;
            default: statusBadge = '<span class="badge bg-secondary">대기중</span>';
        }
        
        // 익명 여부에 따른 작성자 표시
        let writerDisplay = feedback.is_anonymous ? '익명' : (feedback.writer || '익명');
        
        // 관리자에게는 익명 사용자의 실제 정보도 보이도록 표시
        if (feedback.is_anonymous && feedback.writer) {
            writerDisplay = `익명 (${feedback.writer})`;
        }
        
        // 이메일 표시
        if (feedback.email) {
            writerDisplay += `<br><small class="text-muted">${feedback.email}</small>`;
        }
        
        // 행 내용 설정
        row.innerHTML = `
            <td>${feedback.id}</td>
            <td><span class="badge ${badgeClass}">${feedback.type}</span></td>
            <td class="fw-medium">${feedback.title}</td>
            <td>${writerDisplay}</td>
            <td>${formatDate(feedback.created_at)}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-btn" data-id="${feedback.id}">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        `;
        
        // 상세보기 버튼 이벤트
        row.querySelector('.view-btn').addEventListener('click', () => showFeedbackDetail(feedback));
        
        tableBody.appendChild(row);
    });
}

// 피드백 상세보기 함수
function showFeedbackDetail(feedback) {
    currentFeedback = feedback;
    
    // 모달 생성
    const modalHTML = `
        <div class="modal fade" id="feedbackDetailModal" tabindex="-1" aria-labelledby="feedbackDetailModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="feedbackDetailModalLabel">피드백 상세보기</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <h5 id="modalTitle" class="mb-0">${feedback.title}</h5>
                                <div>
                                    <select id="statusSelect" class="form-select form-select-sm" style="width: auto;">
                                        <option value="대기중" ${feedback.status === '대기중' ? 'selected' : ''}>대기중</option>
                                        <option value="처리중" ${feedback.status === '처리중' ? 'selected' : ''}>처리중</option>
                                        <option value="완료" ${feedback.status === '완료' ? 'selected' : ''}>완료</option>
                                    </select>
                                </div>
                            </div>
                            <div class="text-muted small mt-2">
                                <span class="badge ${getBadgeClass(feedback.type)}">${feedback.type}</span>
                                <span class="ms-2">ID: ${feedback.id}</span>
                                <span class="ms-2">작성일: ${formatDate(feedback.created_at, true)}</span>
                            </div>
                            <div class="mt-2">
                                <strong>작성자:</strong> ${feedback.is_anonymous ? '익명' : (feedback.writer || '익명')}
                                ${feedback.is_anonymous && feedback.writer ? `<span class="text-muted">(실제: ${feedback.writer})</span>` : ''}
                                ${feedback.email ? `<br><strong>이메일:</strong> ${feedback.email}` : ''}
                                <br><strong>익명 여부:</strong> ${feedback.is_anonymous ? '익명' : '실명'}
                            </div>
                        </div>
                        <div class="card mb-3">
                            <div class="card-header">피드백 내용</div>
                            <div class="card-body">
                                <p>${feedback.content.replace(/\n/g, '<br>')}</p>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header">답변 작성</div>
                            <div class="card-body">
                                <textarea id="responseText" class="form-control" rows="4" placeholder="답변을 작성해주세요...">${feedback.response || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
                        <button type="button" id="saveResponseBtn" class="btn btn-primary">저장</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('feedbackDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 모달 객체 생성 및 표시
    const modal = new bootstrap.Modal(document.getElementById('feedbackDetailModal'));
    modal.show();
    
    // 저장 버튼 이벤트 리스너
    document.getElementById('saveResponseBtn').addEventListener('click', saveResponse);
    
    // 상태 변경 이벤트 리스너
    document.getElementById('statusSelect').addEventListener('change', updateStatus);
}

// 답변 저장 함수
async function saveResponse() {
    if (!currentFeedback) return;
    
    const responseText = document.getElementById('responseText').value.trim();
    const statusSelect = document.getElementById('statusSelect');
    const status = statusSelect.value;
    
    try {
        // 답변 저장
        const { error } = await supabaseClient
            .from('feedback')
            .update({
                response: responseText,
                response_date: new Date().toISOString(),
                status: status
            })
            .eq('id', currentFeedback.id);
        
        if (error) throw error;
        
        // 성공 메시지
        showAlert('success', '답변이 저장되었습니다.');
        
        // 모달 닫기
        const modal = bootstrap.Modal.getInstance(document.getElementById('feedbackDetailModal'));
        modal.hide();
        
        // 목록 새로고침
        loadFeedbacks();
        
    } catch (error) {
        console.error('답변 저장 오류:', error);
        showAlert('danger', '답변 저장에 실패했습니다.');
    }
}

// 상태 업데이트 함수
async function updateStatus() {
    if (!currentFeedback) return;
    
    const statusSelect = document.getElementById('statusSelect');
    const status = statusSelect.value;
    
    try {
        // 상태 업데이트
        const { error } = await supabaseClient
            .from('feedback')
            .update({ status })
            .eq('id', currentFeedback.id);
        
        if (error) throw error;
        
        // 피드백 객체 업데이트
        currentFeedback.status = status;
        
    } catch (error) {
        console.error('상태 업데이트 오류:', error);
        showAlert('danger', '상태 업데이트에 실패했습니다.');
        
        // 선택 원상복구
        statusSelect.value = currentFeedback.status;
    }
}

// 뱃지 클래스 반환 함수
function getBadgeClass(type) {
    switch (type) {
        case '개선요청': return 'bg-primary';
        case '오류신고': return 'bg-danger';
        case '칭찬': return 'bg-success';
        case '제안': return 'bg-info';
        case '기타': return 'bg-secondary';
        default: return 'bg-secondary';
    }
}

// 날짜 포맷 함수
function formatDate(dateString, includeTime = false) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        return dateString;
    }
    
    // 날짜 형식
    const dateFormat = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    // 시간 포함 여부
    if (includeTime) {
        const timeFormat = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        return `${dateFormat} ${timeFormat}`;
    }
    
    return dateFormat;
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