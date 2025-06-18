# 엔드포인트API가이드

## 🌐 TaskFlowMaster API 엔드포인트 완전 가이드

### 📊 서버 정보
- **서버 URL**: http://localhost:3000
- **클라이언트 URL**: http://localhost:5173
- **데이터베이스**: SQLite (taskflow.db)
- **프레임워크**: Express.js + TypeScript + Drizzle ORM

### 🗄️ 데이터베이스 스키마 정보
- **메인 스키마 파일**: `shared/schema.ts` (Drizzle ORM)
- **데이터베이스 파일**: `taskflow.db`
- **주요 테이블**:
  - `users` - 사용자 정보
  - `daily_tasks` - 일간 업무 (메인 업무 테이블)
  - `weekly_tasks` - 주간 업무
  - `weekly_reports` - 주간 보고서
  - `task_analytics` - 업무 분석
  - `comments` - 댓글
  - `attachments` - 첨부파일
  - `notifications` - 알림
  - `schedules` - 일정 관리
  - `schedule_instances` - 반복 일정 인스턴스

⚠️ **중요**: 현재 `server/db.ts`에서 `tasks` 테이블을 생성하지만, 실제 스키마는 `daily_tasks` 테이블을 사용합니다. 스키마 불일치 문제가 있어 수정이 필요합니다.

## 🔐 인증 관련 API

### POST /api/login
**설명**: 사용자 로그인
**요청**:
```json
{
  "username": "admin"
}
```
**응답**:
```json
{
  "success": true,
  "user": {
    "id": "admin",
    "username": "admin",
    "name": "개발자(김동규)",
    "role": "developer"
  }
}
```

### POST /api/logout
**설명**: 사용자 로그아웃
**응답**:
```json
{
  "success": true,
  "message": "로그아웃되었습니다."
}
```

### GET /api/me
**설명**: 현재 로그인 사용자 정보 조회
**응답**:
```json
{
  "id": "admin",
  "username": "admin",
  "name": "개발자(김동규)",
  "role": "developer"
}
```

### GET /api/user
**설명**: 현재 사용자 정보 조회 (별칭)
**응답**: GET /api/me와 동일

## 👥 사용자 관리 API

### GET /api/users
**설명**: 모든 사용자 목록 조회
**응답**:
```json
[
  {
    "id": "admin",
    "name": "개발자(김동규)",
    "username": "admin",
    "role": "developer"
  },
  {
    "id": "nara0",
    "name": "관리자",
    "username": "nara0",
    "role": "manager"
  }
]
```

### GET /api/users/me/stats
**설명**: 현재 사용자의 업무 통계 조회
**응답**:
```json
{
  "totalTasks": 15,
  "completedTasks": 8,
  "pendingTasks": 5,
  "overdueeTasks": 2
}
```

## 📋 업무 관리 API

### GET /api/tasks
**설명**: 업무 목록 조회
**쿼리 파라미터**:
- `status`: 상태 필터 (scheduled, in_progress, completed, cancelled, postponed)
- `category`: 카테고리 필터 (경영지원, 계약관리, 신규계약, 계약해지)
- `assignedTo`: 담당자 필터
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 50)

**응답**:
```json
{
  "success": true,
  "tasks": [
    {
      "id": 1,
      "title": "업무 제목",
      "description": "업무 설명",
      "status": "scheduled",
      "priority": "medium",
      "category": "경영지원",
      "assignedTo": "admin",
      "createdBy": "admin",
      "workDate": "2024-12-12",
      "startTime": "09:00",
      "endTime": "18:00",
      "targetPlace": "대상처",
      "progress": 0,
      "createdAt": "2024-12-12T01:00:00.000Z",
      "updatedAt": "2024-12-12T01:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

### GET /api/tasks/:id
**설명**: 개별 업무 상세 조회
**응답**: 단일 업무 객체

### POST /api/tasks
**설명**: 새 업무 생성 (반복업무 지원)
**요청**:
```json
{
  "title": "업무 제목",
  "description": "업무 설명",
  "category": "경영지원",
  "priority": "medium",
  "assignedTo": "admin",
  "workDate": "2024-12-12",
  "startTime": "09:00",
  "endTime": "18:00",
  "targetPlace": "대상처",
  "followUpAssigneeGeneral": "nara0",
  "followUpMemo": "후속 업무 메모",
  "isRecurring": true,
  "recurringType": "weekly",
  "recurringDays": "[\"월\", \"수\", \"금\"]",
  "recurringEndDate": "2025-02-28",
  "isIndefinite": false
}
```

### PUT /api/tasks/:id
**설명**: 업무 수정
**요청**: POST와 동일한 구조

### DELETE /api/tasks/:id
**설명**: 업무 삭제
**응답**:
```json
{
  "success": true,
  "message": "업무가 삭제되었습니다."
}
```

### POST /api/tasks/bulk-delete
**설명**: 업무 일괄 삭제
**요청**:
```json
{
  "taskIds": [1, 2, 3]
}
```

### POST /api/tasks/bulk-save
**설명**: 업무 일괄 저장
**요청**:
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "수정된 제목",
      "status": "completed"
    }
  ]
}
```

### POST /api/tasks/bulk-upload
**설명**: Excel 파일을 통한 업무 일괄 등록
**요청**: FormData (Excel 파일)
**응답**:
```json
{
  "success": true,
  "message": "총 10개 중 8개 업무가 성공적으로 등록되었습니다.",
  "data": {
    "successCount": 8,
    "errorCount": 2,
    "totalCount": 10
  }
}
```

## 🔔 알림 관리 API

### GET /api/notifications
**설명**: 알림 목록 조회
**응답**:
```json
[
  {
    "id": 1,
    "message": "새 업무가 할당되었습니다.",
    "type": "task_assigned",
    "isRead": false,
    "createdAt": "2024-12-12T01:00:00.000Z"
  }
]
```

## 📅 일정 관리 API (현재 비활성화)

### GET /api/schedules
**설명**: 일정 목록 조회 (현재 주석 처리됨)

### POST /api/schedules
**설명**: 일정 생성 (현재 주석 처리됨)

### PUT /api/schedules/:id
**설명**: 일정 수정 (현재 주석 처리됨)

### DELETE /api/schedules/:id
**설명**: 일정 삭제 (현재 주석 처리됨)

## 📊 템플릿 및 샘플 데이터 API

### GET /api/template/excel-samples
**설명**: Excel 템플릿 샘플 데이터 조회
**응답**:
```json
{
  "success": true,
  "data": [
    {
      "업무제목": "소방시설 점검",
      "업무설명": "월간 소방시설 정기점검",
      "업무구분": "경영지원",
      "우선순위": "보통",
      "시작날짜": "2024-12-16",
      "시작시간": "09:00",
      "마감시간": "17:00"
    }
  ],
  "options": {
    "categories": ["경영지원", "계약관리", "신규계약", "계약해지"],
    "priorities": ["낮음", "보통", "높음", "긴급"],
    "statuses": ["예정", "진행중", "완료", "취소", "연기"]
  }
}
```

### POST /api/tasks/sample-data
**설명**: 샘플 데이터 생성
**응답**:
```json
{
  "success": true,
  "message": "샘플 데이터가 생성되었습니다.",
  "count": 10
}
```

### DELETE /api/tasks/sample-data
**설명**: 샘플 데이터 삭제
**응답**:
```json
{
  "success": true,
  "message": "샘플 데이터가 삭제되었습니다."
}
```

## 🌐 WebSocket 실시간 통신

### WebSocket 연결
**URL**: ws://localhost:3000/ws
**설명**: 실시간 업무 상태 변경 알림

**메시지 타입**:
- `task_created`: 새 업무 생성
- `task_updated`: 업무 수정
- `task_deleted`: 업무 삭제
- `task_status_changed`: 상태 변경
- `TASK_UPDATE`: 일반 업무 업데이트

## 🔧 데이터베이스 스키마 상세

### users 테이블
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'employee',
  name TEXT NOT NULL,
  department TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### daily_tasks 테이블 (메인 업무 테이블)
```sql
CREATE TABLE daily_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  priority TEXT NOT NULL DEFAULT 'medium',
  progress INTEGER NOT NULL DEFAULT 0,
  work_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  estimated_hours INTEGER DEFAULT 1,
  actual_hours INTEGER,
  memo TEXT,
  weekly_task_id INTEGER,
  completed_at TEXT,
  follow_up_assignee_general INTEGER,
  follow_up_assignee_contract INTEGER,
  follow_up_memo TEXT,
  is_follow_up_task BOOLEAN DEFAULT FALSE,
  parent_task_id INTEGER,
  follow_up_type TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_type TEXT,
  recurring_days TEXT,
  recurring_end_date TEXT,
  is_indefinite BOOLEAN DEFAULT FALSE,
  is_recurring_task BOOLEAN DEFAULT FALSE,
  recurring_parent_id INTEGER,
  recurring_sequence INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 📊 보고서 관리 API

### GET /api/reports/analytics
**설명**: 보고서 분석 데이터 조회
**쿼리 파라미터**:
- `type`: 보고서 유형 (daily, weekly, monthly, yearly)
- `date`: 기준 날짜 (YYYY-MM-DD 형식)
- `userId`: 사용자 ID (선택사항)

**응답**:
```json
{
  "success": true,
  "analytics": {
    "totalTasks": 120,
    "completedTasks": 85,
    "inProgressTasks": 25,
    "scheduledTasks": 10,
    "cancelledTasks": 0,
    "postponedTasks": 0,
    "completionRate": 70.8,
    "averageProgress": 78.5,
    "totalEstimatedHours": 480,
    "totalActualHours": 420,
    "efficiencyRate": 87.5,
    "categoryBreakdown": {
      "경영지원": 45,
      "계약관리": 35,
      "신규계약": 25,
      "계약해지": 15
    },
    "priorityBreakdown": {
      "urgent": 10,
      "high": 30,
      "medium": 60,
      "low": 20
    },
    "priorityCompletionRates": {
      "urgent": 90,
      "high": 80,
      "medium": 70,
      "low": 60
    },
    "categoryProductivity": {
      "경영지원": 85.5,
      "계약관리": 78.2,
      "신규계약": 92.1,
      "계약해지": 65.8
    },
    "dailyProductivity": {
      "2024-12-09": 85,
      "2024-12-10": 78,
      "2024-12-11": 92,
      "2024-12-12": 88,
      "2024-12-13": 75
    },
    "timeToStart": {
      "average": 2.5,
      "breakdown": {
        "urgent": 0.5,
        "high": 1.2,
        "medium": 3.1,
        "low": 5.8
      }
    },
    "timeToComplete": {
      "average": 24.8,
      "breakdown": {
        "urgent": 8.5,
        "high": 18.2,
        "medium": 28.5,
        "low": 42.1
      }
    },
    "focusHours": {
      "09:00": 15,
      "10:00": 25,
      "11:00": 20,
      "14:00": 18,
      "15:00": 22,
      "16:00": 20
    },
    "taskFlow": [
      {
        "from": "admin",
        "to": "nara0",
        "taskTitle": "계약서 검토",
        "taskId": 123,
        "assignedDate": "2024-12-12",
        "status": "completed"
      }
    ],
    "tasksInPeriod": [
      {
        "id": 1,
        "title": "업무 제목",
        "description": "업무 설명",
        "status": "completed",
        "priority": "medium",
        "category": "경영지원",
        "assignedTo": "admin",
        "followUpAssignee": "nara0",
        "progress": 100,
        "workDate": "2024-12-12",
        "createdAt": "2024-12-12T01:00:00.000Z",
        "estimatedHours": 4,
        "actualHours": 3.5,
        "startedAt": "2024-12-12T09:00:00.000Z",
        "completedAt": "2024-12-12T12:30:00.000Z",
        "targetPlace": "대상처"
      }
    ]
  }
}
```

### 📄 보고서 인쇄/내보내기 기능

#### 클라이언트 사이드 기능
**파일**: `client/src/pages/reports.tsx`

**인쇄 미리보기**:
```typescript
const handlePrintPreview = () => {
  setShowPrintPreview(true);
  setTimeout(() => {
    window.print();
  }, 500);
  setTimeout(() => {
    setShowPrintPreview(false);
  }, 1000);
};
```

**PDF 저장**:
```typescript
const handleSavePDF = async () => {
  const userConfirm = window.confirm(
    '보고서를 PDF로 저장하시겠습니까?\n\n' +
    '확인을 클릭하면 인쇄 대화상자가 열립니다.\n' +
    '대상을 "PDF로 저장"으로 선택하여 저장해주세요.'
  );
  
  if (userConfirm) {
    const fileName = `${getReportTypeLabel()}_${formatPeriodDisplay().replace(/[^\w\s가-힣]/g, '_')}_${format(new Date(), 'yyyyMMdd')}`;
    const originalTitle = document.title;
    document.title = fileName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }
};
```

#### 주간보고서 내보내기
**파일**: `client/src/components/dashboard/weekly-report.tsx`

**텍스트 파일 내보내기**:
```typescript
const handleExportReport = () => {
  try {
    const reportData = `
=====================================
${reportType === 'weekly' ? '주간' : '월간'} 업무 보고서
=====================================
기간: ${reportType === 'weekly' 
  ? `${format(weekStart, "yyyy년 M월 d일", { locale: ko })} ~ ${format(weekEnd, "M월 d일", { locale: ko })}`
  : `${format(monthStart, "yyyy년 M월", { locale: ko })}`
}
생성일: ${format(new Date(), "yyyy년 M월 d일 HH:mm", { locale: ko })}

■ ${reportType === 'weekly' ? '주간' : '월간'} 업무 실적 요약
=====================================
- 총 업무: ${weeklyStats.total}개
- 완료: ${weeklyStats.completed}개 (완료율: ${completionRate}%)
- 진행중: ${weeklyStats.inProgress}개
- 대기: ${weeklyStats.pending}개
- 지연: ${weeklyStats.overdue}개

■ 상세 업무 내역
=====================================
${weeklyTasks.map((task: any, index: number) => {
  const taskDate = task.workDate ? format(new Date(task.workDate), "MM/dd (EEE)", { locale: ko }) : "날짜 미지정";
  const statusText = task.status === "completed" ? "완료" : 
                    task.status === "in_progress" ? "진행중" : 
                    task.status === "scheduled" ? "예정" : "미정";
  
  return `${index + 1}. [${taskDate}] ${task.title}
   - 상태: ${statusText}
   - 우선순위: ${priorityText}
   - 담당자: ${task.assignedTo || "미지정"}
   - 진행률: ${task.progress || 0}%
   - 카테고리: ${task.category || "미분류"}
   ${task.description ? `- 설명: ${task.description}` : ""}
   ${task.followUpAssignee ? `- 후속담당자: ${task.followUpAssignee}` : ""}`;
}).join("\n\n")}
    `.trim();

    const fileName = `${reportType === 'weekly' ? '주간' : '월간'}보고서_${
      reportType === 'weekly' 
        ? format(weekStart, "yyyy-MM-dd", { locale: ko })
        : format(monthStart, "yyyy-MM", { locale: ko })
    }_${format(new Date(), "yyyyMMdd_HHmm")}.txt`;

    const blob = new Blob([reportData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`${reportType === 'weekly' ? '주간' : '월간'}보고서가 성공적으로 내보내기되었습니다!\n파일명: ${fileName}`);
    
  } catch (error) {
    console.error('보고서 내보내기 중 오류 발생:', error);
    alert('보고서 내보내기 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
};
```

#### 인쇄 스타일 최적화
**파일**: `client/src/index.css`

**주요 인쇄 스타일**:
```css
@media print {
  /* 색상 강제 출력 */
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* A4 용지 최적화 */
  @page {
    size: A4;
    margin: 15mm 10mm;
  }

  /* 그리드 레이아웃 인쇄 최적화 */
  .grid {
    display: block !important;
  }
  
  .grid-cols-4 > * {
    display: inline-block !important;
    width: 23% !important;
    margin-right: 2% !important;
    vertical-align: top !important;
  }

  /* 테이블 스타일 */
  table {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 8pt !important;
    margin-bottom: 10pt !important;
  }

  th, td {
    padding: 4pt 6pt !important;
    border: 1px solid #333 !important;
    font-size: 8pt !important;
    vertical-align: top !important;
  }
}
```

## 🚨 현재 확인된 문제점

### 1. 스키마 불일치 문제
- **문제**: `shared/schema.ts`에서는 `daily_tasks` 테이블을 정의하지만, 일부 코드에서는 `tasks` 테이블을 참조
- **영향**: 500 Internal Server Error 발생 가능성
- **해결 필요**: 스키마 통일 필요

### 2. 비활성화된 API
- **일정 관리 API**: 현재 주석 처리되어 사용 불가
- **일부 고급 기능**: 구현되어 있지만 비활성화 상태

### 3. 클라이언트-서버 포트 설정
- **서버**: 3000번 포트
- **클라이언트**: 5173번 포트
- **프록시 설정**: vite.config.ts에서 /api 요청을 3000번 포트로 프록시

## 📝 API 사용 예시

### 업무 생성 예시
```javascript
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: '새 업무',
    description: '업무 설명',
    category: '경영지원',
    priority: 'medium',
    assignedTo: 'admin',
    workDate: '2024-12-16',
    startTime: '09:00',
    endTime: '17:00'
  })
});
```

### 업무 목록 조회 예시
```javascript
const response = await fetch('/api/tasks?status=scheduled&page=1&limit=10');
const data = await response.json();
```

## 🔄 실시간 업데이트 처리

### WebSocket 연결 예시
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'task_updated') {
    // 업무 목록 새로고침
    queryClient.invalidateQueries(['tasks']);
  }
};
```

## 📋 Excel 업로드 필드 매핑

### 필수 필드
- `업무제목` → `title`
- `시작날짜` → `workDate`
- `업무구분` → `category`

### 선택 필드
- `업무설명` → `description`
- `우선순위` → `priority` (기본값: 보통)
- `시작시간` → `startTime` (기본값: 09:00)
- `마감시간` → `endTime`
- `상태` → `status` (기본값: 예정)
- `진행률` → `progress` (기본값: 0)

### 드롭다운 옵션
- **업무구분**: 경영지원, 계약관리, 신규계약, 계약해지
- **우선순위**: 낮음, 보통, 높음, 긴급
- **상태**: 예정, 진행중, 완료, 취소, 연기