-- bill 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS bill (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  proposer TEXT,
  proposal_date DATE,
  status TEXT DEFAULT 'registered',
  content TEXT,
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS(Row Level Security) 활성화
ALTER TABLE bill ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 있다면)
DROP POLICY IF EXISTS "Enable read access for all users" ON bill;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON bill;
DROP POLICY IF EXISTS "Enable insert for anon users" ON bill;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON bill;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON bill;

-- 모든 사용자에게 읽기 권한 부여
CREATE POLICY "Enable read access for all users" 
ON bill FOR SELECT 
TO public 
USING (true);

-- 익명 사용자에게도 추가 권한 부여 (이 부분이 중요)
CREATE POLICY "Enable insert for anon users" 
ON bill FOR INSERT 
TO anon 
WITH CHECK (true);

-- 인증된 사용자에게도 추가 권한 부여
CREATE POLICY "Enable insert for authenticated users" 
ON bill FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 인증된 사용자에게 수정 권한 부여
CREATE POLICY "Enable update for authenticated users" 
ON bill FOR UPDATE 
TO authenticated 
USING (true);

-- 인증된 사용자에게 삭제 권한 부여
CREATE POLICY "Enable delete for authenticated users" 
ON bill FOR DELETE 
TO authenticated 
USING (true);

-- 익명 사용자에게도 수정/삭제 권한 부여 (개발 테스트용, 프로덕션에서는 제거 권장)
CREATE POLICY "Enable update for anon users" 
ON bill FOR UPDATE 
TO anon 
USING (true);

CREATE POLICY "Enable delete for anon users" 
ON bill FOR DELETE 
TO anon 
USING (true); 