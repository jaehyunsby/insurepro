-- ============================================================
-- InsurePro - Supabase 데이터베이스 스키마
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================================

-- ── 1. 사용자 테이블 ──
CREATE TABLE IF NOT EXISTS users (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT,                          -- 실제 운영 시 Supabase Auth 사용 권장
  name        TEXT NOT NULL,
  phone       TEXT,
  role        TEXT DEFAULT 'agent',          -- superadmin | bureau_head | branch_head | team_head | agent
  team        TEXT,
  branch_id   TEXT,
  bureau_id   TEXT,
  agent_id    BIGINT,
  status      TEXT DEFAULT 'pending',        -- pending | approved | rejected
  join_date   DATE DEFAULT CURRENT_DATE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. 설계사 테이블 ──
CREATE TABLE IF NOT EXISTS agents (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id),
  name        TEXT NOT NULL,
  team        TEXT,
  branch_id   TEXT,
  bureau_id   TEXT,
  target      INTEGER DEFAULT 5000,
  achieved    INTEGER DEFAULT 0,
  clients     INTEGER DEFAULT 0,
  meetings    INTEGER DEFAULT 0,
  email       TEXT,
  phone       TEXT,
  status      TEXT DEFAULT 'active',
  is_mgr      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. 고객 테이블 ──
CREATE TABLE IF NOT EXISTS clients (
  id            BIGSERIAL PRIMARY KEY,
  agent_id      BIGINT REFERENCES agents(id),
  name          TEXT NOT NULL,
  phone         TEXT,
  ssn           TEXT,
  addr          TEXT,
  job           TEXT,
  status        TEXT DEFAULT 'active',       -- active | pending | vip | inactive
  next_contact  DATE,
  memo          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. 계약 테이블 ──
CREATE TABLE IF NOT EXISTS contracts (
  id          BIGSERIAL PRIMARY KEY,
  client_id   BIGINT REFERENCES clients(id) ON DELETE CASCADE,
  agent_id    BIGINT REFERENCES agents(id),
  product     TEXT,
  premium     INTEGER DEFAULT 0,             -- 월납보험료(만원)
  date        DATE,
  expire      DATE,
  status      TEXT DEFAULT '유지',           -- 유지 | 완납 | 실효 | 해지
  memo        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. DB 고객 테이블 ──
CREATE TABLE IF NOT EXISTS db_clients (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  phone            TEXT,
  ssn              TEXT,
  addr             TEXT,
  job              TEXT,
  source           TEXT DEFAULT '기타',
  memo             TEXT,
  assigned_to      BIGINT REFERENCES agents(id),
  assigned_name    TEXT,
  assigned_team    TEXT,
  assigned_date    DATE,
  status           TEXT DEFAULT 'unassigned', -- unassigned | assigned
  process_status   TEXT DEFAULT '미처리',     -- 미처리 | 연락중 | 상담완료 | 계약완료 | 거절
  contract_amount  INTEGER,
  contract_date    DATE,
  reg_date         DATE DEFAULT CURRENT_DATE,
  reg_month        TEXT,                       -- YYYY-MM
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. 일정 테이블 ──
CREATE TABLE IF NOT EXISTS schedules (
  id            BIGSERIAL PRIMARY KEY,
  agent_id      BIGINT REFERENCES agents(id),
  client_name   TEXT,
  date          DATE,
  time          TEXT,
  type          TEXT,                          -- 상담 | 계약 | 방문 | 전화
  location      TEXT,
  memo          TEXT,
  done          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. 게시판 테이블 ──
CREATE TABLE IF NOT EXISTS board_posts (
  id          BIGSERIAL PRIMARY KEY,
  author_id   BIGINT REFERENCES users(id),
  author_name TEXT,
  title       TEXT NOT NULL,
  content     TEXT,
  pinned      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. 알람 테이블 ──
CREATE TABLE IF NOT EXISTS alarms (
  id          BIGSERIAL PRIMARY KEY,
  client_id   BIGINT REFERENCES clients(id) ON DELETE CASCADE,
  agent_id    BIGINT REFERENCES agents(id),
  label       TEXT,
  target_date DATE,
  done        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) 설정
-- 각 설계사는 자신의 데이터만 읽기/쓰기 가능
-- ============================================================

ALTER TABLE clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- clients: 자신의 agent_id 고객만 접근
CREATE POLICY "agents_own_clients" ON clients
  FOR ALL USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()::bigint
    )
  );

-- db_clients: 배분받은 DB만 설계사가 접근, 관리자는 전체
CREATE POLICY "agents_own_db_clients" ON db_clients
  FOR ALL USING (
    assigned_to IN (
      SELECT id FROM agents WHERE user_id = auth.uid()::bigint
    )
    OR
    auth.uid()::bigint IN (
      SELECT id FROM users WHERE role IN ('superadmin','bureau_head','branch_head')
    )
  );

-- ============================================================
-- 인덱스 (성능 최적화)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_agent_id    ON clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_db_clients_assigned ON db_clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_schedules_agent_id  ON schedules(agent_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date      ON schedules(date);

-- ============================================================
-- 샘플 데이터 (선택사항 - 테스트용)
-- ============================================================
-- INSERT INTO users (email, name, role, status) VALUES
--   ('admin@insurepro.kr', '홍관리', 'superadmin', 'approved');
