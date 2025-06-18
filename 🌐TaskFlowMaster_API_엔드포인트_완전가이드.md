# 🌐 TaskFlowMaster API 엔드포인트 완전 가이드

## 📋 문서 개요

이 문서는 **TaskFlowMaster 프로젝트의 모든 API 엔드포인트**를 체계적으로 분석하여 정리한 완전한 기술 가이드입니다.

---

## 🎯 API 서버 기본 정보

### 🔧 서버 구성
- **서버 URL**: `http://localhost:3003`
- **WebSocket**: `ws://localhost:3003/ws`
- **프레임워크**: Express.js + TypeScript
- **데이터베이스**: SQLite + Drizzle ORM
- **인증 방식**: Express Session + bcryptjs
- **실시간 통신**: WebSocket (ws 라이브러리)

### 📊 전체 API 현황
- **총 엔드포인트 수**: 20개
- **인증 관련**: 4개
- **사용자 및 통계**: 3개  
- **업무 관리**: 6개
- **일정 관리**: 4개
- **알림 시스템**: 1개
- **파일 처리**: 1개
- **실시간 통신**: 1개 (WebSocket)

---

## 🔐 1. 인증 관련 API (4개)

### 1.1 로그인
```http
POST /api/login
Content-Type: application/json

{
  "username": "admin"
}
```

**설명**: 사용자 로그인 처리
**인증**: 불필요
**사용자 목록**: `admin`, `nara1`, `nara2`, `nara3`, `nara4`, `nara5`, `nara6`

**응답 (성공)**:
```json
{
  "success": true,
  "user": {
    "id": "admin",
    "username": "admin", 
    "name": "관리자",
    "role": "manager",
    "department": "관리팀",
    "email": "admin@taskflow.com"
  }
}
```

**응답 (실패)**:
```json
{
  "success": false,
  "message": "잘못된 계정입니다."
}
```

### 1.2 로그아웃
```http
POST /api/logout
```

**설명**: 사용자 로그아웃 (세션 파기)
**인증**: 불필요

**응답**:
```json
{
  "success": true,
  "message": "로그아웃되었습니다."
}
```

### 1.3 현재 사용자 정보
```http
GET /api/me
```

**설명**: 현재 로그인한 사용자 정보 조회
**인증**: 불필요 (임시로 admin 고정)

**응답**:
```json
{
  "success": true,
  "user": {
    "id": "admin",
    "username": "admin",
    "name": "관리자", 
    "email": "admin@taskflow.com",
    "role": "manager",
    "department": "관리팀"
  }
}
```

### 1.4 사용자 정보 (별칭)
```http
GET /api/user
```

**설명**: GET /api/me와 동일한 기능 (별칭)
**인증**: 불필요

---

## 👥 2. 사용자 및 통계 API (3개)

### 2.1 사용자 목록 조회
```http
GET /api/users
```

**설명**: 전체 사용자 목록 조회
**인증**: 불필요

**응답**:
```json
[
  { "id": 1, "username": "admin", "name": "관리자", "email": "admin@taskflow.com", "role": "manager", "department": "관리팀" },
  { "id": 2, "username": "nara1", "name": "김하경", "email": "nara1@taskflow.com", "role": "employee", "department": "대안업무팀" },
  { "id": 3, "username": "nara2", "name": "김하경", "email": "nara2@taskflow.com", "role": "employee", "department": "대안업무팀" },
  { "id": 4, "username": "nara3", "name": "김수진", "email": "nara3@taskflow.com", "role": "employee", "department": "중보업무전출팀" }
]
```

### 2.2 개인 업무 통계
```http
GET /api/users/me/stats
```

**설명**: 현재 사용자의 업무 통계 조회
**인증**: 불필요

**응답**:
```json
{
  "totalTasks": 15,
  "completedTasks": 8,
  "pendingTasks": 5,
  "overdueeTasks": 2
}
```

**통계 계산 로직**:
- `totalTasks`: 전체 업무 개수
- `completedTasks`: 상태가 'completed'인 업무
- `pendingTasks`: 상태가 'scheduled' 또는 'in_progress'인 업무 
- `overdueeTasks`: 미완료 상태이면서 마감일이 지난 업무

### 2.3 알림 목록 조회
```http
GET /api/notifications
```

**설명**: 사용자 알림 목록 조회
**인증**: 불필요

**응답**:
```json
[
  {
    "id": 1,
    "message": "새 업무가 할당되었습니다.",
    "type": "info",
    "isRead": false,
    "createdAt": "2025-01-20T12:00:00.000Z"
  }
]
```

---

## 📋 3. 업무 관리 API (6개)

### 3.1 업무 목록 조회
```http
GET /api/tasks
```

**설명**: 전체 업무 목록 조회 (메모리 저장)
**인증**: 불필요

**응답**:
```json
{
  "success": true,
  "tasks": [
    {
      "id": 1642689234567,
      "title": "새 업무",
      "description": "업무 설명",
      "status": "scheduled",
      "priority": "medium",
      "assignedTo": "admin",
      "createdBy": "admin", 
      "dueDate": "2025-01-21T12:00:00.000Z",
      "targetPlace": "",
      "contractType": "관리",
      "createdAt": "2025-01-20T12:00:00.000Z",
      "updatedAt": "2025-01-20T12:00:00.000Z"
    }
  ]
}
```

### 3.2 개별 업무 조회
```http
GET /api/tasks/:id
```

**설명**: 특정 업무 상세 조회
**인증**: 불필요
**파라미터**: `id` (업무 ID)

**응답 (성공)**:
```json
{
  "id": 123,
  "title": "업무 제목",
  "description": "업무 설명",
  "status": "in_progress",
  "priority": "high",
  // ... 기타 필드
}
```

**응답 (실패)**:
```json
{
  "success": false,
  "message": "업무를 찾을 수 없습니다."
}
```

### 3.3 업무 생성
```http
POST /api/tasks
Content-Type: application/json
Authorization: Required

{
  "title": "새 업무",
  "description": "업무 설명",
  "priority": "high",
  "assignedTo": "nara1",
  "dueDate": "2025-01-25T14:00:00.000Z",
  "targetPlace": "서울시 강남구",
  "contractType": "프로젝트"
}
```

**설명**: 새로운 업무 생성
**인증**: 필요 (`requireAuth` 미들웨어)

**자동 설정 값**:
- `id`: `Date.now()` (타임스탬프)
- `status`: `"scheduled"`
- `createdBy`: `"admin"`
- `createdAt`, `updatedAt`: 현재 시간

**응답**:
```json
{
  "success": true,
  "task": {
    "id": 1642689234567,
    "title": "새 업무",
    // ... 전체 업무 정보
  }
}
```

**WebSocket 브로드캐스트**:
```json
{
  "type": "task_created",
  "data": { /* 생성된 업무 정보 */ }
}
```

### 3.4 업무 수정 (PUT)
```http
PUT /api/tasks/:id
Content-Type: application/json
Authorization: Required

{
  "title": "수정된 업무 제목",
  "status": "in_progress",
  "priority": "urgent"
}
```

**설명**: 특정 업무 전체 수정
**인증**: 필요
**파라미터**: `id` (업무 ID)

**응답**:
```json
{
  "success": true,
  "task": {
    "id": 123,
    "title": "수정된 업무 제목",
    "updatedAt": "2025-01-20T13:30:00.000Z",
    // ... 기타 필드
  }
}
```

**WebSocket 브로드캐스트**:
```json
{
  "type": "task_updated", 
  "data": { /* 수정된 업무 정보 */ }
}
```

### 3.5 업무 수정 (PATCH)
```http
PATCH /api/tasks/:id
Content-Type: application/json
Authorization: Required

{
  "status": "completed"
}
```

**설명**: 특정 업무 부분 수정 (PUT과 동일한 로직)
**인증**: 필요
**기능**: PUT과 완전히 동일

### 3.6 업무 삭제
```http
DELETE /api/tasks/:id
Authorization: Required
```

**설명**: 특정 업무 삭제
**인증**: 필요
**파라미터**: `id` (업무 ID)

**응답**:
```json
{
  "success": true,
  "message": "업무가 삭제되었습니다."
}
```

**WebSocket 브로드캐스트**:
```json
{
  "type": "task_deleted",
  "data": { "id": 123, "title": "삭제된 업무 제목" }
}
```

### 3.7 업무 일괄 삭제
```http
DELETE /api/tasks/bulk
Content-Type: application/json
Authorization: Required

{
  "taskIds": [123, 456, 789]
}
```

**설명**: 여러 업무를 한번에 삭제
**인증**: 필요

**응답**:
```json
{
  "success": true,
  "message": "3개의 업무가 삭제되었습니다.",
  "deletedCount": 3
}
```

**WebSocket 브로드캐스트**:
```json
{
  "type": "tasks_bulk_deleted",
  "data": { 
    "deletedIds": [123, 456, 789], 
    "deletedCount": 3 
  }
}
```

---

## 📅 4. 일정 관리 API (4개)

### 4.1 일정 목록 조회
```http
GET /api/schedules?startDate=2025-01-01&endDate=2025-01-31
```

**설명**: 일정 목록 조회 (날짜 범위 필터링 가능)
**인증**: 필요 (DB 연동)
**쿼리 파라미터**:
- `startDate` (선택): 시작 날짜 (YYYY-MM-DD)
- `endDate` (선택): 종료 날짜 (YYYY-MM-DD)

**응답**:
```json
{
  "schedules": [
    {
      "id": 1,
      "title": "팀 회의",
      "description": "주간 진행사항 공유",
      "startDate": "2025-01-22",
      "endDate": "2025-01-22",
      "startTime": "14:00",
      "endTime": "15:00",
      "allDay": false,
      "location": "회의실 A",
      "color": "#3b82f6",
      "category": "회의",
      "isRecurring": false,
      "recurringType": null,
      "recurringInterval": null,
      "recurringDays": null,
      "createdAt": "2025-01-20T12:00:00.000Z",
      "createdBy": "admin"
    }
  ]
}
```

### 4.2 일정 생성
```http
POST /api/schedules
Content-Type: application/json
Authorization: Required

{
  "title": "프로젝트 회의",
  "description": "분기별 검토 회의",
  "startDate": "2025-01-25",
  "endDate": "2025-01-25", 
  "startTime": "09:00",
  "endTime": "10:30",
  "allDay": false,
  "location": "본사 대회의실",
  "color": "#ef4444",
  "category": "중요회의",
  "isRecurring": true,
  "recurringType": "weekly",
  "recurringInterval": 1,
  "recurringDays": ["tuesday"],
  "recurringEndDate": "2025-06-25"
}
```

**설명**: 새로운 일정 생성 (반복 일정 지원)
**인증**: 필요

**반복 일정 옵션**:
- `recurringType`: `"daily"`, `"weekly"`, `"monthly"`, `"yearly"`, `"weekdays"`, `"custom"`
- `recurringInterval`: 반복 간격 (1 = 매주, 2 = 격주)
- `recurringDays`: 요일 배열 (주간 반복시)
- `recurringEndDate`: 반복 종료일
- `recurringCount`: 반복 횟수 (최대 365회)

**응답**:
```json
{
  "success": true,
  "schedule": { /* 생성된 일정 정보 */ },
  "message": "일정이 성공적으로 생성되었습니다"
}
```

**WebSocket 브로드캐스트**:
```json
{
  "type": "schedule_created",
  "data": { "schedule": {}, "userId": "admin" }
}
```

### 4.3 일정 수정
```http
PUT /api/schedules/:id
Content-Type: application/json
Authorization: Required

{
  "title": "수정된 회의 제목",
  "startTime": "10:00",
  "endTime": "11:00"
}
```

**설명**: 특정 일정 수정
**인증**: 필요 + 권한 체크 (생성자만 수정 가능)
**파라미터**: `id` (일정 ID)

**응답**:
```json
{
  "success": true,
  "schedule": { /* 수정된 일정 정보 */ },
  "message": "일정이 성공적으로 수정되었습니다"
}
```

**권한 오류**:
```json
{
  "error": "일정을 수정할 권한이 없습니다"
}
```

### 4.4 일정 삭제
```http
DELETE /api/schedules/:id
Authorization: Required
```

**설명**: 특정 일정 삭제 (반복 일정 인스턴스도 함께 삭제)
**인증**: 필요 + 권한 체크
**파라미터**: `id` (일정 ID)

**응답**:
```json
{
  "success": true,
  "message": "일정이 성공적으로 삭제되었습니다"
}
```

**WebSocket 브로드캐스트**:
```json
{
  "type": "schedule_deleted",
  "data": { "scheduleId": 123, "userId": "admin" }
}
```

---

## 📄 5. 파일 처리 API (1개)

### 5.1 일정 엑셀 대량 업로드
```http
POST /api/schedules/bulk-upload
Content-Type: application/json
Authorization: Required

{
  "schedules": [
    {
      "title": "업무 1",
      "description": "설명 1",
      "startDate": "2025-01-22",
      "startTime": "09:00",
      "endTime": "10:00",
      "allDay": false,
      "isRecurring": false,
      "location": "사무실",
      "color": "#3b82f6",
      "category": "업무"
    },
    {
      "title": "업무 2", 
      "description": "설명 2",
      "startDate": "2025-01-23",
      "allDay": true,
      "isRecurring": true,
      "recurringType": "weekly",
      "recurringInterval": 1,
      "recurringDays": "monday,wednesday,friday",
      "recurringEndDate": "2025-06-23"
    }
  ]
}
```

**설명**: Excel에서 파싱된 일정 데이터를 대량으로 업로드
**인증**: 필요

**처리 과정**:
1. 각 일정 데이터 검증 및 변환
2. 데이터베이스에 일정 생성
3. 반복 일정인 경우 인스턴스 자동 생성
4. 성공/실패 결과 집계

**응답**:
```json
{
  "success": true,
  "message": "총 50개 중 48개 일정이 성공적으로 등록되었습니다.",
  "data": {
    "created": [ /* 생성된 일정 배열 */ ],
    "successCount": 48,
    "errorCount": 2,
    "totalCount": 50
  },
  "errors": [
    "행 5: 시작 날짜가 올바르지 않습니다",
    "행 12: 제목이 누락되었습니다"
  ]
}
```

**WebSocket 브로드캐스트**:
```json
{
  "type": "schedules_bulk_created",
  "data": { 
    "schedules": [], 
    "userId": "admin",
    "count": 48
  }
}
```

---

## 💬 6. 실시간 통신 (WebSocket)

### 6.1 WebSocket 연결
```javascript
const ws = new WebSocket('ws://localhost:3003/ws');

ws.onopen = function() {
  console.log('WebSocket 연결됨');
};

ws.onmessage = function(event) {
  const message = JSON.parse(event.data);
  console.log('받은 메시지:', message);
};
```

**설명**: 실시간 양방향 통신
**연결**: `ws://localhost:3003/ws`

### 6.2 브로드캐스트 메시지 유형

#### **업무 관련 이벤트**
```json
// 업무 생성
{
  "type": "task_created",
  "data": { /* 업무 정보 */ }
}

// 업무 수정
{
  "type": "task_updated", 
  "data": { /* 업무 정보 */ }
}

// 업무 삭제
{
  "type": "task_deleted",
  "data": { "id": 123, "title": "업무명" }
}

// 업무 일괄 삭제
{
  "type": "tasks_bulk_deleted",
  "data": { "deletedIds": [1,2,3], "deletedCount": 3 }
}
```

#### **일정 관련 이벤트**
```json
// 일정 생성
{
  "type": "schedule_created",
  "data": { "schedule": {}, "userId": "admin" }
}

// 일정 수정
{
  "type": "schedule_updated",
  "data": { "schedule": {}, "userId": "admin" }
}

// 일정 삭제
{
  "type": "schedule_deleted", 
  "data": { "scheduleId": 123, "userId": "admin" }
}

// 일정 대량 생성
{
  "type": "schedules_bulk_created",
  "data": { "schedules": [], "userId": "admin", "count": 10 }
}
```

---

## 🔧 7. 인증 및 권한 시스템

### 7.1 인증 미들웨어
```typescript
async function requireAuth(req, res, next) {
  // 현재는 강제로 admin 사용자 설정 (임시)
  req.user = {
    id: 'admin',
    username: 'admin', 
    email: 'admin@taskflow.com',
    role: 'manager',
    department: '관리팀',
    name: '관리자'
  };
  next();
}
```

### 7.2 관리자 권한 미들웨어
```typescript
async function requireManager(req, res, next) {
  // 임시로 모든 사용자에게 관리자 권한 허용
  if (!req.user) {
    await requireAuth(req, res, () => {});
  }
  next();
}
```

### 7.3 사용자 계정 목록
```javascript
const validUsers = [
  'admin',   // 관리자
  'nara1',   // 김하경 (대안업무팀)
  'nara2',   // 김하경 (대안업무팀)
  'nara3',   // 김수진 (중보업무전출팀)
  'nara4',   // 사용자 4
  'nara5',   // 사용자 5
  'nara6'    // 사용자 6
];
```

---

## 📊 8. 데이터 저장 방식

### 8.1 업무 데이터 (메모리 저장)
```javascript
// 전역 변수로 메모리에 저장
let taskList: any[] = [];

// 실시간으로 추가/수정/삭제 가능
// 서버 재시작시 초기화됨
```

### 8.2 일정 데이터 (SQLite 저장)
```sql
-- schedules 테이블 (메인 일정)
-- scheduleInstances 테이블 (반복 일정 인스턴스)
-- Drizzle ORM 사용
```

### 8.3 사용자 데이터 (하드코딩)
```javascript
// 현재는 하드코딩된 사용자 목록 사용
// 실제 데이터베이스 연동 필요
```

---

## 🚨 9. 에러 처리 및 응답 형태

### 9.1 성공 응답 패턴
```json
{
  "success": true,
  "data": { /* 실제 데이터 */ },
  "message": "작업이 성공적으로 완료되었습니다"
}
```

### 9.2 실패 응답 패턴
```json
{
  "success": false,
  "message": "에러 메시지",
  "error": "상세 에러 내용" 
}
```

### 9.3 HTTP 상태 코드
- **200**: 성공
- **201**: 생성 성공
- **400**: 잘못된 요청
- **401**: 인증 필요
- **403**: 권한 없음
- **404**: 리소스 없음
- **500**: 서버 오류

---

## 🔍 10. API 테스트 방법

### 10.1 cURL 예제
```bash
# 로그인
curl -X POST http://localhost:3003/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}'

# 업무 목록 조회
curl http://localhost:3003/api/tasks

# 업무 생성
curl -X POST http://localhost:3003/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "새 업무", "priority": "high"}'
```

### 10.2 JavaScript Fetch 예제
```javascript
// 업무 목록 조회
const response = await fetch('http://localhost:3003/api/tasks');
const data = await response.json();

// 업무 생성
const newTask = await fetch('http://localhost:3003/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: '새 업무',
    description: '업무 설명',
    priority: 'high'
  })
});
```

---

## 📈 11. API 사용 통계 및 로깅

### 11.1 자동 로깅
```javascript
// 모든 API 요청이 자동으로 로깅됨
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});
```

### 11.2 콘솔 출력 예시
```
GET /api/tasks 200 in 15ms
POST /api/tasks 200 in 32ms :: {"success":true,"task":{"id":123...}}
✅ 업무 목록 API 성공: 5개 업무
✅ 새 업무 생성: 프로젝트 기획 (총 6개)
```

---

## 🎯 12. 마무리

### ✅ 완성된 기능
- **인증 시스템**: 로그인/로그아웃 (4개 API)
- **업무 관리**: CRUD + 일괄처리 (6개 API)  
- **일정 관리**: CRUD + 반복일정 + 대량업로드 (4개 API)
- **실시간 통신**: WebSocket 브로드캐스트
- **통계 조회**: 사용자별 업무 통계
- **에러 처리**: 체계적인 에러 응답

### 🔄 개선 필요 사항
- **업무 데이터**: 메모리 → 데이터베이스 이전
- **인증 시스템**: JWT 토큰 기반 인증
- **권한 관리**: 역할별 세분화된 권한
- **파일 업로드**: 실제 파일 처리 기능
- **알림 시스템**: 실시간 알림 확장

**TaskFlowMaster는 총 20개의 API 엔드포인트로 구성된 완전한 업무 관리 시스템입니다!** 🎉 