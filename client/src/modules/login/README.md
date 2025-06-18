# 🔐 Login Module - 완전히 분리된 로그인 시스템

## 📋 개요

TaskFlowMaster의 완전히 모듈화된 로그인 시스템입니다. 
이 모듈은 다른 프로젝트에 독립적으로 이식 가능하며, 모든 인증 관련 기능을 포함합니다.

## 🏗️ 구조

```
client/src/modules/login/
├── components/           # UI 컴포넌트들
│   ├── auth-header.tsx      # 로그인 헤더
│   ├── login-form.tsx       # 로그인 폼
│   ├── register-form.tsx    # 회원가입 폼
│   └── test-account-panel.tsx # 테스트 계정 패널
├── config/              # 설정 파일들
│   └── test-accounts.ts     # 테스트 계정 설정
├── types/               # 타입 정의
│   └── auth.ts             # 인증 관련 타입
├── index.tsx            # 메인 모듈 진입점
└── README.md            # 이 파일
```

## 🚀 주요 기능

### 1. 계정 선택 자동 로그인
- 6개의 사전 정의된 계정 (admin, nara0~nara4)
- 계정 클릭 시 자동 로그인
- 계정별 색상 테마 및 아이콘

### 2. 수동 로그인
- 아이디/비밀번호 직접 입력
- 실시간 유효성 검사
- 로딩 상태 표시

### 3. 회원가입 (제한적)
- 데모 환경에서는 제한됨
- 기존 테스트 계정 사용 권장

## 👥 계정 정보

| 계정 | 이름 | 부서 | 역할 | 이메일 |
|------|------|------|------|---------|
| admin | 개발자 | 시스템관리팀 | manager | admin@nara.go.kr |
| nara0 | 관리자 | 관리팀 | manager | manager1@nara.go.kr |
| nara1 | 관리자 | 관리팀 | manager | manager2@nara.go.kr |
| nara2 | 김하경 | 경영지원1팀 | employee | kim.hakyung2@nara.go.kr |
| nara3 | 송나영 | 경영지원1팀 | employee | kim.sujin@nara.go.kr |
| nara4 | 김수진 | 경영지원2팀 | employee | kim.sujin2@nara.go.kr |

## 🔧 사용 방법

### 1. 기본 사용
```tsx
// pages/auth-page.tsx
import LoginModule from "@/modules/login";

export default function AuthPage() {
  return <LoginModule />;
}
```

### 2. 커스텀 설정
```tsx
// config/test-accounts.ts에서 계정 수정
export const testAccounts: TestAccount[] = [
  {
    id: "admin",
    name: "개발자",
    department: "시스템관리팀",
    role: "관리자",
    username: "admin",
    password: "admin",
    icon: Crown,
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
    borderColor: "border-purple-300"
  },
  // ... 추가 계정
];
```

## 🎨 디자인 특징

### 1. Glass Card Design
- 반투명 유리 효과
- 그라데이션 배경
- 부드러운 애니메이션

### 2. 테마별 색상
- 관리자: 보라/파랑/초록 (Crown 아이콘)
- 직원: 노랑/분홍/인디고 (User 아이콘)

### 3. 반응형 디자인
- 데스크톱: 좌우 분할 레이아웃
- 모바일: 스택 레이아웃

## 🔗 API 연동

### 서버 설정 (routes.ts)
```typescript
// 계정 데이터베이스
const accountDatabase = {
  'admin': {
    id: 'admin',
    username: 'admin',
    password: 'admin',
    name: '개발자',
    department: '시스템관리팀',
    role: 'manager',
    email: 'admin@nara.go.kr'
  },
  // ... 기타 계정
};

// 로그인 API
router.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const account = accountDatabase[username];
  
  if (account && account.password === password) {
    req.session.userId = username;
    const { password: _, ...userInfo } = account;
    res.json({ success: true, user: userInfo });
  } else {
    res.status(401).json({ 
      success: false, 
      message: '로그인 정보가 올바르지 않습니다.' 
    });
  }
});
```

## 🛡️ 보안 고려사항

### 1. 개발 환경 전용
- 실제 운영환경에서는 비밀번호 해시화 필요
- 현재는 평문 비밀번호 사용 (개발용)

### 2. 세션 관리
- Express Session 사용
- 로그인 상태 서버에서 관리

### 3. API 보안
- 인증되지 않은 요청 차단
- 적절한 HTTP 상태 코드 반환

## 📱 이식성

### 1. 완전 독립 모듈
- 다른 프로젝트에 복사-붙여넣기 가능
- 의존성 최소화

### 2. 필요한 의존성
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x",
    "wouter": "^3.x",
    "lucide-react": "^0.x",
    "@/components/ui/*": "shadcn/ui"
  }
}
```

### 3. 커스터마이징 포인트
- `config/test-accounts.ts`: 계정 정보
- `components/auth-header.tsx`: 헤더 텍스트
- CSS 클래스: 색상 및 스타일

## 🚨 문제 해결

### 1. 로그인 실패
- 서버 실행 상태 확인
- 네트워크 연결 확인
- 콘솔 로그 확인

### 2. 세션 문제
- 브라우저 쿠키 설정 확인
- CORS 설정 확인

### 3. UI 문제
- 의존성 패키지 설치 확인
- CSS 클래스 로딩 확인

## 🔄 업데이트 가이드

### 1. 계정 추가
1. `server/routes.ts`의 `accountDatabase` 수정
2. `config/test-accounts.ts`에 계정 추가
3. 색상 테마 설정

### 2. UI 수정
1. 해당 컴포넌트 파일 수정
2. 타입 정의 업데이트 (필요시)
3. 스타일 클래스 조정

## 📊 성능 최적화

### 1. 컴포넌트 분리
- 각 기능별 컴포넌트 분리
- 재사용 가능한 구조

### 2. 상태 관리
- React Query로 서버 상태 관리
- 로컬 상태 최소화

### 3. 로딩 최적화
- 지연 로딩 지원
- 애니메이션 최적화

---

> 이 모듈은 TaskFlowMaster 프로젝트의 완전 모듈화 아키텍처의 일부입니다.  
> 다른 모듈과 독립적으로 작동하며, 필요에 따라 다른 프로젝트에 이식 가능합니다. 