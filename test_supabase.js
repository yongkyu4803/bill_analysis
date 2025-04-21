// Supabase API 직접 테스트 스크립트
console.log('Supabase API 테스트 시작...');

// 설정
const SUPABASE_URL = 'https://rxwztfdnragffxbmlscf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4d3p0ZmRucmFnZmZ4Ym1sc2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NzU2MDgsImV4cCI6MjA1ODA1MTYwOH0.KN8cR6_xHHHfuF1odUi9WwzkbOHCmwuRaK0FYe7b0Ig';

// 테스트 데이터
const testData = {
  title: '테스트 법안',
  proposer: '테스트 제안자',
  proposal_date: '2023-01-01',
  status: 'registered',
  content: '테스트 내용'
};

// Fetch 요청 전송
async function testInsert() {
  try {
    console.log('데이터 삽입 요청 중...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/bill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('응답 상태:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('오류 발생:', errorText);
      return;
    }
    
    console.log('데이터 삽입 성공!');
    
    // 데이터 조회 테스트
    await testSelect();
  } catch (error) {
    console.error('요청 중 오류 발생:', error);
  }
}

async function testSelect() {
  try {
    console.log('데이터 조회 요청 중...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/bill?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    console.log('응답 상태:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('오류 발생:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('조회된 데이터:', data);
  } catch (error) {
    console.error('요청 중 오류 발생:', error);
  }
}

// 테스트 실행
testInsert(); 