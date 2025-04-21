/**
 * 메인 스크립트
 * 공통 기능 및 초기화 로직
 */

// DOM 로드 후 공통 초기화 함수 실행
document.addEventListener('DOMContentLoaded', function() {
    // 공통 초기화 함수 호출
    initCommon();
});

/**
 * 공통 초기화 함수
 */
function initCommon() {
    // 콘솔에 초기화 메시지 표시
    console.log('데이터 관리 웹 뷰 초기화 완료');
    
    // 현재 경로에 따라 활성 메뉴 표시
    highlightActiveMenu();
    
    // 모바일 메뉴 처리
    setupMobileMenu();
}

/**
 * 현재 경로에 따라 네비게이션 메뉴 활성화
 */
function highlightActiveMenu() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const menuLinks = document.querySelectorAll('nav ul li a');
    
    menuLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        if (href === currentPath) {
            link.classList.add('active');
        } else if (currentPath === '' && href === 'index.html') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * 모바일 메뉴 설정
 */
function setupMobileMenu() {
    // 모바일 환경에서 필요한 메뉴 처리 로직
    // 필요 시 구현
}

/**
 * 날짜를 읽기 쉬운 형식으로 포맷팅
 * @param {string} dateString - ISO 형식 날짜 문자열
 * @returns {string} - 포맷팅된 날짜 문자열
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    
    // 유효하지 않은 날짜일 경우 원본 반환
    if (isNaN(date.getTime())) {
        return dateString;
    }
    
    // 로케일에 맞게 날짜 형식화
    return date.toLocaleDateString();
}

/**
 * 에러 메시지 표시
 * @param {string} message - 표시할 에러 메시지
 * @param {Element} [container] - 메시지를 표시할 컨테이너 (없으면 alert 사용)
 */
function showError(message, container) {
    if (container) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        // 기존 에러 메시지 제거
        const existingError = container.querySelector('.error-message');
        if (existingError) {
            container.removeChild(existingError);
        }
        
        container.appendChild(errorElement);
        
        // 5초 후 메시지 자동 제거
        setTimeout(() => {
            if (errorElement.parentNode === container) {
                container.removeChild(errorElement);
            }
        }, 5000);
    } else {
        // 컨테이너가 없으면 alert 사용
        alert(message);
    }
}

/**
 * 성공 메시지 표시
 * @param {string} message - 표시할 성공 메시지
 * @param {Element} [container] - 메시지를 표시할 컨테이너 (없으면 alert 사용)
 */
function showSuccess(message, container) {
    if (container) {
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = message;
        
        // 기존 성공 메시지 제거
        const existingSuccess = container.querySelector('.success-message');
        if (existingSuccess) {
            container.removeChild(existingSuccess);
        }
        
        container.appendChild(successElement);
        
        // 3초 후 메시지 자동 제거
        setTimeout(() => {
            if (successElement.parentNode === container) {
                container.removeChild(successElement);
            }
        }, 3000);
    } else {
        // 컨테이너가 없으면 alert 사용
        alert(message);
    }
}

/**
 * 메인 애플리케이션 로직
 * 법안 관리 시스템의 핵심 기능을 처리합니다.
 */

// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', async () => {
    // UI 요소 참조
    const billList = document.getElementById('bill-list');
    const billForm = document.getElementById('bill-form');
    const billDetailView = document.getElementById('bill-detail');
    const searchInput = document.getElementById('search-input');
    const addNewBtn = document.getElementById('add-new-bill');
    const backBtn = document.getElementById('back-to-list');
    
    // 현재 선택된 법안 ID
    let currentBillId = null;
    
    // 초기화: 법안 목록 불러오기
    await loadBills();
    
    // 이벤트 리스너 등록
    if (billForm) {
        billForm.addEventListener('submit', handleBillSubmit);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    if (addNewBtn) {
        addNewBtn.addEventListener('click', showBillForm);
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', showBillList);
    }
    
    /**
     * 법안 목록을 불러와 화면에 표시
     */
    async function loadBills() {
        try {
            // 로딩 인디케이터 표시
            if (billList) {
                billList.innerHTML = '<div class="d-flex justify-content-center"><div class="spinner-border" role="status"><span class="visually-hidden">로딩 중...</span></div></div>';
            }
            
            // Supabase에서 법안 데이터 가져오기
            const bills = await fetchBills();
            
            // 법안 목록 표시
            renderBillList(bills);
        } catch (error) {
            console.error('법안 목록 로딩 오류:', error);
            if (billList) {
                billList.innerHTML = '<div class="alert alert-danger">데이터를 불러오는 중 오류가 발생했습니다.</div>';
            }
        }
    }
    
    /**
     * 법안 목록을 화면에 렌더링
     * @param {Array} bills - 법안 데이터 배열
     */
    function renderBillList(bills) {
        if (!billList) return;
        
        if (bills.length === 0) {
            billList.innerHTML = '<div class="alert alert-info">등록된 법안이 없습니다.</div>';
            return;
        }
        
        billList.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'table table-hover';
        
        // 테이블 헤더
        table.innerHTML = `
            <thead class="table-light">
                <tr>
                    <th>번호</th>
                    <th>법안명</th>
                    <th>제안자</th>
                    <th>제안일</th>
                    <th>상태</th>
                    <th>관리</th>
                </tr>
            </thead>
            <tbody id="bill-table-body"></tbody>
        `;
        
        billList.appendChild(table);
        const tableBody = document.getElementById('bill-table-body');
        
        // 법안 데이터 행 추가
        bills.forEach((bill, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${bill.title}</td>
                <td>${bill.proposer}</td>
                <td>${new Date(bill.proposal_date).toLocaleDateString()}</td>
                <td><span class="badge ${getStatusBadgeClass(bill.status)}">${bill.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary view-bill" data-id="${bill.id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning edit-bill" data-id="${bill.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-bill" data-id="${bill.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // 법안 상세보기 이벤트 리스너 추가
        document.querySelectorAll('.view-bill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const billId = parseInt(e.currentTarget.getAttribute('data-id'));
                viewBillDetails(billId);
            });
        });
        
        // 법안 수정 이벤트 리스너 추가
        document.querySelectorAll('.edit-bill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const billId = parseInt(e.currentTarget.getAttribute('data-id'));
                editBill(billId);
            });
        });
        
        // 법안 삭제 이벤트 리스너 추가
        document.querySelectorAll('.delete-bill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const billId = parseInt(e.currentTarget.getAttribute('data-id'));
                confirmDeleteBill(billId);
            });
        });
    }
    
    /**
     * 법안 상태에 따른 배지 클래스 반환
     * @param {string} status - 법안 상태
     * @returns {string} - CSS 클래스
     */
    function getStatusBadgeClass(status) {
        switch (status) {
            case '계류 중':
                return 'bg-warning';
            case '통과':
                return 'bg-success';
            case '부결':
                return 'bg-danger';
            case '심사 중':
                return 'bg-info';
            default:
                return 'bg-secondary';
        }
    }
    
    /**
     * 법안 상세 정보 조회 및 표시
     * @param {number} id - 법안 ID
     */
    async function viewBillDetails(id) {
        try {
            currentBillId = id;
            
            // 법안 상세 데이터 가져오기
            const bill = await fetchBillById(id);
            if (!bill) {
                throw new Error('법안을 찾을 수 없습니다.');
            }
            
            // 상세 보기 UI 전환
            showBillDetail();
            
            // 상세 내용 렌더링
            if (billDetailView) {
                billDetailView.innerHTML = `
                    <div class="card">
                        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">법안 상세</h5>
                            <div>
                                <button id="edit-current-bill" class="btn btn-sm btn-light me-2">
                                    <i class="bi bi-pencil"></i> 수정
                                </button>
                                <button id="delete-current-bill" class="btn btn-sm btn-danger">
                                    <i class="bi bi-trash"></i> 삭제
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <h2 class="card-title">${bill.title}</h2>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <p><strong>제안자:</strong> ${bill.proposer}</p>
                                    <p><strong>제안일:</strong> ${new Date(bill.proposal_date).toLocaleDateString()}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>상태:</strong> <span class="badge ${getStatusBadgeClass(bill.status)}">${bill.status}</span></p>
                                    <p><strong>마지막 업데이트:</strong> ${new Date(bill.updated_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <div class="mb-3">
                                <h5>법안 내용</h5>
                                <div class="p-3 bg-light rounded">${bill.content}</div>
                            </div>
                            <div class="mb-3">
                                <h5>검토 내용</h5>
                                <div class="p-3 bg-light rounded">${bill.review || '검토 내용이 없습니다.'}</div>
                            </div>
                        </div>
                    </div>
                `;
                
                // 상세 화면의 버튼 이벤트 리스너 추가
                const editBtn = document.getElementById('edit-current-bill');
                const deleteBtn = document.getElementById('delete-current-bill');
                
                if (editBtn) {
                    editBtn.addEventListener('click', () => editBill(currentBillId));
                }
                
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => confirmDeleteBill(currentBillId));
                }
            }
        } catch (error) {
            console.error('법안 상세 조회 오류:', error);
            if (billDetailView) {
                billDetailView.innerHTML = '<div class="alert alert-danger">법안 상세 정보를 불러오는 중 오류가 발생했습니다.</div>';
            }
        }
    }
    
    /**
     * 법안 수정 폼 표시
     * @param {number} id - 법안 ID
     */
    async function editBill(id) {
        try {
            currentBillId = id;
            
            // 법안 데이터 가져오기
            const bill = await fetchBillById(id);
            if (!bill) {
                throw new Error('법안을 찾을 수 없습니다.');
            }
            
            // 폼 전환
            showBillForm();
            
            // 폼에 데이터 채우기
            if (billForm) {
                const titleInput = billForm.querySelector('#bill-title');
                const proposerInput = billForm.querySelector('#bill-proposer');
                const dateInput = billForm.querySelector('#bill-date');
                const statusSelect = billForm.querySelector('#bill-status');
                const contentInput = billForm.querySelector('#bill-content');
                const reviewInput = billForm.querySelector('#bill-review');
                
                if (titleInput) titleInput.value = bill.title;
                if (proposerInput) proposerInput.value = bill.proposer;
                if (dateInput) dateInput.value = new Date(bill.proposal_date).toISOString().split('T')[0];
                if (statusSelect) statusSelect.value = bill.status;
                if (contentInput) contentInput.value = bill.content;
                if (reviewInput) reviewInput.value = bill.review || '';
                
                // 폼 제목 변경
                const formTitle = document.querySelector('#form-title');
                if (formTitle) formTitle.textContent = '법안 수정';
                
                // 폼 제출 버튼 텍스트 변경
                const submitBtn = billForm.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.textContent = '수정하기';
            }
        } catch (error) {
            console.error('법안 수정 폼 오류:', error);
            alert('법안 정보를 불러오지 못했습니다.');
        }
    }
    
    /**
     * 법안 삭제 확인 및 처리
     * @param {number} id - 법안 ID
     */
    function confirmDeleteBill(id) {
        if (confirm('정말 이 법안을 삭제하시겠습니까?')) {
            deleteBillById(id);
        }
    }
    
    /**
     * 법안 삭제 처리
     * @param {number} id - 법안 ID
     */
    async function deleteBillById(id) {
        try {
            const success = await deleteBill(id);
            if (success) {
                alert('법안이 삭제되었습니다.');
                showBillList();
                await loadBills();
            } else {
                throw new Error('법안 삭제 실패');
            }
        } catch (error) {
            console.error('법안 삭제 오류:', error);
            alert('법안 삭제 중 오류가 발생했습니다.');
        }
    }
    
    /**
     * 법안 폼 제출 처리
     * @param {Event} e - 폼 제출 이벤트
     */
    async function handleBillSubmit(e) {
        e.preventDefault();
        
        // 폼 데이터 수집
        const formData = new FormData(e.target);
        const billData = {
            title: formData.get('title'),
            proposer: formData.get('proposer'),
            proposal_date: formData.get('date'),
            status: formData.get('status'),
            content: formData.get('content'),
            review: formData.get('review') || null
        };
        
        try {
            let success;
            
            // 새 법안 또는 기존 법안 업데이트
            if (currentBillId) {
                // 기존 법안 업데이트
                success = await updateBill(currentBillId, billData);
                if (success) {
                    alert('법안이 업데이트되었습니다.');
                }
            } else {
                // 새 법안 추가
                const newBill = await addBill(billData);
                success = !!newBill;
                if (success) {
                    alert('새 법안이 추가되었습니다.');
                }
            }
            
            if (success) {
                // 폼 초기화 및 목록으로 돌아가기
                e.target.reset();
                currentBillId = null;
                showBillList();
                await loadBills();
            } else {
                throw new Error('법안 저장 실패');
            }
        } catch (error) {
            console.error('법안 저장 오류:', error);
            alert('법안 저장 중 오류가 발생했습니다.');
        }
    }
    
    /**
     * 검색 기능 처리
     * @param {Event} e - 입력 이벤트
     */
    async function handleSearch(e) {
        const searchTerm = e.target.value.trim().toLowerCase();
        
        try {
            const allBills = await fetchBills();
            
            if (searchTerm === '') {
                renderBillList(allBills);
                return;
            }
            
            // 검색어로 필터링
            const filteredBills = allBills.filter(bill => {
                return (
                    bill.title.toLowerCase().includes(searchTerm) ||
                    bill.proposer.toLowerCase().includes(searchTerm) ||
                    bill.content.toLowerCase().includes(searchTerm) ||
                    (bill.review && bill.review.toLowerCase().includes(searchTerm))
                );
            });
            
            renderBillList(filteredBills);
        } catch (error) {
            console.error('검색 오류:', error);
        }
    }
    
    // UI 전환 함수들
    
    /**
     * 법안 목록 화면 표시
     */
    function showBillList() {
        if (billList) billList.style.display = 'block';
        if (billForm) billForm.style.display = 'none';
        if (billDetailView) billDetailView.style.display = 'none';
        
        // 검색창 표시
        const searchContainer = document.getElementById('search-container');
        if (searchContainer) searchContainer.style.display = 'block';
        
        // 헤더 변경
        const pageHeader = document.getElementById('page-header');
        if (pageHeader) pageHeader.textContent = '법안 목록';
        
        // 새 법안 버튼 표시
        if (addNewBtn) addNewBtn.style.display = 'block';
        
        // 뒤로가기 버튼 숨김
        if (backBtn) backBtn.style.display = 'none';
    }
    
    /**
     * 법안 상세 화면 표시
     */
    function showBillDetail() {
        if (billList) billList.style.display = 'none';
        if (billForm) billForm.style.display = 'none';
        if (billDetailView) billDetailView.style.display = 'block';
        
        // 검색창 숨김
        const searchContainer = document.getElementById('search-container');
        if (searchContainer) searchContainer.style.display = 'none';
        
        // 헤더 변경
        const pageHeader = document.getElementById('page-header');
        if (pageHeader) pageHeader.textContent = '법안 상세 정보';
        
        // 새 법안 버튼 숨김
        if (addNewBtn) addNewBtn.style.display = 'none';
        
        // 뒤로가기 버튼 표시
        if (backBtn) backBtn.style.display = 'block';
    }
    
    /**
     * 법안 폼 화면 표시
     */
    function showBillForm() {
        if (billList) billList.style.display = 'none';
        if (billForm) billForm.style.display = 'block';
        if (billDetailView) billDetailView.style.display = 'none';
        
        // 검색창 숨김
        const searchContainer = document.getElementById('search-container');
        if (searchContainer) searchContainer.style.display = 'none';
        
        // 헤더 변경
        const pageHeader = document.getElementById('page-header');
        if (pageHeader) pageHeader.textContent = currentBillId ? '법안 수정' : '새 법안 등록';
        
        // 새 법안 버튼 숨김
        if (addNewBtn) addNewBtn.style.display = 'none';
        
        // 뒤로가기 버튼 표시
        if (backBtn) backBtn.style.display = 'block';
        
        // 폼 초기화 (새 법안인 경우)
        if (!currentBillId && billForm) {
            billForm.reset();
            
            // 현재 날짜 설정
            const dateInput = billForm.querySelector('#bill-date');
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.value = today;
            }
            
            // 폼 제목 변경
            const formTitle = document.querySelector('#form-title');
            if (formTitle) formTitle.textContent = '새 법안 등록';
            
            // 폼 제출 버튼 텍스트 변경
            const submitBtn = billForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = '등록하기';
        }
    }
}); 