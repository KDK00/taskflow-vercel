# 📚 NARA 로그인 시스템 완전 구현 가이드

## 🎯 개요
이 문서는 NARA 로그인 시스템을 다른 프로젝트에서 완전히 동일하게 구현할 수 있도록 모든 디자인, 구성, API 연결까지 상세히 설명합니다.

## 🎨 디자인 시스템

### 배경 및 레이아웃
```css
/* 메인 배경 */
.gradient-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

/* 플로팅 도형들 */
.floating-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}
```

### 글래스모피즘 효과
```css
/* 글래스모피즘 기본 스타일 */
.glassmorphism {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 입력 필드 글래스 효과 */
.input-glass {
  height: 56px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  font-size: 16px;
  padding: 0 16px;
  transition: all 0.3s ease;
}

.input-glass:focus {
  background: rgba(255, 255, 255, 1);
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
```

### 그라데이션 및 버튼
```css
/* 헤더 그라데이션 */
.gradient-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 기본 버튼 스타일 */
.btn-primary {
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 16px;
  color: white;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}
```

### 애니메이션 효과
```css
/* 슬라이드업 애니메이션 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slideUp {
  animation: slideUp 0.6s ease-out;
}

/* 반짝임 효과 (메인 헤더용) */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-shimmer {
  animation: shimmer 3s infinite;
}
```

## 📐 정확한 크기 및 스타일

### 메인 로그인 카드
```tsx
<div className="w-full max-w-md relative">
  <div className="glassmorphism rounded-2xl overflow-hidden animate-slideUp">
    {/* 헤더 섹션 */}
    <div className="gradient-primary text-white p-8 text-center relative overflow-hidden">
      {/* 로고 */}
      <img 
        src="/nara-logo.png" 
        alt="NARA Logo" 
        className="h-12 w-auto object-contain mx-auto mb-6"
      />
      {/* 제목 */}
      <h1 className="font-bold mb-2 tracking-tight text-white text-[25px]">
        NARA 업무관리시스템
      </h1>
      {/* 부제목 */}
      <p className="text-white/90 text-sm">
        계정 정보를 입력하여 로그인하세요
      </p>
    </div>
    
    {/* 폼 섹션 */}
    <div className="p-8">
      {/* 폼 내용... */}
    </div>
  </div>
</div>
```

### 테스트 계정 패널
```tsx
<div className="w-full max-w-md">
  <div className="animate-slideUp">
    {/* 헤더 */}
    <div className="bg-white/10 backdrop-blur-sm text-white p-4 text-center rounded-t-xl border border-white/20">
      <h2 className="font-bold text-white text-lg">테스트 계정</h2>
    </div>
    
    {/* 계정 목록 */}
    <div className="bg-white/5 backdrop-blur-sm p-6 space-y-3 border-l border-r border-white/20">
      {/* 계정 버튼들... */}
    </div>
  </div>
</div>
```

### 계정 버튼 스타일
```tsx
<Button className="w-full h-auto p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-200 hover:scale-[1.02] group">
  {/* 버튼 내용... */}
</Button>
```

## 🔧 API 연결 구조

### 1. 인증 Hook (use-auth.ts)
```typescript
export function useAuth() {
  const queryClient = useQueryClient();
  
  // 현재 사용자 정보 조회
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/me', {
        credentials: 'include'
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.success ? result.user : null;
    },
    retry: false,
  });

  // 로그인 뮤테이션
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || '로그인에 실패했습니다.');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });

  // 로그아웃 뮤테이션
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
    }
  });

  return { user, userLoading, loginMutation, logoutMutation };
}
```

### 2. 서버 엔드포인트 (routes.ts)

#### 로그인 엔드포인트
```typescript
// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 사용자 검증 로직 (프로젝트별 수정 필요)
    const user = await validateUser(username, password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '사용자명 또는 비밀번호가 올바르지 않습니다.'
      });
    }
    
    // 세션에 사용자 정보 저장
    req.session.userId = user.id;
    req.session.user = user;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});
```

#### 로그아웃 엔드포인트
```typescript
// POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '로그아웃 중 오류가 발생했습니다.'
      });
    }
    
    res.clearCookie('connect.sid');
    res.json({
      success: true,
      message: '로그아웃 되었습니다.'
    });
  });
});
```

#### 사용자 정보 확인 엔드포인트
```typescript
// GET /api/me
app.get('/api/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }
  
  res.json({
    success: true,
    user: req.session.user
  });
});
```

### 3. 세션 설정 (server/index.ts)
```typescript
import session from 'express-session';

app.use(session({
  secret: 'your-session-secret-key', // 프로젝트별 변경 필요
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // HTTPS 사용시 true로 변경
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));
```

## 📁 파일 구조

```
src/
├── modules/
│   └── login/
│       ├── index.tsx                 # 메인 로그인 컴포넌트
│       ├── components/
│       │   └── test-account-panel.tsx # 테스트 계정 패널
│       ├── types/
│       │   └── auth.ts               # 인증 관련 타입
│       └── config/
│           └── test-accounts.ts      # 테스트 계정 설정
├── hooks/
│   └── use-auth.ts                   # 인증 훅
├── components/ui/
│   ├── button.tsx                    # 버튼 컴포넌트
│   ├── input.tsx                     # 입력 컴포넌트
│   ├── label.tsx                     # 라벨 컴포넌트
│   └── floating-shapes.tsx           # 플로팅 도형 컴포넌트
└── index.css                         # 전역 스타일
```

## 🎯 타입 정의

### auth.ts
```typescript
export interface LoginData {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'manager' | 'employee';
  department: string;
}

export interface TestAccount extends User {
  password: string;
}
```

### test-accounts.ts
```typescript
export const testAccounts: TestAccount[] = [
  {
    id: "admin",
    username: "admin",
    password: "admin123",
    name: "개발자",
    role: "manager",
    department: "시스템관리팀"
  },
  // 추가 계정들...
];
```

## 🚀 새 프로젝트 적용 방법

### 1. 패키지 설치
```bash
npm install @tanstack/react-query wouter lucide-react express-session
npm install -D @types/express-session
```

### 2. 폴더 구조 생성
위의 파일 구조대로 폴더와 파일들을 생성합니다.

### 3. 스타일 적용
`src/index.css`에 위의 CSS 스타일들을 추가합니다.

### 4. 서버 설정
- Express 서버에 세션 미들웨어 추가
- 인증 관련 엔드포인트 구현
- 사용자 검증 로직을 프로젝트에 맞게 수정

### 5. 환경별 수정 사항
- **로고**: `/public/nara-logo.png` 파일을 프로젝트 로고로 교체
- **제목**: "NARA 업무관리시스템"을 프로젝트명으로 변경
- **테스트 계정**: `test-accounts.ts`에서 계정 정보 수정
- **API 엔드포인트**: 데이터베이스나 인증 시스템에 맞게 수정
- **세션 시크릿**: 보안을 위해 고유한 시크릿 키 사용

### 6. 색상 커스터마이징
그라데이션 색상을 변경하려면:
```css
/* 메인 그라데이션 */
background: linear-gradient(135deg, #새색상1 0%, #새색상2 100%);

/* 버튼 그라데이션 */
background: linear-gradient(135deg, #새색상1 0%, #새색상2 100%);
```

## 🔒 보안 고려사항

1. **세션 시크릿**: 프로덕션에서는 환경변수로 관리
2. **HTTPS**: 프로덕션에서는 HTTPS 사용 필수
3. **CSRF 보호**: 필요시 CSRF 토큰 추가
4. **비밀번호 해싱**: 실제 프로젝트에서는 bcrypt 등 사용
5. **세션 만료**: 적절한 세션 만료 시간 설정

이 가이드를 따라하면 동일한 디자인과 기능의 로그인 시스템을 다른 프로젝트에서도 완벽하게 구현할 수 있습니다. 