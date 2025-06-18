# 🚀 TaskFlowMaster - 작업관리 시스템

**NARA Corporation 효율적인 업무관리 솔루션 - 완전 작동 버전**

## 📋 **프로젝트 개요**

TaskFlowMaster는 기업의 업무 효율성을 극대화하는 현대적인 작업관리 시스템입니다.
- ✅ **실제 SQLite 데이터베이스 저장** - 새업무 생성이 실제로 저장됩니다!
- ✅ 실시간 작업 진행률 추적
- 👥 팀원별 업무 배정 및 관리
- 📊 시각적 대시보드와 분석 기능
- 🔔 스마트 알림 시스템
- 💾 **로컬 데이터베이스** - 인터넷 연결 없이도 작동

---

## 🔐 **계정 정보**

### **전체 계정 목록** (총 7개 계정)

| 순번 | 🆔 아이디 | 🔑 비밀번호 | 👤 이름 | 🏢 부서 | 👔 역할 | 📧 이메일 |
|------|----------|------------|---------|----------|---------|-----------|
| 1 | **nara1** | **nara1** | 김하경 | 대안업무팀 | employee | kim.hakyung@nara.go.kr |
| 2 | **nara2** | **nara2** | 김하경 | 대안업무팀 | employee | kim.hakyung2@nara.go.kr |
| 3 | **nara3** | **nara3** | 김수진 | 홍보업무진흥팀 | employee | kim.sujin@nara.go.kr |
| 4 | **nara4** | **nara4** | 김수진 | 홍보업무진흥팀 | employee | kim.sujin2@nara.go.kr |
| 5 | **nara5** | **nara5** | 관리자 | 관리팀 | manager | manager1@nara.go.kr |
| 6 | **nara6** | **nara6** | 관리자 | 관리팀 | manager | manager2@nara.go.kr |
| 7 | **admin** | **admin** | 개발자 | 시스템관리팀 | manager | admin@nara.go.kr |

### **추천 테스트 계정**
- **일반 사용자**: `nara1` / `nara1`
- **관리자**: `admin` / `admin`

---

## 🚀 **빠른 시작**

### **1단계: 프로젝트 실행**
```bash
# 자동화 배치파일 실행
작업관리_완전자동화.bat

# 또는 수동 실행
npm run dev:all
```

### **2단계: 웹 접속**
- **프론트엔드**: http://localhost:5173
- **백엔드 API**: http://localhost:3000

### **3단계: 로그인 우회 모드**
현재는 **개발 모드**로 설정되어 있어 **로그인 없이 바로 메인페이지 접근 가능**합니다!

---

## ⚙️ **개발 설정**

### **로그인 기능 활성화/비활성화**
`client/src/lib/protected-route.tsx` 파일에서:
```typescript
const isDevelopmentMode = true;  // 개발 모드 (로그인 우회)
const isDevelopmentMode = false; // 운영 모드 (로그인 필수)
```

### **기술 스택**
- 🎨 **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- ⚡ **Backend**: Express.js, Node.js
- 🗄️ **Database**: Drizzle ORM, PostgreSQL
- 🔄 **State Management**: TanStack Query
- 🛠️ **Build Tool**: Vite
- 🎯 **Routing**: Wouter

---

## 📂 **프로젝트 구조**

```
TaskFlowMaster/
├── 📁 client/          # 프론트엔드 (React + TypeScript)
│   ├── src/
│   │   ├── components/ # UI 컴포넌트
│   │   ├── pages/      # 페이지 컴포넌트
│   │   ├── hooks/      # 커스텀 훅
│   │   └── lib/        # 유틸리티 함수
├── 📁 server/          # 백엔드 (Express + TypeScript)
│   ├── index.ts        # 서버 엔트리 포인트
│   ├── routes.ts       # API 라우트
│   └── init-db.ts      # 데이터베이스 초기화
├── 📁 shared/          # 공통 타입 및 스키마
└── 📄 package.json     # 프로젝트 설정
```

---

## 🛠️ **개발 명령어**

```bash
npm run dev:all        # 서버 + 클라이언트 동시 실행
npm run dev:server     # 백엔드만 실행 (포트 3000)
npm run dev:client     # 프론트엔드만 실행 (포트 5173)
npm run build          # 프로덕션 빌드
npm run start          # 프로덕션 서버 실행
```

---

## 🔧 **문제 해결**

### **포트 충돌 시**
```bash
# Node.js 프로세스 전체 종료
taskkill /f /im node.exe

# 특정 포트 종료
netstat -ano | findstr :3000
taskkill /f /pid [PID번호]
```

### **의존성 오류 시**
```bash
# 패키지 재설치
npm install

# 캐시 정리 후 재설치
npm cache clean --force
npm install
```

---

## 🎯 **주요 기능**

### **📊 대시보드**
- 실시간 작업 현황 모니터링
- 진행률 시각화 차트
- 우선순위별 작업 분류

### **👥 사용자 관리**
- 직원/관리자 권한 구분
- 부서별 업무 배정
- 개인별 성과 추적

### **📋 작업 관리**
- 작업 생성, 수정, 삭제
- 상태 관리 (대기/진행/검토/완료)
- 마감일 알림 기능

### **🔔 알림 시스템**
- 실시간 푸시 알림
- 작업 배정 알림
- 마감일 임박 알림

---

## 🌟 **특별 기능**

### **✨ 현대적 UI/UX**
- 글래스모피즘 디자인
- 다크/라이트 테마 지원
- 반응형 모바일 대응

### **⚡ 고성능 최적화**
- React Query 캐싱
- 무한 스크롤
- 실시간 업데이트

---

## 📞 **지원 및 문의**

프로젝트 관련 문의사항이나 버그 신고는 개발팀으로 연락해주세요.

**🎉 TaskFlowMaster로 효율적인 업무관리를 시작하세요! 🎉** 