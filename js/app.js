// 전역 변수 및 데이터 관리
let bills = [];
let currentBillId = 0;

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // 초기 데이터 로드 (실제로는 API에서 데이터를 가져올 것)
    loadSampleData();
    
    // 이벤트 리스너 등록
    document.getElementById('billForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchBtn').addEventListener('click', searchBills);
    document.getElementById('searchInput').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            searchBills();
        }
    });
    
    // 법안 목록 표시
    renderBillList(bills);
});

// 샘플 데이터 로드 (실제로는 API 호출로 대체)
function loadSampleData() {
    bills = [
        {
            id: 1,
            title: '데이터 관리법 개정안',
            proposer: '김의원',
            date: '2025-04-20',
            status: 'reviewing',
            content: '본 법안은 데이터 관리에 관한 기본법으로서 데이터의 생성, 수집, 저장, 처리, 분석, 활용 등에 관한 사항을 규정하고 있습니다. 주요 내용으로는 데이터 관리 원칙, 데이터 보호 조치, 데이터 활용 촉진 등이 포함됩니다.',
            review: '현재 법률 위원회에서 검토 중입니다. 데이터 보호 조항에 대한 추가 논의가 필요합니다.'
        },
        {
            id: 2,
            title: '개인정보 보호법 시행령 일부개정령안',
            proposer: '이의원',
            date: '2025-04-15',
            status: 'passed',
            content: '본 시행령 개정안은 개인정보 보호법의 효과적인 시행을 위한 세부 사항을 규정하고 있습니다. 주요 내용으로는 개인정보 수집·이용·제공 동의 방법, 영상정보처리기기 설치·운영 제한, 개인정보 영향평가 등이 포함됩니다.',
            review: '법률 위원회에서 검토 완료 및 통과되었습니다. 2025년 7월 1일부터 시행될 예정입니다.'
        },
        {
            id: 3,
            title: '디지털 플랫폼 규제 및 진흥에 관한 법률안',
            proposer: '박의원',
            date: '2025-04-10',
            status: 'rejected',
            content: '본 법률안은 디지털 플랫폼의 공정한 경쟁 환경 조성과 이용자 보호를 위한 규제 방안과 디지털 플랫폼 산업의 진흥을 위한 지원 방안을 규정하고 있습니다.',
            review: '위원회 검토 결과 현행 법률과 중복되는 내용이 많고 규제가 과도하다는 의견이 제시되어 부결되었습니다.'
        }
    ];
    currentBillId = bills.length;
}

// 법안 목록 렌더링
function renderBillList(billsToRender) {
    const billListElement = document.getElementById('billList');
    billListElement.innerHTML = '';
    
    if (billsToRender.length === 0) {
        billListElement.innerHTML = '<div class="alert alert-info">검색 결과가 없습니다.</div>';
        return;
    }
    
    billsToRender.forEach(bill => {
        const statusText = getStatusText(bill.status);
        const statusClass = getStatusClass(bill.status);
        
        const billCard = document.createElement('div');
        billCard.className = 'card bill-card mb-3';
        billCard.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <h5 class="card-title">${bill.title}</h5>
                    <span class="badge status-badge ${statusClass}">${statusText}</span>
                </div>
                <p class="bill-metadata">
                    <i class="bi bi-person"></i> ${bill.proposer} | 
                    <i class="bi bi-calendar-date"></i> ${bill.date}
                </p>
                <p class="card-text bill-preview">${bill.content}</p>
                <button class="btn btn-sm btn-outline-primary view-details" data-id="${bill.id}">
                    <i class="bi bi-eye"></i> 상세 보기
                </button>
            </div>
        `;
        
        billListElement.appendChild(billCard);
        
        // 상세 보기 버튼에 이벤트 리스너 추가
        billCard.querySelector('.view-details').addEventListener('click', function() {
            const billId = parseInt(this.getAttribute('data-id'));
            showBillDetails(billId);
        });
    });
}

// 상태텍스트 가져오기
function getStatusText(status) {
    const statusMap = {
        'registered': '등록됨',
        'reviewing': '검토 중',
        'passed': '통과',
        'rejected': '부결',
        'pending': '보류'
    };
    return statusMap[status] || '알 수 없음';
}

// 상태 클래스 가져오기
function getStatusClass(status) {
    return `status-${status}`;
}

// 법안 상세 정보 표시
function showBillDetails(billId) {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;
    
    // 모달에 데이터 채우기
    document.getElementById('billDetailTitle').textContent = bill.title;
    document.getElementById('billDetailProposer').textContent = bill.proposer;
    document.getElementById('billDetailDate').textContent = bill.date;
    
    const statusText = getStatusText(bill.status);
    const statusClass = getStatusClass(bill.status);
    const statusBadge = document.getElementById('billDetailStatus');
    statusBadge.textContent = statusText;
    statusBadge.className = `badge ${statusClass}`;
    
    document.getElementById('billDetailContent').textContent = bill.content;
    document.getElementById('billDetailReview').textContent = bill.review || '검토 의견이 없습니다.';
    
    // 모달 표시
    const modal = new bootstrap.Modal(document.getElementById('billDetailModal'));
    modal.show();
}

// 폼 제출 처리
function handleFormSubmit(event) {
    event.preventDefault();
    
    // 폼 데이터 가져오기
    const title = document.getElementById('billTitle').value;
    const proposer = document.getElementById('billProposer').value;
    const date = document.getElementById('billDate').value;
    const status = document.getElementById('billStatus').value;
    const content = document.getElementById('billContent').value;
    const review = document.getElementById('billReview').value;
    
    // 새 법안 객체 생성
    const newBill = {
        id: ++currentBillId,
        title: title,
        proposer: proposer,
        date: date,
        status: status,
        content: content,
        review: review
    };
    
    // 법안 배열에 추가
    bills.unshift(newBill);
    
    // 법안 목록 다시 렌더링
    renderBillList(bills);
    
    // 폼 초기화
    document.getElementById('billForm').reset();
    
    // 알림 메시지 표시
    showAlert('법안이 성공적으로 등록되었습니다.', 'success');
}

// 법안 검색
function searchBills() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm.trim()) {
        renderBillList(bills);
        return;
    }
    
    const filteredBills = bills.filter(bill => 
        bill.title.toLowerCase().includes(searchTerm) ||
        bill.proposer.toLowerCase().includes(searchTerm) ||
        bill.content.toLowerCase().includes(searchTerm)
    );
    
    renderBillList(filteredBills);
}

// 알림 메시지 표시
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        // 알림 컨테이너가 없으면 생성
        const container = document.createElement('div');
        container.id = 'alertContainer';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible alert-message fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.getElementById('alertContainer').appendChild(alert);
    
    // 5초 후 알림 자동 제거
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 150);
    }, 5000);
} 