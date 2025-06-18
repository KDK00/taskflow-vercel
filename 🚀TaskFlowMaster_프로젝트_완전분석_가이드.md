# 🚀 TaskFlowMaster 프로젝트 완전 분석 가이드

## 📋 문서 개요

이 문서는 **TaskFlowMaster 프로젝트의 현재 구조, 기술 스택, 엔드포인트, 문제해결 방법**을 완전히 분석한 종합 가이드입니다. 

---

## 🏗️ 프로젝트 구조

### 📁 디렉토리 구조
```
TaskFlowMaster_백업/
├── 📁 client/                          # 프론트엔드 (React + Vite)
│   ├── src/
│   │   ├── modules/                     # 🔥 모듈화된 카드 섹션들
│   │   │   ├── core/                    # 핵심 인프라
│   │   │   ├── summary-cards/           # 요약 통계 카드
│   │   │   ├── task-list/               # 업무 목록 카드  
│   │   │   ├── calendar/                # 캘린더 카드
│   │   │   ├── team-chat/               # 팀 채팅 카드
│   │   │   ├── weekly-report/           # 주간 보고서 카드
│   │   │   └── manager-view/            # 관리자 뷰 카드
│   │   ├── components/                  # UI 컴포넌트
│   │   │   ├── dashboard/               # 대시보드 컴포넌트
│   │   │   ├── layout/                  # 레이아웃 컴포넌트
│   │   │   ├── modals/                  # 모달 컴포넌트
│   │   │   └── ui/                      # 기본 UI 컴포넌트
│   │   ├── pages/                       # 페이지 컴포넌트
│   │   ├── hooks/                       # React 훅
│   │   ├── lib/                         # 라이브러리
│   │   ├── types/                       # TypeScript 타입
│   │   └── utils/                       # 유틸리티 함수
│   └── index.html                       # HTML 엔트리
├── 📁 server/                           # 백엔드 (Express + SQLite)
│   ├── routes.ts                        # API 라우팅
│   ├── index.ts                         # 서버 엔트리
│   ├── auth.ts                          # 인증 시스템
│   ├── db.ts                            # 데이터베이스 설정
│   ├── storage.ts                       # 스토리지 관리
│   ├── chat.ts                          # WebSocket 채팅
│   └── init-db.ts                       # DB 초기화
├── 📁 shared/                           # 공유 타입/스키마
├── 📁 electron/                         # Electron 앱 (선택사항)
├── 🔧 .bat files                        # 자동실행 배치파일들
└── 📄 설정 파일들                       # package.json, vite.config.ts 등
```

---

## 🛠️ 기술 스택

### 🎨 프론트엔드
- **프레임워크**: React 18.3.1
- **빌드 도구**: Vite 5.4.14
- **언어**: TypeScript 5.6.3
- **스타일링**: 
  - TailwindCSS 3.4.17
  - Radix UI (headless components)
  - Framer Motion (애니메이션)
- **상태 관리**: TanStack Query 5.60.5
- **라우팅**: Wouter 3.3.5
- **폼 관리**: React Hook Form 7.55.0
- **아이콘**: Lucide React 0.453.0
- **차트**: Recharts 2.15.2
- **날짜**: date-fns 3.6.0

### 🔧 백엔드
- **런타임**: Node.js
- **프레임워크**: Express 4.21.2
- **언어**: TypeScript 5.6.3
- **데이터베이스**: SQLite (better-sqlite3 11.10.0)
- **ORM**: Drizzle ORM 0.39.1
- **실시간 통신**: WebSocket (ws 8.18.0)
- **인증**: Express Session + bcryptjs
- **파일 처리**: XLSX 0.18.5
- **스키마 검증**: Zod 3.24.2

### 🔨 개발 도구
- **패키지 관리**: npm
- **번들러**: esbuild 0.25.0
- **프로세스 관리**: concurrently 9.1.2
- **개발 서버**: tsx 4.19.1 (TypeScript 실행)
- **환경 변수**: cross-env 7.0.3

---

## 🌐 포트 및 엔드포인트 구성

### 📡 포트 설정
```
🖥️ 서버 (백엔드)    : http://localhost:3003
🌐 클라이언트 (프론트) : http://localhost:5173
🔄 WebSocket        : ws://localhost:3003/ws
```

### 🎯 주요 API 엔드포인트

#### 🔐 인증 관련
```
POST   /api/login              # 로그인
GET    /api/me                 # 현재 사용자 정보
GET    /api/user               # 사용자 정보 (별칭)
GET    /api/users              # 사용자 목록
```

#### 📊 통계 관련
```
GET    /api/users/me/stats     # 개인 업무 통계
GET    /api/team/stats         # 팀 업무 통계 (관리자용)
```

#### 📋 업무 관리
```
GET    /api/tasks              # 업무 목록 조회
POST   /api/tasks              # 새 업무 생성
PUT    /api/tasks/:id          # 업무 수정
DELETE /api/tasks/:id          # 업무 삭제
```

#### 📅 일정 관리
```
GET    /api/schedules          # 일정 목록
POST   /api/schedules          # 일정 생성
PUT    /api/schedules/:id      # 일정 수정
DELETE /api/schedules/:id      # 일정 삭제
```

#### 📄 파일 처리
```
POST   /api/excel/upload       # Excel 파일 업로드
POST   /api/excel/parse        # Excel 파일 파싱
```

#### 🔔 알림 시스템
```
GET    /api/notifications      # 알림 목록
POST   /api/notifications      # 알림 생성
PUT    /api/notifications/:id  # 알림 읽음 처리
```

#### 💬 채팅 시스템
```
WebSocket: ws://localhost:3003/ws
- 실시간 메시징
- 타이핑 인디케이터
- 사용자 상태 업데이트
```

---

## 🔧 실행 및 배포 가이드

### 🚀 자동 실행 (권장)
```bash
# 1. 완전 자동화 실행 (가장 간단)
🎯TaskFlowMaster_완전자동실행.bat

# 2. 웹 전용 실행
웹실행_완전자동.bat

# 3. 간단 실행 (기본)
간단실행.bat
```

### 🛠️ 수동 실행
```bash
# 개발 모드 (동시 실행)
npm run dev:all

# 개별 실행
npm run dev:server   # 백엔드만
npm run dev:client   # 프론트엔드만

# 프로덕션 빌드
npm run build
npm start
```

### 📦 빌드 및 배포
```bash
# 프로덕션 빌드
npm run build

# 타입 체크
npm run check

# 데이터베이스 스키마 업데이트
npm run db:push
```

---

## 🛡️ 문제 해결 가이드

### 1. 🚨 포트 충돌 문제

#### **증상**
- "EADDRINUSE: address already in use" 에러
- 서버 시작 실패

#### **해결 방법**
```bash
# A. 자동 해결 (배치파일 사용)
🎯TaskFlowMaster_완전자동실행.bat

# B. 수동 해결
# 1) 포트 사용 프로세스 확인
netstat -ano | findstr :3003
netstat -ano | findstr :5173

# 2) 프로세스 강제 종료
taskkill /PID [프로세스ID] /F

# 3) Node.js 프로세스 전체 종료
taskkill /IM node.exe /F
```

#### **예방 방법**
```bash
# 포트 변경 (필요시)
# server/index.ts에서 포트 수정
const port = process.env.PORT || 3004; // 3003 → 3004

# vite.config.ts에서 프론트엔드 포트 수정
server: { port: 5174 } // 5173 → 5174
```

### 2. 📦 의존성 오류 문제

#### **증상**
- "Module not found" 에러
- npm 명령어 실행 실패
- node_modules 관련 오류

#### **해결 방법**
```bash
# A. 완전 재설치
rm -rf node_modules package-lock.json
npm install

# B. 캐시 정리 후 재설치
npm cache clean --force
npm install

# C. 특정 패키지 재설치
npm uninstall [패키지명]
npm install [패키지명]
```

#### **일반적인 의존성 문제**
```bash
# TypeScript 관련
npm install -D typescript @types/node @types/react

# Vite 관련
npm install -D vite @vitejs/plugin-react

# 데이터베이스 관련
npm install better-sqlite3 drizzle-orm drizzle-kit
```

### 3. 🔧 JSX 구문 오류 대응

#### **증상**
- "Unexpected token" 에러
- 컴포넌트 렌더링 실패
- 빌드 시 구문 오류

#### **해결 방법**

**A. JSX 백업 시스템 활용**
```bash
# JSX 백업 생성 (수정 전)
cp component.tsx component.tsx.backup

# 오류 발생 시 복구
cp component.tsx.backup component.tsx
```

**B. 일반적인 JSX 오류 패턴**
```tsx
// ❌ 잘못된 패턴
<TabsTrigger>
  텍스트 직접 포함 ← 오류 원인
</TabsTrigger>

// ✅ 올바른 패턴  
<TabsTrigger>
  <span>텍스트를 span으로 감싸기</span>
</TabsTrigger>

// ❌ 잘못된 닫힌 태그
<div>
  <span>내용
  // </span> 누락 ← 오류 원인
</div>

// ✅ 올바른 닫힌 태그
<div>
  <span>내용</span>
</div>
```

**C. TypeScript 타입 오류**
```tsx
// ❌ 타입 불일치
const data: string = 123; // 오류

// ✅ 타입 명시 또는 수정
const data: number = 123;
const text: string = "123";
```

### 4. 🗄️ 데이터베이스 문제

#### **증상**
- "SQLITE_READONLY" 에러
- 테이블 생성 실패
- 데이터 저장/조회 오류

#### **해결 방법**
```bash
# A. 데이터베이스 재초기화
rm taskflow.db
npm run dev:all

# B. 권한 문제 해결 (Windows)
# 파일 속성 → 읽기 전용 해제

# C. 스키마 강제 업데이트
npm run db:push
```

### 5. 🌐 웹브라우저 접속 문제

#### **증상**
- 브라우저에서 페이지 로드 실패
- "This site can't be reached" 오류
- 빈 페이지 표시

#### **해결 방법**
```bash
# A. 서버 상태 확인
netstat -an | findstr 3003
netstat -an | findstr 5173

# B. 방화벽 확인
# Windows 방화벽에서 포트 허용

# C. 브라우저 캐시 정리
# Ctrl + Shift + Delete

# D. 다른 브라우저로 테스트
# Chrome, Edge, Firefox 등
```

### 6. 🔄 실시간 기능 문제

#### **증상**
- WebSocket 연결 실패
- 실시간 업데이트 안됨
- 채팅 메시지 전송 실패

#### **해결 방법**
```bash
# A. WebSocket 연결 확인
# 브라우저 개발자 도구 → Network → WS 탭

# B. 서버 재시작
npm run dev:all

# C. 클라이언트 재접속
# 페이지 새로고침 (F5)
```

### 7. 📱 모바일/반응형 문제

#### **증상**
- 모바일에서 레이아웃 깨짐
- 터치 이벤트 작동 안함
- 스크롤 문제

#### **해결 방법**
```css
/* TailwindCSS 반응형 클래스 활용 */
<div className="
  grid grid-cols-1           /* 모바일: 1열 */
  md:grid-cols-2             /* 태블릿: 2열 */
  lg:grid-cols-4             /* 데스크톱: 4열 */
">

/* 터치 최적화 */
<button className="
  min-h-[44px]               /* 최소 터치 영역 */
  touch-manipulation         /* 터치 최적화 */
">
```

---

## 🔒 보안 및 인증

### 🔐 인증 시스템
```typescript
// 현재 구현된 간단 인증
const validUsers = [
  'admin',   // 관리자
  'nara1',   // 일반 사용자 1
  'nara2',   // 일반 사용자 2
  'nara3',   // 일반 사용자 3
  'nara4',   // 일반 사용자 4
  'nara5',   // 일반 사용자 5
  'nara6'    // 일반 사용자 6
];
```

### 🛡️ 권한 시스템
```typescript
// 역할별 권한
interface UserRole {
  employee: {  // 직원
    tasks: 'read' | 'write',
    stats: 'own_only',
    team: 'read_only'
  },
  manager: {   // 관리자
    tasks: 'full',
    stats: 'team_wide',
    team: 'full'
  }
}
```

---

## 📊 성능 최적화

### ⚡ 프론트엔드 최적화
```typescript
// React.memo 활용
const SummaryCard = React.memo(({ data }) => {
  return <div>{data.title}</div>;
});

// useMemo 활용
const expensiveCalculation = useMemo(() => {
  return heavyDataProcessing(data);
}, [data]);

// 가상화 (대량 데이터)
import { FixedSizeList as List } from 'react-window';
```

### 🔧 백엔드 최적화
```typescript
// 데이터베이스 인덱스
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);

// 페이지네이션
const tasks = await db.select()
  .from(tasksTable)
  .limit(50)
  .offset(page * 50);
```

---

## 🚀 배포 전략

### 🌐 웹 호스팅 (권장)
```bash
# 1. Vercel (프론트엔드)
npm run build
vercel deploy

# 2. Railway (백엔드)
# Dockerfile 생성 후 배포

# 3. Netlify (정적 호스팅)
npm run build
netlify deploy --prod
```

### 💻 로컬 배포
```bash
# 1. PM2 사용 (프로덕션)
npm install -g pm2
pm2 start dist/index.js --name taskflow

# 2. Docker 사용
docker build -t taskflow .
docker run -p 3003:3003 taskflow
```

---

## 📝 개발 팁

### 🛠️ 디버깅
```typescript
// 개발 모드에서 상세 로깅
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Debug Info:', data);
}

// React Query Devtools 활용
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
```

### 🔄 핫 리로드
```typescript
// Vite HMR 최적화
if (import.meta.hot) {
  import.meta.hot.accept();
}
```

### 📱 모바일 테스트
```bash
# 네트워크에서 접속 가능하도록 설정
# vite.config.ts
server: {
  host: '0.0.0.0',  // 외부 접속 허용
  port: 5173
}

# 모바일에서 접속
# http://[PC_IP]:5173
```

---

## 🎯 마무리

### ✅ 정상 작동 확인 체크리스트
- [ ] 🌐 http://localhost:5173 접속 가능
- [ ] 🔧 http://localhost:3003 API 응답
- [ ] 📊 요약 카드 데이터 표시
- [ ] 📋 업무 목록 로드
- [ ] 💬 실시간 채팅 작동
- [ ] 📅 캘린더 표시
- [ ] 🔐 로그인 기능 작동

### 🆘 긴급 복구 방법
```bash
# 1. 전체 재시작
🎯TaskFlowMaster_완전자동실행.bat

# 2. 수동 복구
taskkill /IM node.exe /F
rm -rf node_modules
npm install
npm run dev:all
```

### 📞 추가 지원
프로젝트 관련 문제 발생 시:
1. 🔍 에러 로그 확인 (브라우저 콘솔)
2. 📋 배치파일로 자동 복구 시도
3. 🛠️ 위의 문제해결 가이드 참조
4. 🔄 최종 수단: 프로젝트 재시작

**TaskFlowMaster는 완전 모듈화된 시스템으로, 각 모듈이 독립적으로 작동하여 높은 안정성과 확장성을 제공합니다!** 🎉 