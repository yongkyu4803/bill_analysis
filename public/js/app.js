// 전역 변수
let bills = [];
let currentBill = null;
let isAdmin = false; // 관리자 권한 상태 저장
let currentUser = null; // 현재 로그인한 사용자

// Supabase 초기화
const SUPABASE_URL = 'https://your-supabase-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';
let supabase = null;

document.addEventListener('DOMContentLoaded', function() {
    // Supabase 클라이언트 초기화
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // 세션 확인 및 사용자 상태 복원
        checkSession();
        
        // 초기 데이터 로드
        fetchBills();
    } catch (error) {
        console.error('Supabase 초기화 오류:', error);
        showAlert('데이터베이스 연결에 실패했습니다.', 'danger');
    }

    // 이벤트 리스너 설정
    document.getElementById('addBillBtn').addEventListener('click', () => openBillModal());
    document.getElementById('saveBillBtn').addEventListener('click', saveBill);
    document.getElementById('editBillBtn').addEventListener('click', editCurrentBill);
    
    // 로그인 버튼이 있는 경우에만 이벤트 리스너 추가
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', openLoginModal);
    }
    
    // 검색 기능
    document.getElementById('searchInput').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        filterBills(searchTerm);
    });
    
    // 권한에 따른 UI 초기화
    updateUIByPermission();

    // Supabase가 초기화된 후 초기 설정 실행
    setTimeout(() => {
        if (supabase) {
            initializeSupabase().catch(err => {
                console.error('Supabase 초기 설정 오류:', err);
            });
        }
    }, 1000);
});

// 세션 확인 및 로그인 상태 복원
async function checkSession() {
    try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (data && data.session) {
            currentUser = data.session.user;
            // 관리자 역할 확인
            await checkUserRole();
        }
    } catch (error) {
        console.error('세션 확인 오류:', error);
    }
}

// 사용자 역할 확인
async function checkUserRole() {
    if (!currentUser) return;
    
    try {
        // 사용자 정보 조회 - Supabase에서 사용자 메타데이터 또는 역할 테이블 확인
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();
            
        if (error) throw error;
        
        // 관리자 역할인지 확인
        isAdmin = data && data.role === 'admin';
        updateUIByPermission();
        
    } catch (error) {
        console.error('사용자 역할 확인 오류:', error);
    }
}

// 관리자 권한에 따른 UI 업데이트
function updateUIByPermission() {
    // 관리자 권한이 필요한 버튼들
    const adminOnlyElements = [
        document.getElementById('addBillBtn'),
        ...document.querySelectorAll('.admin-only')
    ];
    
    // 권한에 따라 표시/숨김 처리
    adminOnlyElements.forEach(element => {
        if (element) {
            element.style.display = isAdmin ? 'inline-flex' : 'none';
        }
    });
    
    // 로그인 버튼 텍스트 변경
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        if (currentUser) {
            loginBtn.innerHTML = '<i class="bi bi-person-fill me-1"></i>로그아웃';
        } else {
            loginBtn.innerHTML = '<i class="bi bi-person-fill me-1"></i>로그인';
        }
    }
}

// 로그인 모달 열기
function openLoginModal() {
    // 이미 로그인된 상태라면 로그아웃
    if (currentUser) {
        logout();
        return;
    }
    
    // 모달 HTML 생성
    const modalHtml = `
        <div class="modal fade" id="loginModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">로그인</h5>
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
                        </form>
                        <div class="mt-3">
                            <p class="text-center mb-2">또는</p>
                            <button type="button" class="btn btn-outline-secondary w-100 mb-2" id="googleLoginBtn">
                                <i class="bi bi-google me-2"></i>Google 계정으로 로그인
                            </button>
                            <p class="small text-center mt-3">
                                계정이 없으신가요? <a href="#" id="showSignupBtn">회원가입</a>
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
                        <button type="button" class="btn btn-primary" id="doLoginBtn">로그인</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달 제거 후 추가
    const existingModal = document.getElementById('loginModal');
    if (existingModal) {
        existingModal.remove();
    }
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 로그인 버튼 이벤트 추가
    document.getElementById('doLoginBtn').addEventListener('click', loginWithEmail);
    document.getElementById('googleLoginBtn').addEventListener('click', loginWithGoogle);
    document.getElementById('showSignupBtn').addEventListener('click', showSignupForm);
    
    // 모달 표시
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

// 회원가입 폼 표시
function showSignupForm() {
    // 모달 닫기
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    loginModal.hide();
    
    // 회원가입 모달 HTML
    const signupModalHtml = `
        <div class="modal fade" id="signupModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">회원가입</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="signupForm">
                            <div class="mb-3">
                                <label for="signupEmail" class="form-label">이메일</label>
                                <input type="email" class="form-control" id="signupEmail" required>
                            </div>
                            <div class="mb-3">
                                <label for="signupPassword" class="form-label">비밀번호</label>
                                <input type="password" class="form-control" id="signupPassword" required>
                                <div class="form-text">비밀번호는 최소 6자 이상이어야 합니다.</div>
                            </div>
                            <div class="mb-3">
                                <label for="confirmPassword" class="form-label">비밀번호 확인</label>
                                <input type="password" class="form-control" id="confirmPassword" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
                        <button type="button" class="btn btn-primary" id="doSignupBtn">가입하기</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 모달 추가
    document.body.insertAdjacentHTML('beforeend', signupModalHtml);
    
    // 회원가입 버튼 이벤트 추가
    document.getElementById('doSignupBtn').addEventListener('click', signup);
    
    // 모달 표시
    const signupModal = new bootstrap.Modal(document.getElementById('signupModal'));
    signupModal.show();
}

// 이메일/비밀번호로 로그인
async function loginWithEmail() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showAlert('이메일과 비밀번호를 입력해주세요.', 'warning');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // 로그인 성공
        currentUser = data.user;
        
        // 관리자 역할 확인
        await checkUserRole();
        
        // 모달 닫기
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        loginModal.hide();
        
        showAlert('로그인되었습니다.', 'success');
    } catch (error) {
        console.error('로그인 오류:', error);
        showAlert('로그인에 실패했습니다: ' + error.message, 'danger');
    }
}

// Google로 로그인
async function loginWithGoogle() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        
        // OAuth 리디렉션이 진행됨
    } catch (error) {
        console.error('Google 로그인 오류:', error);
        showAlert('Google 로그인에 실패했습니다: ' + error.message, 'danger');
    }
}

// 회원가입
async function signup() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!email || !password) {
        showAlert('이메일과 비밀번호를 입력해주세요.', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('비밀번호가 일치하지 않습니다.', 'warning');
        return;
    }
    
    if (password.length < 6) {
        showAlert('비밀번호는 6자 이상이어야 합니다.', 'warning');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: 'user' // 기본 역할은 일반 사용자
                }
            }
        });
        
        if (error) throw error;
        
        // 회원가입 성공
        const signupModal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
        signupModal.hide();
        
        showAlert('회원가입이 완료되었습니다. 이메일 확인을 통해 계정을 활성화해주세요.', 'success');
    } catch (error) {
        console.error('회원가입 오류:', error);
        showAlert('회원가입에 실패했습니다: ' + error.message, 'danger');
    }
}

// 로그아웃
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        // 로그아웃 성공
        currentUser = null;
        isAdmin = false;
        updateUIByPermission();
        
        showAlert('로그아웃되었습니다.', 'info');
    } catch (error) {
        console.error('로그아웃 오류:', error);
        showAlert('로그아웃에 실패했습니다: ' + error.message, 'danger');
    }
}

// 법안 목록 가져오기
async function fetchBills() {
    try {
        const billList = document.getElementById('billList');
        billList.innerHTML = '<tr><td colspan="5" class="text-center">법안을 불러오는 중...</td></tr>';

        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        bills = data || [];
        renderBillList(bills);
    } catch (error) {
        showAlert('법안 목록을 불러오는데 실패했습니다: ' + error.message, 'danger');
        console.error('Error fetching bills:', error);
    }
}

// 법안 목록 렌더링
function renderBillList(bills) {
    const billList = document.getElementById('billList');
    
    if (bills.length === 0) {
        billList.innerHTML = '<tr><td colspan="5" class="text-center">등록된 법안이 없습니다.</td></tr>';
        return;
    }
    
    billList.innerHTML = bills.map((bill, index) => {
        const createdAt = new Date(bill.created_at).toLocaleDateString('ko-KR');
        return `
            <tr>
                <td>${index + 1}</td>
                <td><a href="#" onclick="viewBillDetails(${bill.id})">${bill.name}</a></td>
                <td>${bill.proposer}</td>
                <td>${createdAt}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewBillDetails(${bill.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary admin-only" onclick="openBillModal(${bill.id})" style="${isAdmin ? '' : 'display:none;'}">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 법안 상세 정보 보기
async function viewBillDetails(billId) {
    try {
        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .eq('id', billId)
            .single();

        if (error) throw error;

        // HTML 내용인지 확인
        const hasHtml = data.description && 
            (data.description.includes('<!DOCTYPE html>') || data.description.includes('<html>'));
        
        const detailContent = document.getElementById('billDetailContent');
        const billDetailTitle = document.getElementById('billDetailTitle');
        
        billDetailTitle.textContent = data.name;
        
        // 상세 내용 구성
        let contentHtml = `
            <div class="mb-4">
                <h6 class="fw-bold">제안자</h6>
                <p>${data.proposer}</p>
            </div>
            <div class="mb-4">
                <h6 class="fw-bold">등록일</h6>
                <p>${new Date(data.created_at).toLocaleDateString('ko-KR')}</p>
            </div>
            <div>
                <h6 class="fw-bold">상세 내용</h6>
                <div id="billDescriptionContent" class="border p-3 rounded bg-light">
                    ${hasHtml 
                        ? `<iframe id="htmlContentFrame" style="width:100%; height:500px; border:none;"></iframe>`
                        : `<div>${data.description || '내용 없음'}</div>`
                    }
                </div>
            </div>
        `;
        
        detailContent.innerHTML = contentHtml;
        
        // HTML 내용이면 iframe에 렌더링
        if (hasHtml) {
            const iframe = document.getElementById('htmlContentFrame');
            iframe.onload = function() {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                iframeDoc.open();
                iframeDoc.write(data.description);
                iframeDoc.close();
            };
            // iframe 로드 트리거
            if (iframe.contentDocument) {
                iframe.contentDocument.open();
                iframe.contentDocument.write(data.description);
                iframe.contentDocument.close();
            }
        }
        
        // 현재 선택된 법안 ID 저장
        document.querySelector('#editBillBtn').dataset.billId = billId;
        
        // 관리자 권한에 따라 편집 버튼 표시 여부 설정
        document.querySelector('#editBillBtn').style.display = isAdmin ? 'inline-block' : 'none';
        
        // 모달 표시
        const billDetailModal = new bootstrap.Modal(document.getElementById('billDetailModal'));
        billDetailModal.show();
    } catch (error) {
        showAlert('법안 상세 정보를 불러오는데 실패했습니다: ' + error.message, 'danger');
        console.error('Error fetching bill details:', error);
    }
}

// 법안 등록/수정 모달 열기
async function openBillModal(billId = null) {
    // 관리자가 아니면 접근 차단
    if (!isAdmin) {
        showAlert('관리자 권한이 필요합니다.', 'warning');
        return;
    }
    
    // 모달 내용 초기화
    document.getElementById('billId').value = '';
    document.getElementById('billName').value = '';
    document.getElementById('billProposer').value = '';
    document.getElementById('billDescription').value = '';
    
    // 모달 타이틀 설정
    document.getElementById('billModalLabel').textContent = billId ? '법안 수정' : '법안 등록';
    
    if (billId) {
        try {
            // 기존 법안 데이터 로드
            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .eq('id', billId)
                .single();
                
            if (error) throw error;
            
            // 폼에 데이터 채우기
            document.getElementById('billId').value = data.id;
            document.getElementById('billName').value = data.name;
            document.getElementById('billProposer').value = data.proposer;
            document.getElementById('billDescription').value = data.description || '';
        } catch (error) {
            showAlert('법안 정보를 불러오는데 실패했습니다: ' + error.message, 'danger');
            console.error('Error fetching bill for edit:', error);
            return;
        }
    }
    
    // 모달 표시
    const billModal = new bootstrap.Modal(document.getElementById('billModal'));
    billModal.show();
}

// 법안 저장 (등록/수정)
async function saveBill() {
    // 관리자가 아니면 접근 차단
    if (!isAdmin) {
        showAlert('관리자 권한이 필요합니다.', 'warning');
        return;
    }
    
    const billId = document.getElementById('billId').value;
    const name = document.getElementById('billName').value.trim();
    const proposer = document.getElementById('billProposer').value.trim();
    const description = document.getElementById('billDescription').value;
    
    if (!name || !proposer) {
        showAlert('법안명과 제안자는 필수 입력 항목입니다.', 'warning');
        return;
    }
    
    const billData = {
        name,
        proposer,
        description
    };
    
    try {
        let result;
        
        if (billId) {
            // 수정
            result = await supabase
                .from('bills')
                .update(billData)
                .eq('id', billId);
                
            if (result.error) throw result.error;
            showAlert('법안이 성공적으로 수정되었습니다.', 'success');
        } else {
            // 신규 등록
            billData.created_at = new Date().toISOString();
            
            result = await supabase
                .from('bills')
                .insert([billData]);
                
            if (result.error) throw result.error;
            showAlert('법안이 성공적으로 등록되었습니다.', 'success');
        }
        
        // 모달 닫기
        const billModal = bootstrap.Modal.getInstance(document.getElementById('billModal'));
        billModal.hide();
        
        // 목록 새로고침
        fetchBills();
    } catch (error) {
        showAlert(`법안 ${billId ? '수정' : '등록'}에 실패했습니다: ` + error.message, 'danger');
        console.error('Error saving bill:', error);
    }
}

// 현재 선택된 법안 수정하기
function editCurrentBill() {
    // 관리자가 아니면 접근 차단
    if (!isAdmin) {
        showAlert('관리자 권한이 필요합니다.', 'warning');
        return;
    }
    
    const billId = document.querySelector('#editBillBtn').dataset.billId;
    
    if (billId) {
        // 상세 모달 닫기
        const detailModal = bootstrap.Modal.getInstance(document.getElementById('billDetailModal'));
        detailModal.hide();
        
        // 편집 모달 열기
        openBillModal(billId);
    }
}

// 법안 목록 필터링
function filterBills(searchTerm) {
    const rows = document.querySelectorAll('#billList tr');
    
    rows.forEach(row => {
        const nameCell = row.querySelector('td:nth-child(2)');
        const proposerCell = row.querySelector('td:nth-child(3)');
        
        if (!nameCell || !proposerCell) return; // 헤더나 빈 행 건너뛰기
        
        const name = nameCell.textContent.toLowerCase();
        const proposer = proposerCell.textContent.toLowerCase();
        
        if (name.includes(searchTerm) || proposer.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// 알림 표시
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alertHtml = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHtml);
    
    // 3초 후 자동으로 알림 제거
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            const bsAlert = new bootstrap.Alert(alertElement);
            bsAlert.close();
        }
    }, 3000);
}

// 분석 보고서 표시
function showAnalysisReport() {
    const modalHtml = `
        <div class="modal fade" id="analysisReportModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
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
    
    // 모달이 존재하지 않으면 추가
    if (!document.getElementById('analysisReportModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    const modal = new bootstrap.Modal(document.getElementById('analysisReportModal'));
    modal.show();
    
    // iframe에 HTML 내용 설정
    setTimeout(() => {
        const iframe = document.getElementById('analysisReportFrame');
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>법안 분석 보고서</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
                    .report-header { background: #f8f9fa; padding: 20px; margin-bottom: 30px; border-bottom: 2px solid #dee2e6; }
                    .section { margin-bottom: 30px; }
                    .section-title { color: #0d6efd; border-bottom: 1px solid #dee2e6; padding-bottom: 8px; margin-bottom: 15px; }
                    .subsection { margin-bottom: 20px; }
                    .subsection-title { color: #495057; margin-bottom: 10px; }
                    .impact-high { color: #dc3545; }
                    .impact-medium { color: #fd7e14; }
                    .impact-low { color: #198754; }
                    table { width: 100%; margin-bottom: 20px; }
                    th { background-color: #e9ecef; }
                </style>
            </head>
            <body>
                <div class="container my-5">
                    <div class="report-header text-center">
                        <h1>전자상거래법 개정안 분석 보고서</h1>
                        <p class="lead">2024년 4월 21일</p>
                    </div>
                    
                    <div class="section">
                        <h2 class="section-title">개요</h2>
                        <p>본 보고서는 최근 제안된 "전자상거래 소비자보호법 개정안"에 대한 심층 분석을 제공합니다. 해당 법안은 온라인 플랫폼 사업자의 책임을 강화하고, 소비자 보호 체계를 개선하는 내용을 담고 있습니다.</p>
                    </div>
                    
                    <div class="section">
                        <h2 class="section-title">배경</h2>
                        <p>전자상거래 시장의 급격한 성장과 함께 새로운 유형의 거래방식이 등장하면서 기존 법체계로는 규제의 사각지대가 발생하고 있습니다. 특히 최근 5년간 온라인 플랫폼 관련 소비자 피해가 지속적으로 증가하고 있으며, 특히 코로나19 이후 비대면 거래 확대로 인한 소비자 피해 사례가 급증하고 있습니다.</p>
                        
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>연도</th>
                                        <th>소비자 피해 신고 건수</th>
                                        <th>전년 대비 증가율</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>2020</td>
                                        <td>15,234건</td>
                                        <td>-</td>
                                    </tr>
                                    <tr>
                                        <td>2021</td>
                                        <td>18,567건</td>
                                        <td>21.9%</td>
                                    </tr>
                                    <tr>
                                        <td>2022</td>
                                        <td>23,982건</td>
                                        <td>29.2%</td>
                                    </tr>
                                    <tr>
                                        <td>2023</td>
                                        <td>28,456건</td>
                                        <td>18.7%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2 class="section-title">주요 내용</h2>
                        
                        <div class="subsection">
                            <h3 class="subsection-title">1. 온라인 플랫폼 사업자의 책임 강화</h3>
                            <ul>
                                <li>플랫폼 사업자의 법적 지위 명확화 (제2조 개정)</li>
                                <li>플랫폼 이용사업자에 대한 관리·감독 의무 신설 (제24조의2 신설)</li>
                                <li>소비자 피해 발생 시 연대책임 범위 확대 (제25조 개정)</li>
                                <li>정보 제공 의무 강화 및 투명성 확보 방안 (제13조 개정)</li>
                            </ul>
                        </div>
                        
                        <div class="subsection">
                            <h3 class="subsection-title">2. 소비자 보호 체계 개선</h3>
                            <ul>
                                <li>청약철회 기간 연장 (14일 → 30일) (제17조 개정)</li>
                                <li>소비자 분쟁해결 절차 간소화 (제33조 개정)</li>
                                <li>과징금 부과 기준 강화 (최대 매출액의 3% → 5%) (제40조 개정)</li>
                                <li>집단분쟁조정제도 활성화 방안 (제36조 개정)</li>
                            </ul>
                        </div>
                        
                        <div class="subsection">
                            <h3 class="subsection-title">3. 디지털 콘텐츠 거래 규정 신설</h3>
                            <ul>
                                <li>디지털 콘텐츠 정의 및 범위 규정 (제2조 개정)</li>
                                <li>디지털 콘텐츠 거래의 청약철회 특례 규정 (제17조의2 신설)</li>
                                <li>디지털 콘텐츠 품질 보증 의무 (제19조의2 신설)</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2 class="section-title">이해관계자 분석</h2>
                        
                        <div class="card mb-4">
                            <div class="card-header">플랫폼 사업자</div>
                            <div class="card-body">
                                <p><strong>예상 반응:</strong> 강한 반대</p>
                                <p><strong>주요 우려사항:</strong></p>
                                <ul>
                                    <li>연대책임 확대로 인한 법적 리스크 및 비용 부담 증가</li>
                                    <li>사업자 관리·감독 의무 신설에 따른 운영 비용 증가</li>
                                    <li>과징금 부과 기준 강화로 인한 위험 증가</li>
                                </ul>
                                <p><strong>대응 전략:</strong> 한국온라인쇼핑협회를 중심으로 공동 대응 준비 중. 책임 범위의 명확한 한정 및 단계적 시행을 요구할 것으로 예상.</p>
                            </div>
                        </div>
                        
                        <div class="card mb-4">
                            <div class="card-header">소비자단체</div>
                            <div class="card-body">
                                <p><strong>예상 반응:</strong> 강한 지지</p>
                                <p><strong>핵심 지지 사항:</strong></p>
                                <ul>
                                    <li>플랫폼 사업자의 책임 강화를 통한 소비자 보호 확대</li>
                                    <li>청약철회 기간 연장 및 분쟁해결 절차 간소화</li>
                                </ul>
                                <p><strong>요구 사항:</strong> 법안의 실효성 확보를 위한 구체적인 시행방안 마련과 모니터링 체계 구축 요구</p>
                            </div>
                        </div>
                        
                        <div class="card mb-4">
                            <div class="card-header">중소 입점업체</div>
                            <div class="card-body">
                                <p><strong>예상 반응:</strong> 혼합 (부분 지지 / 부분 우려)</p>
                                <p><strong>우려사항:</strong></p>
                                <ul>
                                    <li>플랫폼의 책임 강화로 인한 입점 심사 강화 및 진입장벽 상승 우려</li>
                                    <li>플랫폼의 비용 부담 증가가 수수료 인상으로 전가될 가능성</li>
                                </ul>
                                <p><strong>지지사항:</strong> 플랫폼-입점업체 간 공정한 거래관계 형성에 기여할 것으로 기대</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2 class="section-title">예상 영향 평가</h2>
                        
                        <div class="subsection">
                            <h3 class="subsection-title">1. 경제적 영향</h3>
                            <ul>
                                <li class="impact-high">플랫폼 사업자: 단기적으로 법적 대응 및 시스템 개선 비용 증가 (연간 약 1,500억원 추정)</li>
                                <li class="impact-medium">소비자: 피해구제 가능성 향상으로 경제적 손실 감소 (연간 약 800억원 추정)</li>
                                <li class="impact-medium">중소 입점업체: 플랫폼 수수료 인상 가능성으로 인한 비용 부담 증가 우려</li>
                            </ul>
                        </div>
                        
                        <div class="subsection">
                            <h3 class="subsection-title">2. 시장 구조적 영향</h3>
                            <ul>
                                <li class="impact-high">대형 플랫폼의 시장 지배력 강화 가능성: 규제 대응 능력이 있는 대형 사업자 중심으로 시장 재편</li>
                                <li class="impact-medium">해외 플랫폼과의 규제 격차 발생 가능성: 국내 사업자에 대한 규제 강화로 인한 역차별 우려</li>
                                <li class="impact-low">신규 비즈니스 모델 출현: 규제 공백을 활용한 새로운 형태의 서비스 등장 가능성</li>
                            </ul>
                        </div>
                        
                        <div class="subsection">
                            <h3 class="subsection-title">3. 법적 영향</h3>
                            <ul>
                                <li class="impact-medium">관련 소송 증가 예상: 책임 소재 관련 분쟁 증가 가능성</li>
                                <li class="impact-medium">타 법률과의 중복 규제 가능성: 공정거래법, 대규모유통업법 등과의 규제 중복 검토 필요</li>
                                <li class="impact-low">국제 규제 동향과의 조화: EU의 디지털 서비스법(DSA)과의 규제 정합성 검토 필요</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2 class="section-title">결론 및 제언</h2>
                        <p>본 법안은 변화하는 전자상거래 환경에서 소비자 보호를 강화하기 위한 필요한 개정으로 판단됩니다. 다만, 법안의 효과적인 시행과 시장의 혼란을 최소화하기 위해 다음과 같은 보완이 필요합니다:</p>
                        
                        <ol>
                            <li><strong>단계적 시행 방안 마련:</strong> 플랫폼 사업자의 규모에 따른 차등적·단계적 적용을 통해 시장 충격 완화</li>
                            <li><strong>명확한 가이드라인 제공:</strong> 플랫폼 사업자의 책임 범위와 관련한 구체적인 지침 마련</li>
                            <li><strong>해외 사업자 규제 방안:</strong> 국내외 사업자 간 규제 형평성 확보를 위한 방안 마련</li>
                            <li><strong>중소 입점업체 보호 장치:</strong> 플랫폼의 책임 강화가 중소 입점업체에게 부당하게 전가되지 않도록 보호 장치 마련</li>
                        </ol>
                        
                        <p>상기 제언을 반영한 수정안 마련 시, 전자상거래 생태계의 지속가능한 발전과 소비자 보호의 균형을 달성할 수 있을 것으로 기대됩니다.</p>
                    </div>
                </div>
                
                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
            </body>
            </html>
        `);
        iframeDoc.close();
    }, 100);
}

// Supabase 초기 설정 실행
async function initializeSupabase() {
    try {
        // 사용자 프로필 테이블이 있는지 확인
        const { data: tables, error: tableError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'profiles');

        if (tableError) throw tableError;
        
        // 테이블이 없으면 생성
        if (!tables || tables.length === 0) {
            // 프로필 테이블 생성
            const createProfilesSQL = `
            CREATE TABLE IF NOT EXISTS profiles (
                id UUID REFERENCES auth.users(id) PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'user' NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
            );

            -- RLS 정책 설정
            ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

            -- 사용자는 자신의 프로필만 볼 수 있음
            CREATE POLICY "사용자는 자신의 프로필을 볼 수 있음" ON profiles
                FOR SELECT USING (auth.uid() = id);

            -- 사용자는 자신의 프로필만 업데이트할 수 있음
            CREATE POLICY "사용자는 자신의 프로필을 업데이트할 수 있음" ON profiles
                FOR UPDATE USING (auth.uid() = id);

            -- 새 사용자가 등록되면 프로필을 자동으로 생성하는 트리거
            CREATE OR REPLACE FUNCTION public.handle_new_user()
            RETURNS TRIGGER AS $$
            BEGIN
                INSERT INTO public.profiles (id, email, role)
                VALUES (NEW.id, NEW.email, 'user');
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            -- auth.users 테이블에 트리거 연결
            DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
            CREATE TRIGGER on_auth_user_created
                AFTER INSERT ON auth.users
                FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
            `;

            // SQL 실행
            const { error: sqlError } = await supabase.rpc('execute_sql', { sql: createProfilesSQL });
            if (sqlError) throw sqlError;
            
            console.log('프로필 테이블이 성공적으로 생성되었습니다.');
        } else {
            console.log('프로필 테이블이 이미 존재합니다.');
        }
    } catch (error) {
        console.error('Supabase 초기화 오류:', error);
    }
} 