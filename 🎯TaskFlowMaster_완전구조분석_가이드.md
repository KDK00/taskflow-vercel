# 🎯 TaskFlowMaster 완전 구조 분석 가이드

## 📋 문서 개요

이 문서는 **TaskFlowMaster 프로젝트의 모든 파일, 엔드포인트, API, 언어구조, 아이콘별 실행 구조, 상세사항들을 완벽하게 정리**한 종합 기술 문서입니다.

---

## 🏗️ 1. 프로젝트 전체 구조

### 📁 루트 디렉토리 구조
```
작업관리_백업/
├── 📂 client/                          # 프론트엔드 (React + TypeScript + Vite)
├── 📂 server/                          # 백엔드 (Express.js + TypeScript)
├── 📂 shared/                          # 공유 타입 및 스키마
├── 📂 electron/                        # Electron 앱 (데스크톱)
├── 📂 attached_assets/                 # 첨부 파일 저장소
├── 📂 node_modules/                    # NPM 의존성
├── 📄 package.json                     # 프로젝트 설정
├── 📄 taskflow.db                      # SQLite 데이터베이스
├── 📄 vite.config.ts                   # Vite 설정
├── 📄 tailwind.config.ts               # Tailwind CSS 설정
├── 📄 drizzle.config.ts                # Drizzle ORM 설정
├── 📄 tsconfig.json                    # TypeScript 설정
├── 🎯 TaskFlowMaster_완벽실행.bat      # 자동 실행 배치파일
└── 📚 *.md                             # 문서 파일들
```

### 🔧 기술 스택
- **프론트엔드**: React 18 + TypeScript + Vite + Tailwind CSS
- **백엔드**: Express.js + TypeScript + Node.js
- **데이터베이스**: SQLite + Drizzle ORM
- **인증**: Express Session + bcryptjs
- **실시간 통신**: WebSocket (ws 라이브러리)
- **UI 라이브러리**: Radix UI + Lucide React + Framer Motion
- **상태 관리**: React Query (TanStack Query)
- **라우팅**: Wouter
- **빌드 도구**: Vite + esbuild
- **스타일링**: Tailwind CSS + CSS Modules

---

## 🌐 2. 서버 구조 (Backend)

### 📂 server/ 디렉토리
```
server/
├── 📄 index.ts                         # 서버 진입점
├── 📄 routes.ts                        # API 라우트 정의 (1,655줄)
├── 📄 auth.ts                          # 인증 시스템
├── 📄 db.ts                            # 데이터베이스 연결
├── 📄 init-db.ts                       # DB 초기화
├── 📄 seed-data.ts                     # 샘플 데이터
├── 📄 storage.ts                       # 파일 저장 관리
├── 📄 chat.ts                          # 채팅 시스템
├── 📄 vite.ts                          # Vite 개발 서버
└── 📄 auth-helpers.ts                  # 인증 헬퍼 함수
```

### 🔌 API 엔드포인트 (총 20개)

#### 🔐 인증 관련 (4개)
```http
POST   /api/login                       # 로그인
POST   /api/logout                      # 로그아웃
GET    /api/me                          # 현재 사용자 정보
GET    /api/user                        # 사용자 정보 (별칭)
```

#### 👥 사용자 및 통계 (3개)
```http
GET    /api/users                       # 사용자 목록
GET    /api/users/me/stats              # 개인 업무 통계
GET    /api/notifications               # 알림 목록
```

#### 📋 업무 관리 (6개)
```http
GET    /api/tasks                       # 업무 목록 조회
GET    /api/tasks/:id                   # 개별 업무 조회
POST   /api/tasks                       # 업무 생성
PUT    /api/tasks/:id                   # 업무 수정
DELETE /api/tasks/:id                   # 업무 삭제
DELETE /api/tasks/sample-data           # 샘플 데이터 삭제
```

#### 📅 일정 관리 (4개)
```http
GET    /api/schedules                   # 일정 목록
POST   /api/schedules                   # 일정 생성
PUT    /api/schedules/:id               # 일정 수정
DELETE /api/schedules/:id               # 일정 삭제
```

#### 🔔 알림 시스템 (1개)
```http
POST   /api/notifications/mark-read     # 알림 읽음 처리
```

#### 📁 파일 처리 (1개)
```http
POST   /api/upload                      # 파일 업로드
```

#### 🔄 실시간 통신 (1개)
```
WebSocket: ws://localhost:3003/ws       # 실시간 업데이트
```

### 🗄️ 데이터베이스 스키마 (9개 테이블)

#### 👤 users (사용자)
```sql
- id: 기본키
- username: 사용자명 (고유)
- password: 암호화된 비밀번호
- email: 이메일 (고유)
- role: 역할 (employee/manager/developer)
- name: 실명
- department: 부서
- createdAt: 생성일시
```

#### 📋 dailyTasks (일간업무)
```sql
- id: 기본키
- title: 업무 제목
- description: 업무 설명
- assignedTo: 담당자 ID
- createdBy: 생성자 ID
- category: 업무구분
- status: 상태 (scheduled/in_progress/completed/cancelled/postponed)
- priority: 우선순위 (low/medium/high/urgent)
- progress: 진행률 (0-100)
- workDate: 업무일자
- startTime/endTime: 시작/종료 시간
- estimatedHours/actualHours: 예상/실제 소요시간
- memo: 업무 메모
- followUpAssigneeGeneral: 경영일반 후속담당자
- followUpAssigneeContract: 계약업무 후속담당자
- followUpMemo: 후속담당자 메모
- isFollowUpTask: 후속업무 여부
- parentTaskId: 원본 업무 ID
- followUpType: 후속업무 타입
- createdAt/updatedAt: 생성/수정일시
```

#### 📊 weeklyTasks (주간업무)
```sql
- id: 기본키
- title: 업무 제목
- assignedTo: 담당자 ID
- weekStartDate/weekEndDate: 주차 시작/종료일
- estimatedHours/actualHours: 예상/실제 소요시간
- completionRate: 완료율
- isNextWeekPlanned: 다음주 예정 여부
- targetWeekStartDate: 대상 주차
```

#### 📈 weeklyReports (주간보고서)
```sql
- id: 기본키
- userId: 사용자 ID
- weekStartDate/weekEndDate: 주차 범위
- totalTasks/completedTasks: 총/완료 업무수
- summary: 주간 요약
- challenges: 어려움/문제점
- achievements: 성과
- nextWeekPlan: 다음주 계획
- managerComment: 관리자 코멘트
```

#### 📊 taskAnalytics (업무 분석)
```sql
- id: 기본키
- taskId: 업무 ID
- timeEfficiency: 시간 효율성 (1-5)
- qualityScore: 품질 점수 (1-5)
- difficultyLevel: 난이도 (1-5)
- satisfactionLevel: 만족도 (1-5)
- recommendedImprovements: 개선 제안
```

#### 💬 comments (댓글)
```sql
- id: 기본키
- taskId: 업무 ID
- taskType: 업무 타입 (daily/weekly)
- userId: 작성자 ID
- content: 댓글 내용
```

#### 📎 attachments (첨부파일)
```sql
- id: 기본키
- taskId: 업무 ID
- fileName: 파일명
- fileUrl: 파일 URL
- fileSize: 파일 크기
- uploadedBy: 업로드한 사용자 ID
```

#### 🔔 notifications (알림)
```sql
- id: 기본키
- userId: 사용자 ID
- title: 알림 제목
- message: 알림 내용
- type: 알림 타입 (task_assigned/deadline_approaching/등)
- isRead: 읽음 여부
- taskId: 관련 업무 ID
```

#### 📅 schedules (일정)
```sql
- id: 기본키
- title: 일정 제목
- startDate/endDate: 시작/종료 날짜
- startTime/endTime: 시작/종료 시간
- allDay: 종일 일정 여부
- isRecurring: 반복 여부
- recurringType: 반복 유형 (daily/weekly/monthly/yearly)
- recurringInterval: 반복 간격
- location: 장소
- reminder: 알림 시간
- color: 일정 색상
- category: 업무구분
```

---

## 💻 3. 클라이언트 구조 (Frontend)

### 📂 client/ 디렉토리
```
client/
├── 📂 public/                          # 정적 파일
├── 📂 src/                             # 소스 코드
│   ├── 📂 components/                  # 공통 컴포넌트
│   ├── 📂 hooks/                       # 커스텀 훅
│   ├── 📂 lib/                         # 유틸리티 라이브러리
│   ├── 📂 modules/                     # 모듈화된 기능
│   ├── 📂 pages/                       # 페이지 컴포넌트
│   ├── 📂 types/                       # 타입 정의
│   ├── 📂 utils/                       # 유틸리티 함수
│   ├── 📄 App.tsx                      # 메인 앱 컴포넌트
│   ├── 📄 main.tsx                     # 진입점
│   └── 📄 index.css                    # 글로벌 스타일
└── 📄 index.html                       # HTML 템플릿
```

### 🧩 모듈화 구조 (7개 모듈)

#### 🔧 core/ (핵심 인프라)
```
core/
├── 📂 api/                             # API 클라이언트
├── 📂 components/                      # 공통 컴포넌트
│   ├── ErrorBoundary.tsx               # 에러 경계
│   └── ModuleLoader.tsx                # 모듈 로더
├── 📂 registry/                        # 모듈 레지스트리
└── 📂 types/                           # 공통 타입
```

#### 📊 summary-cards/ (요약 통계)
```
summary-cards/
├── 📄 config.ts                        # 모듈 설정
├── 📄 index.tsx                        # 메인 컴포넌트
└── 📂 components/                      # 하위 컴포넌트
    └── confirmation-request-card.tsx   # 확인요청 카드
```

#### 📋 task-list/ (업무 목록)
```
task-list/
├── 📄 config.ts                        # 모듈 설정
└── 📄 index.tsx                        # 메인 컴포넌트
```

#### 📅 calendar/ (캘린더)
```
calendar/
├── 📄 config.ts                        # 모듈 설정
└── 📄 index.tsx                        # 메인 컴포넌트
```

#### 💬 team-chat/ (팀 채팅)
```
team-chat/
├── 📄 config.ts                        # 모듈 설정
└── 📄 index.tsx                        # 메인 컴포넌트
```

#### 📊 weekly-report/ (주간 리포트)
```
weekly-report/
├── 📄 config.ts                        # 모듈 설정 ✅
└── 📄 index.tsx                        # 메인 컴포넌트 🔧
```

#### 👨‍💼 manager-view/ (관리자 뷰)
```
manager-view/
├── 📄 config.ts                        # 모듈 설정 ✅
└── 📄 index.tsx                        # 메인 컴포넌트 🔧
```

#### 🔐 login/ (로그인)
```
login/
├── 📄 config.ts                        # 모듈 설정
├── 📄 index.tsx                        # 메인 컴포넌트
└── 📂 components/                      # 하위 컴포넌트
    ├── auth-header.tsx                 # 인증 헤더
    ├── login-form.tsx                  # 로그인 폼
    ├── register-form.tsx               # 회원가입 폼
    └── test-account-panel.tsx          # 테스트 계정 패널
```

#### 📋 task-management/ (업무 관리)
```
task-management/
├── 📂 components/                      # 하위 컴포넌트
│   ├── task-create-modal.tsx           # 업무 생성 모달
│   └── follow-up-assignee-selector.tsx # 후속담당자 선택기
```

### 📄 페이지 구조 (7개 페이지)

#### 🏠 dashboard.tsx (대시보드)
- **기능**: 메인 대시보드 화면
- **구성요소**: 요약 카드, 업무 목록, 캘린더, 팀 채팅
- **모듈 사용**: summary-cards, task-list, calendar, team-chat

#### 📋 task-list-all.tsx (전체 업무 목록)
- **기능**: 모든 업무를 테이블 형태로 표시
- **필터링**: 상태별, 담당자별, 카테고리별
- **정렬**: 생성일, 마감일, 우선순위

#### 📊 reports.tsx (보고서)
- **기능**: 일간/주간/월간/연간 보고서
- **구성**: 요약 분석 + 상세 테이블
- **차트**: 상태별 통계, 카테고리별 분석

#### 📈 advanced-analytics.tsx (고급 분석)
- **기능**: AI 기반 업무 분석 및 인사이트
- **분석 항목**: 시간 효율성, 생산성 점수, 패턴 분석
- **개선 제안**: 자동화된 업무 개선 제안

#### 🔐 auth-page.tsx (인증 페이지)
- **기능**: 로그인/회원가입
- **모듈 사용**: login

#### ❌ not-found.tsx (404 페이지)
- **기능**: 페이지를 찾을 수 없음

### 🎨 UI 컴포넌트 (components/)

#### 📂 dashboard/ (대시보드 컴포넌트)
```
dashboard/
├── manager-view.tsx                    # 관리자 뷰
├── sidebar.tsx                         # 사이드바
├── summary-cards.tsx                   # 요약 카드
├── task-calendar.tsx                   # 업무 캘린더
├── team-chat.tsx                       # 팀 채팅
├── weekly-report.tsx                   # 주간 리포트
└── task-list.tsx                       # 업무 목록
```

#### 📂 layout/ (레이아웃 컴포넌트)
```
layout/
└── header.tsx                          # 헤더
```

#### 📂 modals/ (모달 컴포넌트)
```
modals/
├── schedule-modal.tsx                  # 일정 모달
├── task-to-schedule-modal.tsx          # 업무→일정 변환 모달
└── schedule-excel-upload.tsx           # 엑셀 업로드 모달
```

#### 📂 ui/ (UI 컴포넌트)
```
ui/
├── floating-shapes.tsx                 # 배경 애니메이션
├── minimal-window.tsx                  # 최소화 창
├── notification-panel.tsx              # 알림 패널
├── timer-widget.tsx                    # 타이머 위젯
└── toaster.tsx                         # 토스트 알림
```

### 🔧 훅 (hooks/)
```
hooks/
├── use-auth.tsx                        # 인증 훅
├── use-mobile.tsx                      # 모바일 감지 훅
└── use-websocket.tsx                   # WebSocket 훅
```

### 📚 라이브러리 (lib/)
```
lib/
└── protected-route.tsx                 # 보호된 라우트
```

---

## 🎯 4. 아이콘별 실행 구조

### 🔵 상태 아이콘
- **🔵 예정**: `status: "scheduled"` → 파란색 원
- **🟡 진행**: `status: "in_progress"` → 노란색 원
- **🟢 완료**: `status: "completed"` → 초록색 원
- **🔴 취소**: `status: "cancelled"` → 빨간색 원
- **⏸️ 연기**: `status: "postponed"` → 회색 원

### 🎯 우선순위 아이콘
- **🔴 긴급**: `priority: "urgent"` → 빨간색 표시
- **🟡 높음**: `priority: "high"` → 주황색 표시
- **🔵 보통**: `priority: "medium"` → 파란색 표시
- **⚪ 낮음**: `priority: "low"` → 회색 표시

### 📋 카테고리 아이콘
- **🏢 경영지원**: 경영 관련 업무
- **📝 신규계약**: 신규 계약 업무
- **📋 계약관리**: 기존 계약 관리
- **❌ 해지계약**: 계약 해지 업무

### 👤 역할 아이콘
- **🔧 개발자**: `role: "developer"` → 보라색 배지
- **👨‍💼 관리자**: `role: "manager"` → 파란색 배지
- **👤 직원**: `role: "employee"` → 회색 배지

### 🔔 알림 아이콘
- **📋 업무 할당**: `type: "task_assigned"`
- **⏰ 마감 임박**: `type: "deadline_approaching"`
- **💬 댓글 추가**: `type: "comment_added"`
- **🔄 상태 변경**: `type: "status_changed"`
- **📊 주간보고서**: `type: "weekly_report_due"`
- **📅 다음주 계획**: `type: "next_week_planning"`
- **🔗 후속업무**: `type: "follow_up_assigned"`

---

## 🚀 5. 실행 및 배포

### 🎯 자동 실행 배치파일
```batch
🎯TaskFlowMaster_완벽실행.bat
- 모든 Node.js 프로세스 종료
- 포트 3003, 5173 정리
- npm install 확인
- 서버와 클라이언트 동시 시작
- 웹브라우저 자동 실행
```

### 📦 NPM 스크립트
```json
{
  "dev": "서버만 실행",
  "dev:client": "클라이언트만 실행", 
  "dev:server": "서버만 실행",
  "dev:all": "서버+클라이언트 동시 실행",
  "build": "프로덕션 빌드",
  "start": "프로덕션 실행",
  "check": "TypeScript 타입 체크",
  "db:push": "데이터베이스 스키마 푸시"
}
```

### 🌐 포트 구성
- **클라이언트**: http://localhost:5173 (Vite 개발 서버)
- **서버**: http://localhost:3003 (Express 서버)
- **WebSocket**: ws://localhost:3003/ws (실시간 통신)

---

## 🔧 6. 개발 환경 설정

### 📋 필수 의존성
```json
{
  "react": "^18.3.1",
  "express": "^4.21.2",
  "drizzle-orm": "^0.39.1",
  "better-sqlite3": "^11.10.0",
  "typescript": "5.6.3",
  "vite": "^5.4.14",
  "tailwindcss": "^3.4.17"
}
```

### 🎨 UI 라이브러리
```json
{
  "@radix-ui/react-*": "Radix UI 컴포넌트들",
  "lucide-react": "^0.453.0",
  "framer-motion": "^11.13.1",
  "recharts": "^2.15.2"
}
```

### 🔧 개발 도구
```json
{
  "tsx": "^4.19.1",
  "concurrently": "^9.1.2",
  "cross-env": "^7.0.3",
  "esbuild": "^0.25.0"
}
```

---

## 📊 7. 데이터 흐름

### 🔄 실시간 업데이트 흐름
```
1. 사용자 액션 (업무 생성/수정/삭제)
2. API 호출 (POST/PUT/DELETE)
3. 데이터베이스 업데이트
4. WebSocket 브로드캐스트
5. 모든 클라이언트 실시간 업데이트
```

### 📈 상태 관리 흐름
```
1. React Query로 서버 상태 관리
2. 로컬 상태는 useState/useReducer
3. 전역 상태는 Context API
4. 캐시 무효화로 데이터 동기화
```

### 🔐 인증 흐름
```
1. 로그인 요청 (POST /api/login)
2. 세션 생성 (Express Session)
3. 쿠키 저장 (httpOnly)
4. 인증 상태 전역 관리 (AuthContext)
5. 보호된 라우트 접근 제어
```

---

## 🎯 8. 핵심 기능별 구조

### 📋 업무 관리 시스템
```
업무 생성 → 후속담당자 지정 → 확인요청 알림 → 승인/반려 → 완료
```

### 📊 보고서 시스템
```
일간 → 주간 → 월간 → 연간 보고서
각 보고서: 요약 분석 + 상세 테이블
```

### 📅 일정 관리 시스템
```
단일 일정 → 반복 일정 → 일정 인스턴스 → 수정/취소
```

### 🔔 알림 시스템
```
이벤트 발생 → 알림 생성 → WebSocket 전송 → UI 업데이트
```

---

## 🚀 9. 확장 가능성

### 📦 모듈 추가 방법
1. `client/src/modules/` 에 새 모듈 디렉토리 생성
2. `config.ts` 와 `index.tsx` 파일 생성
3. 모듈 레지스트리에 등록
4. 페이지에서 모듈 로더로 사용

### 🔌 API 확장 방법
1. `server/routes.ts` 에 새 엔드포인트 추가
2. 데이터베이스 스키마 수정 (필요시)
3. 타입 정의 업데이트
4. 클라이언트에서 API 호출 구현

### 🎨 UI 컴포넌트 추가
1. `client/src/components/ui/` 에 컴포넌트 생성
2. Radix UI + Tailwind CSS 패턴 따르기
3. TypeScript 타입 정의 포함
4. 스토리북 문서화 (선택적)

---

## 📚 10. 문서 및 가이드

### 📋 기존 문서들
- `🌐TaskFlowMaster_API_엔드포인트_완전가이드.md`: API 상세 가이드
- `📚TaskFlowMaster_모듈화_아키텍처_완전가이드.md`: 모듈화 구조
- `🚀TaskFlowMaster_프로젝트_완전분석_가이드.md`: 프로젝트 분석
- `📊TaskFlowMaster_카드섹션별_구성정리.md`: 카드 섹션 구조
- `📋_TaskFlowMaster_작업내용_완전정리.md`: 작업 내용 정리
- `📚NARA_로그인시스템_완전가이드.md`: 로그인 시스템
- `🎯모듈화_로그인시스템_사용예제.md`: 모듈 사용 예제
- `🎯모듈활용_실전예제집.md`: 실전 예제
- `오류수정_매뉴얼.md`: 오류 해결 가이드

### 🔧 개발 가이드
- `JSX_백업시스템_사용법.md`: 백업 시스템 사용법
- `모듈화_설계_계획.md`: 모듈화 설계 계획
- `모듈화_완성_가이드.md`: 모듈화 완성 가이드

---

## 🎯 결론

TaskFlowMaster는 **완전한 모듈화 구조**로 설계된 종합 업무 관리 시스템입니다:

### ✅ 완성된 기능
- 🔐 인증 시스템 (로그인/권한 관리)
- 📋 업무 관리 (생성/수정/삭제/후속담당자)
- 📊 실시간 대시보드 (요약 카드/차트)
- 📅 일정 관리 (단일/반복 일정)
- 💬 팀 채팅 (실시간 메시징)
- 📈 보고서 시스템 (일간/주간/월간/연간)
- 🔔 알림 시스템 (실시간 알림)
- 📱 반응형 UI (모바일 지원)

### 🔧 확장 가능한 구조
- 모듈별 독립성 보장
- API 엔드포인트 확장 용이
- 데이터베이스 스키마 유연성
- UI 컴포넌트 재사용성

### 🚀 운영 준비 완료
- 자동 실행 배치파일
- 완전한 문서화
- 오류 처리 시스템
- 백업 및 복구 시스템

이 가이드를 통해 **어떤 개발자든 TaskFlowMaster 프로젝트의 모든 구조를 완벽하게 이해하고 확장할 수 있습니다**. 