/**
 * Supabase 연결 설정 모듈
 * Supabase 클라이언트 초기화 및 데이터베이스 연결 관리
 */

// Supabase 설정
const SUPABASE_URL = 'https://your-supabase-url.supabase.co';
const SUPABASE_KEY = 'your-supabase-anon-key';

// Supabase 클라이언트 초기화
const supabase = supabaseClient.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * 법안 관련 함수들
 */

/**
 * 모든 법안을 가져오는 함수
 */
async function fetchBills() {
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('법안을 가져오는 중 오류 발생:', error);
    return [];
  }
}

/**
 * 특정 ID의 법안을 가져오는 함수
 */
async function fetchBillById(id) {
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`ID ${id}인 법안을 가져오는 중 오류 발생:`, error);
    return null;
  }
}

/**
 * 법안을 검색하는 함수
 */
async function searchBills(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,proposer.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('법안 검색 중 오류 발생:', error);
    return [];
  }
}

/**
 * 새 법안을 추가하는 함수
 */
async function addBill(billData) {
  try {
    // 현재 시간 추가
    const billWithTimestamp = {
      ...billData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('bills')
      .insert([billWithTimestamp])
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('법안 추가 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 기존 법안을 업데이트하는 함수
 */
async function updateBill(id, billData) {
  try {
    // 업데이트 시간 추가
    const billWithTimestamp = {
      ...billData,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('bills')
      .update(billWithTimestamp)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`ID ${id}인 법안 업데이트 중 오류 발생:`, error);
    throw error;
  }
}

/**
 * 법안을 삭제하는 함수
 */
async function deleteBill(id) {
  try {
    const { error } = await supabase
      .from('bills')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`ID ${id}인 법안 삭제 중 오류 발생:`, error);
    return false;
  }
}

/**
 * 여러 법안을 한번에 삭제하는 함수
 */
async function deleteBills(ids) {
  try {
    const { error } = await supabase
      .from('bills')
      .delete()
      .in('id', ids);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`여러 법안 삭제 중 오류 발생:`, error);
    return false;
  }
}

// 함수 내보내기
export {
  fetchBills,
  fetchBillById,
  searchBills,
  addBill,
  updateBill,
  deleteBill,
  deleteBills
}; 