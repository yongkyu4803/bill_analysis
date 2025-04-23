// admin.js에서 초기화된 supabaseClient를 사용

// 전역 변수
let feedbacks = [];
let currentPage = 1;
const PAGE_SIZE = 10;
let currentFeedback = null;
let currentFilters = {
    status: 'all',
    type: 'all'
};

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
    if (!mainContainer) return;

    mainContainer.innerHTML = `
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

        <!-- 통계 영역 -->
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">피드백 현황</h5>
                        <p class="mb-2">전체 피드백: <span id="totalFeedbackCount">0</span>건</p>
                        <p class="mb-0">미처리 피드백: <span id="pendingFeedbackCount">0</span>건</p>
                        <span id="newFeedbackBadge" class="badge bg-danger" style="display: none;">0</span>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">유형별 통계</h5>
                        <div id="feedbackTypeChart">
                            <!-- 차트가 동적으로 로드됩니다 -->
                        </div>
                    </div>
                </div>
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
        let query = supabaseClient
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        // 필터 적용
        if (currentFilters.status !== 'all') {
            query = query.eq('status', currentFilters.status);
        }
        if (currentFilters.type !== 'all') {
            query = query.eq('type', currentFilters.type);
        }

        const { data: feedbackData, error } = await query;

        if (error) throw error;

        feedbacks = feedbackData;
        renderFeedbacks();
        updateFeedbackStats();
        
    } catch (error) {
        console.error('피드백 로드 오류:', error);
        showAlert('danger', '피드백 목록을 불러오는 중 오류가 발생했습니다.');
    }
}

// 피드백 목록 렌더링
function renderFeedbacks() {
    const tableBody = document.getElementById('feedbackTableBody');
    if (!tableBody) return;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const pageData = feedbacks.slice(startIndex, endIndex);

    tableBody.innerHTML = '';

    if (pageData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-3">등록된 피드백이 없습니다.</td>
            </tr>
        `;
        return;
    }

    pageData.forEach(feedback => {
        const row = document.createElement('tr');
        
        // 뱃지 색상 설정
        let badgeClass = 'bg-secondary';
        switch (feedback.type) {
            case '개선요청': badgeClass = 'bg-primary'; break;
            case '오류신고': badgeClass = 'bg-danger'; break;
            case '칭찬': badgeClass = 'bg-success'; break;
            case '제안': badgeClass = 'bg-info'; break;
        }
        
        // 상태에 따른 뱃지 설정
        let statusBadge = '';
        switch (feedback.status) {
            case '대기중': statusBadge = '<span class="badge bg-secondary">대기중</span>'; break;
            case '처리중': statusBadge = '<span class="badge bg-warning text-dark">처리중</span>'; break;
            case '완료': statusBadge = '<span class="badge bg-success">완료</span>'; break;
            default: statusBadge = '<span class="badge bg-secondary">대기중</span>';
        }

        // 작성자 표시 처리
        let writerDisplay = feedback.is_anonymous ? '익명' : (feedback.writer || '익명');
        if (feedback.is_anonymous && feedback.writer) {
            writerDisplay = `익명 (${feedback.writer})`;
        }

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

    renderPagination();
}

// 페이지네이션 렌더링
function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    const totalPages = Math.ceil(feedbacks.length / PAGE_SIZE);
    
    let paginationHTML = '';
    
    // 이전 페이지 버튼
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">이전</a>
        </li>
    `;

    // 페이지 번호
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    // 다음 페이지 버튼
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">다음</a>
        </li>
    `;

    pagination.innerHTML = paginationHTML;

    // 페이지 클릭 이벤트
    pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const newPage = parseInt(e.target.dataset.page);
            if (newPage >= 1 && newPage <= totalPages) {
                currentPage = newPage;
                loadFeedbacks();
            }
        });
    });
}

// 피드백 상세 정보 표시
function showFeedbackDetail(feedback) {
    currentFeedback = feedback;
    
    const modalBody = document.querySelector('#feedbackDetailModal .modal-body');
    modalBody.innerHTML = `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span class="badge ${getFeedbackTypeBadgeClass(feedback.type)}">${feedback.type}</span>
                <span class="text-muted small">작성일: ${formatDate(feedback.created_at)}</span>
            </div>
            <div class="card-body">
                <h5 class="card-title">${feedback.title}</h5>
                <div class="mb-3">
                    <strong>작성자:</strong> ${feedback.is_anonymous ? '익명' : (feedback.writer || '익명')}
                    ${feedback.is_anonymous && feedback.writer ? `<span class="text-muted">(실제: ${feedback.writer})</span>` : ''}
                    ${feedback.email ? `<br><strong>이메일:</strong> ${feedback.email}` : ''}
                </div>
                <div class="card mb-3">
                    <div class="card-body bg-light">
                        <p class="card-text">${feedback.content.replace(/\n/g, '<br>')}</p>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">상태</label>
                    <select class="form-select" id="statusSelect">
                        <option value="대기중" ${feedback.status === '대기중' ? 'selected' : ''}>대기중</option>
                        <option value="처리중" ${feedback.status === '처리중' ? 'selected' : ''}>처리중</option>
                        <option value="완료" ${feedback.status === '완료' ? 'selected' : ''}>완료</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">답변</label>
                    <textarea class="form-control" id="responseText" rows="4">${feedback.response || ''}</textarea>
                </div>
                <div class="text-end">
                    <button class="btn btn-primary" id="saveResponseBtn">
                        <i class="bi bi-check-lg me-1"></i>저장
                    </button>
                </div>
            </div>
        </div>
    `;

    // 상태 변경 이벤트
    document.getElementById('statusSelect').addEventListener('change', updateStatus);
    
    // 저장 버튼 이벤트
    document.getElementById('saveResponseBtn').addEventListener('click', saveResponse);

    // 모달 표시
    const modal = new bootstrap.Modal(document.getElementById('feedbackDetailModal'));
    modal.show();
}

// 피드백 답변 저장
async function saveResponse() {
    if (!currentFeedback) return;

    const response = document.getElementById('responseText').value;
    const status = document.getElementById('statusSelect').value;
    
    // 답변 내용 유효성 검사
    if (!response.trim()) {
        showAlert('warning', '답변 내용을 입력해주세요.');
        return;
    }

    // 완료 상태 시 답변 필수 체크
    if (status === '완료' && !response.trim()) {
        showAlert('warning', '완료 상태로 변경하기 전에 답변을 입력해주세요.');
        return;
    }

    const responseDate = status === '완료' ? new Date().toISOString() : null;

    try {
        const { error } = await supabaseClient
            .from('feedback')
            .update({
                response,
                status,
                response_date: responseDate,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentFeedback.id);

        if (error) throw error;

        showAlert('success', '답변이 저장되었습니다.');
        loadFeedbacks();
        
        // 모달 닫기
        const modal = bootstrap.Modal.getInstance(document.getElementById('feedbackDetailModal'));
        modal.hide();

    } catch (error) {
        console.error('답변 저장 오류:', error);
        showAlert('danger', '답변 저장 중 오류가 발생했습니다.');
    }
}

// 피드백 상태 업데이트
async function updateStatus(e) {
    if (!currentFeedback) return;

    const newStatus = e.target.value;
    const currentResponse = document.getElementById('responseText').value;
    
    // 완료 상태 변경 시 답변 필수 체크
    if (newStatus === '완료' && !currentResponse.trim()) {
        showAlert('warning', '완료 상태로 변경하기 전에 답변을 입력해주세요.');
        e.target.value = currentFeedback.status;
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('feedback')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentFeedback.id);

        if (error) throw error;

        currentFeedback.status = newStatus;
        showAlert('success', '상태가 업데이트되었습니다.');
        loadFeedbacks();

    } catch (error) {
        console.error('상태 업데이트 오류:', error);
        showAlert('danger', '상태 업데이트 중 오류가 발생했습니다.');
        e.target.value = currentFeedback.status;
    }
}

// 피드백 통계 업데이트
function updateFeedbackStats() {
    // 전체 피드백 수
    document.getElementById('totalFeedbackCount').textContent = feedbacks.length;

    // 미처리 피드백 수
    const pendingCount = feedbacks.filter(f => f.status === '대기중').length;
    document.getElementById('pendingFeedbackCount').textContent = pendingCount;

    // 새로운 피드백 배지 업데이트
    const badge = document.getElementById('newFeedbackBadge');
    if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }

    // 유형별 통계 차트 업데이트
    updateFeedbackTypeChart();
}

// 유형별 통계 차트 업데이트
function updateFeedbackTypeChart() {
    const typeStats = {};
    feedbacks.forEach(feedback => {
        typeStats[feedback.type] = (typeStats[feedback.type] || 0) + 1;
    });

    const chartContainer = document.getElementById('feedbackTypeChart');
    chartContainer.innerHTML = '';

    Object.entries(typeStats).forEach(([type, count]) => {
        const percentage = (count / feedbacks.length * 100).toFixed(1);
        const badgeClass = getFeedbackTypeBadgeClass(type);

        chartContainer.innerHTML += `
            <div class="mb-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="badge ${badgeClass}">${type}</span>
                    <small>${count}건 (${percentage}%)</small>
                </div>
                <div class="progress" style="height: 10px;">
                    <div class="progress-bar ${badgeClass}" role="progressbar" 
                         style="width: ${percentage}%" 
                         aria-valuenow="${percentage}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
            </div>
        `;
    });
}

// 유틸리티 함수
function getFeedbackTypeBadgeClass(type) {
    switch (type) {
        case '개선요청': return 'bg-primary';
        case '오류신고': return 'bg-danger';
        case '칭찬': return 'bg-success';
        case '제안': return 'bg-info';
        default: return 'bg-secondary';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// 알림 표시 함수
function showAlert(type, message, duration = 3000) {
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
    
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }
    }, duration);
} 