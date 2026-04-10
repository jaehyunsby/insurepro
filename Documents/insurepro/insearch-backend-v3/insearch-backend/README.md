# Insearch Backend API

Insearch 보험 플랫폼 Vercel 백엔드

## 구조

```
api/
  auth/
    login.js        POST  로그인 → JWT 발급
    signup.js       POST  회원가입 신청
  clients/
    index.js        GET/POST  고객 목록/등록
    [id].js         PUT/DELETE/PATCH  고객 수정/삭제/알람
  schedules/
    index.js        GET/POST  일정 목록/등록
    [id].js         PUT/DELETE/PATCH  일정 수정/삭제/완료
  db-clients/
    index.js        GET/POST  DB고객 목록/등록
    [id].js         PUT/DELETE/PATCH  수정/삭제/배분/계약
  users/
    index.js        GET  사용자 목록
    [id].js         PATCH/DELETE  승인/역할변경/삭제
  ai/
    gemini.js       POST  Gemini AI 프록시 (키 보호)
  kakao/
    send.js         POST  카카오 알림톡 발송
  push/
    send.js         POST  OneSignal 웹 푸시
  notify/
    alarm.js        GET  알람일 자동 알림 (크론)
  data/
    load.js         GET  초기 전체 데이터 로드
  usage/
    log.js          POST  사용량 로그
lib/
  supabase.js       Supabase 클라이언트
  auth.js           JWT 발급/검증
  cors.js           CORS 처리
```

## 배포 방법

### 1. 사전 준비
```bash
npm install -g vercel
```

### 2. 환경변수 설정
```bash
cp .env.example .env.local
# .env.local 편집 후 실제 값 입력
```

### 3. Vercel에 환경변수 등록
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add JWT_SECRET
vercel env add GEMINI_API_KEY
vercel env add SOLAPI_API_KEY
vercel env add SOLAPI_API_SECRET
vercel env add SOLAPI_SENDER
vercel env add ONESIGNAL_APP_ID
vercel env add ONESIGNAL_REST_API_KEY
vercel env add CRON_SECRET
```

### 4. 배포
```bash
vercel --prod
# 배포 URL 확인: https://insearch-backend.vercel.app
```

### 5. Supabase service_role 키 확인
- Supabase 대시보드 → Settings → API
- `service_role` (secret) 키 복사
- ⚠️ anon 키 아님! service_role 키여야 RLS 우회 가능

### 6. CORS 도메인 설정
`lib/cors.js`의 `ALLOWED_ORIGINS`에 실제 도메인 추가

### 7. 프론트엔드 연결
`index.html`에서 Supabase 직접 호출 → 백엔드 API 호출로 교체
```javascript
// 기존
const {data} = await _supabase.from('clients').select('*')

// 변경
const data = await api('GET', '/api/clients')
```

## API 사용법

모든 요청에 Authorization 헤더 필요:
```
Authorization: Bearer {JWT토큰}
```

### 로그인
```bash
POST /api/auth/login
{ "email": "test@test.com", "password": "1234" }
→ { "token": "eyJ...", "user": {...} }
```

### 고객 목록
```bash
GET /api/clients
→ [{ id, name, phone, ... }]
```

### 일정 삭제
```bash
DELETE /api/schedules/123
→ { "success": true }
```

### AI 호출
```bash
POST /api/ai/gemini
{ "feature": "coverage_analyze", "contents": [...] }
→ Gemini 응답
```

## 크론 (자동 알람 발송)
- 매일 오전 9시 알람일 도래 고객 자동 푸시
- Vercel Pro 필요 (Free는 크론 미지원)
- Free는 외부 크론 서비스(cron-job.org)로 대체 가능
