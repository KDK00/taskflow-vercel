# 🎯 TaskFlowMaster 완전 모듈화 시스템 구축 가이드

## 📋 개요

TaskFlowMaster의 모든 페이지를 **독립적인 플러그인 모듈**로 분리하여 개별 관리가 용이하고 다른 프로젝트에서 바로 사용할 수 있는 시스템을 구축합니다.

---

## 🏗️ 모듈화 아키텍처

### 📁 완전 모듈 구조
```
client/src/modules/
├── 🔧 core/                    # 핵심 인프라
│   ├── types/
│   │   ├── index.ts           # 공통 타입 정의
│   │   ├── module.ts          # 모듈 인터페이스
│   │   └── api.ts             # API 타입
│   ├── registry/
│   │   ├── ModuleRegistry.ts  # 모듈 레지스트리
│   │   └── ModuleLoader.tsx   # 동적 로더
│   ├── api/
│   │   ├── client.ts          # 독립 API 클라이언트
│   │   └── endpoints.ts       # 엔드포인트 매니저
│   ├── components/
│   │   ├── ErrorBoundary.tsx  # 에러 격리
│   │   ├── ModuleWrapper.tsx  # 모듈 래퍼
│   │   └── LoadingSpinner.tsx # 로딩 UI
│   └── utils/
│       ├── config.ts          # 설정 관리
│       └── validators.ts      # 유효성 검증
├── 📊 dashboard/               # 대시보드 모듈
│   ├── config.ts              # 모듈 설정
│   ├── index.tsx              # 메인 컴포넌트
│   ├── components/
│   │   ├── StatusCards.tsx    # 상태 카드
│   │   ├── ChartSection.tsx   # 차트 영역
│   │   └── QuickActions.tsx   # 빠른 작업
│   ├── hooks/
│   │   ├── useDashboard.ts    # 대시보드 훅
│   │   └── useStats.ts        # 통계 훅
│   ├── services/
│   │   └── dashboardService.ts # 대시보드 서비스
│   └── types/
│       └── dashboard.ts       # 대시보드 타입
├── 📋 task-management/         # 업무 관리 모듈
│   ├── config.ts
│   ├── index.tsx
│   ├── components/
│   │   ├── TaskList.tsx       # 업무 목록
│   │   ├── TaskForm.tsx       # 업무 양식
│   │   ├── TaskFilters.tsx    # 필터
│   │   └── TaskItem.tsx       # 업무 항목
│   ├── hooks/
│   │   ├── useTasks.ts        # 업무 훅
│   │   └── useTaskForm.ts     # 양식 훅
│   ├── services/
│   │   └── taskService.ts     # 업무 서비스
│   └── types/
│       └── task.ts            # 업무 타입
├── 📈 reports/                 # 보고서 모듈
│   ├── config.ts
│   ├── index.tsx
│   ├── components/
│   │   ├── ReportsList.tsx    # 보고서 목록
│   │   ├── ReportViewer.tsx   # 보고서 뷰어
│   │   └── ReportGenerator.tsx # 보고서 생성기
│   ├── hooks/
│   │   └── useReports.ts      # 보고서 훅
│   ├── services/
│   │   └── reportService.ts   # 보고서 서비스
│   └── types/
│       └── report.ts          # 보고서 타입
├── 📊 analytics/               # 분석 모듈
│   ├── config.ts
│   ├── index.tsx
│   ├── components/
│   │   ├── AnalyticsCharts.tsx # 분석 차트
│   │   ├── MetricsCards.tsx   # 메트릭 카드
│   │   └── InsightPanel.tsx   # 인사이트 패널
│   ├── hooks/
│   │   └── useAnalytics.ts    # 분석 훅
│   ├── services/
│   │   └── analyticsService.ts # 분석 서비스
│   └── types/
│       └── analytics.ts       # 분석 타입
├── 🔐 auth/                    # 인증 모듈
│   ├── config.ts
│   ├── index.tsx
│   ├── components/
│   │   ├── LoginForm.tsx      # 로그인 폼
│   │   ├── UserProfile.tsx    # 사용자 프로필
│   │   └── PermissionGate.tsx # 권한 게이트
│   ├── hooks/
│   │   └── useAuth.ts         # 인증 훅
│   ├── services/
│   │   └── authService.ts     # 인증 서비스
│   └── types/
│       └── auth.ts            # 인증 타입
├── 📅 calendar/                # 캘린더 모듈
│   ├── config.ts
│   ├── index.tsx
│   ├── components/
│   │   ├── CalendarView.tsx   # 캘린더 뷰
│   │   ├── EventModal.tsx     # 이벤트 모달
│   │   └── DatePicker.tsx     # 날짜 선택기
│   ├── hooks/
│   │   └── useCalendar.ts     # 캘린더 훅
│   ├── services/
│   │   └── calendarService.ts # 캘린더 서비스
│   └── types/
│       └── calendar.ts        # 캘린더 타입
├── 💬 chat/                    # 채팅 모듈
│   ├── config.ts
│   ├── index.tsx
│   ├── components/
│   │   ├── ChatWindow.tsx     # 채팅 창
│   │   ├── MessageList.tsx    # 메시지 목록
│   │   └── MessageInput.tsx   # 메시지 입력
│   ├── hooks/
│   │   └── useChat.ts         # 채팅 훅
│   ├── services/
│   │   └── chatService.ts     # 채팅 서비스
│   └── types/
│       └── chat.ts            # 채팅 타입
└── 🔧 utilities/               # 유틸리티 모듈
    ├── config.ts
    ├── index.tsx
    ├── components/
    │   ├── FileUpload.tsx     # 파일 업로드
    │   ├── DataExport.tsx     # 데이터 내보내기
    │   └── Settings.tsx       # 설정
    ├── hooks/
    │   └── useUtilities.ts    # 유틸리티 훅
    ├── services/
    │   └── utilityService.ts  # 유틸리티 서비스
    └── types/
        └── utility.ts         # 유틸리티 타입
```

---

## 🔧 핵심 인프라 구현

### 1. 모듈 인터페이스 정의

```typescript
// core/types/module.ts
export interface ModuleConfig {
  id: string;                    // 모듈 고유 ID
  name: string;                  // 모듈 이름
  version: string;               // 모듈 버전
  description?: string;          // 모듈 설명
  
  // API 설정
  endpoints: {
    primary: string;             // 주 API 엔드포인트
    fallback?: string[];         // 폴백 엔드포인트
  };
  
  // 기능 설정
  features?: {
    realtime?: boolean;          // 실시간 업데이트
    cache?: boolean;             // 캐싱 사용
    offline?: boolean;           // 오프라인 지원
  };
  
  // 권한 설정
  permissions?: {
    required: string[];          // 필수 권한
    optional?: string[];         // 선택 권한
  };
  
  // UI 설정
  ui?: {
    theme?: string;              // 테마
    position?: 'main' | 'sidebar' | 'modal';
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  };
  
  // 의존성
  dependencies?: string[];       // 의존 모듈 목록
}

export interface ModuleProps {
  config?: Partial<ModuleConfig>;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: Error) => void;
  onLoad?: () => void;
}

export interface ModuleInstance {
  config: ModuleConfig;
  component: React.ComponentType<ModuleProps>;
  isLoaded: boolean;
  error?: Error;
}
```

### 2. 모듈 레지스트리

```typescript
// core/registry/ModuleRegistry.ts
class ModuleRegistry {
  private modules = new Map<string, ModuleInstance>();
  private loadingPromises = new Map<string, Promise<ModuleInstance>>();
  
  // 모듈 등록
  register(config: ModuleConfig, component: React.ComponentType<ModuleProps>) {
    const instance: ModuleInstance = {
      config,
      component,
      isLoaded: true
    };
    
    this.modules.set(config.id, instance);
    this.validateDependencies(config);
  }
  
  // 모듈 동적 로딩
  async load(moduleId: string): Promise<ModuleInstance> {
    if (this.modules.has(moduleId)) {
      return this.modules.get(moduleId)!;
    }
    
    if (this.loadingPromises.has(moduleId)) {
      return this.loadingPromises.get(moduleId)!;
    }
    
    const loadPromise = this.loadModule(moduleId);
    this.loadingPromises.set(moduleId, loadPromise);
    
    try {
      const instance = await loadPromise;
      this.modules.set(moduleId, instance);
      return instance;
    } finally {
      this.loadingPromises.delete(moduleId);
    }
  }
  
  // 모듈 동적 로딩 구현
  private async loadModule(moduleId: string): Promise<ModuleInstance> {
    try {
      const module = await import(`../${moduleId}/index.tsx`);
      const config = await import(`../${moduleId}/config.ts`);
      
      return {
        config: config.default,
        component: module.default,
        isLoaded: true
      };
    } catch (error) {
      return {
        config: { id: moduleId, name: moduleId, version: '0.0.0', endpoints: { primary: '' } },
        component: () => null,
        isLoaded: false,
        error: error as Error
      };
    }
  }
  
  // 의존성 검증
  private validateDependencies(config: ModuleConfig) {
    if (!config.dependencies) return;
    
    for (const dep of config.dependencies) {
      if (!this.modules.has(dep)) {
        console.warn(`⚠️ 모듈 ${config.id}의 의존성 ${dep}이 로드되지 않았습니다.`);
      }
    }
  }
}

export const moduleRegistry = new ModuleRegistry();
```

### 3. 모듈 로더 컴포넌트

```typescript
// core/registry/ModuleLoader.tsx
import React, { Suspense, lazy } from 'react';
import { ModuleProps } from '../types/module';
import { moduleRegistry } from './ModuleRegistry';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ModuleLoaderProps extends ModuleProps {
  moduleId: string;
  fallback?: React.ComponentType;
}

export const ModuleLoader: React.FC<ModuleLoaderProps> = ({
  moduleId,
  fallback: Fallback,
  ...props
}) => {
  const LazyModule = lazy(async () => {
    const instance = await moduleRegistry.load(moduleId);
    return { default: instance.component };
  });
  
  return (
    <ErrorBoundary moduleName={moduleId}>
      <Suspense fallback={Fallback ? <Fallback /> : <LoadingSpinner />}>
        <LazyModule {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};
```

### 4. 독립 API 클라이언트

```typescript
// core/api/client.ts
export class ModuleAPIClient {
  private config: ModuleConfig;
  private cache = new Map<string, any>();
  
  constructor(config: ModuleConfig) {
    this.config = config;
  }
  
  async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
    
    // 캐시 확인
    if (this.config.features?.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const urls = [
      this.config.endpoints.primary,
      ...(this.config.endpoints.fallback || [])
    ];
    
    let lastError: Error | null = null;
    
    for (const baseUrl of urls) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 캐시 저장
        if (this.config.features?.cache) {
          this.cache.set(cacheKey, data);
        }
        
        return data;
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }
    
    throw lastError || new Error('All endpoints failed');
  }
  
  // HTTP 메서드 래퍼
  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
```

---

## 📊 모듈별 구현 예시

### 1. 대시보드 모듈

```typescript
// dashboard/config.ts
import { ModuleConfig } from '../core/types/module';

export const dashboardConfig: ModuleConfig = {
  id: 'dashboard',
  name: '대시보드',
  version: '1.0.0',
  description: '업무 현황 대시보드',
  
  endpoints: {
    primary: '/api/dashboard',
    fallback: ['/api/v1/dashboard', '/api/fallback/dashboard']
  },
  
  features: {
    realtime: true,
    cache: true,
    offline: false
  },
  
  permissions: {
    required: ['dashboard.view'],
    optional: ['dashboard.export']
  },
  
  ui: {
    theme: 'default',
    position: 'main',
    size: 'full'
  },
  
  dependencies: ['auth']
};
```

```typescript
// dashboard/index.tsx
import React from 'react';
import { ModuleProps } from '../core/types/module';
import { dashboardConfig } from './config';
import { useDashboard } from './hooks/useDashboard';
import { StatusCards } from './components/StatusCards';
import { ChartSection } from './components/ChartSection';
import { QuickActions } from './components/QuickActions';

const Dashboard: React.FC<ModuleProps> = ({ 
  config = {}, 
  className = '',
  style = {},
  onError,
  onLoad 
}) => {
  const mergedConfig = { ...dashboardConfig, ...config };
  const { data, loading, error } = useDashboard(mergedConfig);
  
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);
  
  React.useEffect(() => {
    if (!loading && onLoad) {
      onLoad();
    }
  }, [loading, onLoad]);
  
  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>오류: {error.message}</div>;
  
  return (
    <div className={`dashboard-module ${className}`} style={style}>
      <StatusCards data={data.stats} />
      <ChartSection data={data.charts} />
      <QuickActions actions={data.actions} />
    </div>
  );
};

export default Dashboard;
```

```typescript
// dashboard/hooks/useDashboard.ts
import { useState, useEffect } from 'react';
import { ModuleConfig } from '../../core/types/module';
import { ModuleAPIClient } from '../../core/api/client';

export const useDashboard = (config: ModuleConfig) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const client = new ModuleAPIClient(config);
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await client.get('/stats');
        setData(result);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // 실시간 업데이트
    if (config.features?.realtime) {
      const interval = setInterval(fetchData, 30000); // 30초마다
      return () => clearInterval(interval);
    }
  }, [config]);
  
  return { data, loading, error };
};
```

### 2. 업무 관리 모듈

```typescript
// task-management/config.ts
export const taskManagementConfig: ModuleConfig = {
  id: 'task-management',
  name: '업무 관리',
  version: '1.0.0',
  description: '업무 생성, 수정, 관리',
  
  endpoints: {
    primary: '/api/tasks',
    fallback: ['/api/v1/tasks']
  },
  
  features: {
    realtime: true,
    cache: false,
    offline: true
  },
  
  permissions: {
    required: ['task.view'],
    optional: ['task.create', 'task.edit', 'task.delete']
  },
  
  ui: {
    position: 'main',
    size: 'full'
  },
  
  dependencies: ['auth']
};
```

---

## 🚀 사용법 가이드

### 1. 기본 사용법

```typescript
// App.tsx
import React from 'react';
import { ModuleLoader } from './modules/core/registry/ModuleLoader';

function App() {
  return (
    <div className="app">
      {/* 대시보드 모듈 로드 */}
      <ModuleLoader 
        moduleId="dashboard"
        config={{
          endpoints: {
            primary: 'https://api.myproject.com/dashboard'
          }
        }}
      />
      
      {/* 업무 관리 모듈 로드 */}
      <ModuleLoader 
        moduleId="task-management"
        config={{
          endpoints: {
            primary: 'https://api.myproject.com/tasks'
          }
        }}
      />
    </div>
  );
}
```

### 2. 커스텀 설정 사용

```typescript
// 커스텀 설정으로 모듈 사용
<ModuleLoader 
  moduleId="dashboard"
  config={{
    endpoints: {
      primary: 'https://my-api.com/dashboard',
      fallback: ['https://backup-api.com/dashboard']
    },
    features: {
      realtime: true,
      cache: true
    },
    ui: {
      theme: 'dark',
      size: 'lg'
    }
  }}
  onLoad={() => console.log('대시보드 로드 완료')}
  onError={(error) => console.error('대시보드 오류:', error)}
/>
```

### 3. 다른 프로젝트에서 사용

```bash
# 1. 모듈 폴더 복사
cp -r ./modules/dashboard ./new-project/src/modules/

# 2. 핵심 인프라 복사
cp -r ./modules/core ./new-project/src/modules/

# 3. 의존성 설치
npm install
```

```typescript
// new-project/src/App.tsx
import { ModuleLoader } from './modules/core/registry/ModuleLoader';

function App() {
  return (
    <ModuleLoader 
      moduleId="dashboard"
      config={{
        endpoints: {
          primary: 'https://new-project-api.com/dashboard'
        }
      }}
    />
  );
}
```

---

## 🎯 장점

### ✅ 완전한 독립성
- 각 모듈이 독립적으로 동작
- 한 모듈의 오류가 다른 모듈에 영향 없음
- 개별 업데이트 및 버전 관리 가능

### ✅ 즉시 이식 가능
- 모듈 폴더만 복사하면 다른 프로젝트에서 즉시 사용
- API 엔드포인트만 변경하면 동작
- 의존성 최소화

### ✅ 유연한 설정
- 런타임에 설정 변경 가능
- 테마, 권한, 기능 등 커스터마이징
- 폴백 시스템으로 안정성 보장

### ✅ 확장성
- 새 모듈 추가 용이
- 기존 모듈 수정 없이 기능 확장
- 플러그인 아키텍처

---

## 🔧 구현 계획

### 1단계: 핵심 인프라 구축 ✅
- [x] 모듈 타입 정의
- [x] 모듈 레지스트리 구현
- [x] API 클라이언트 구현
- [x] 에러 경계 시스템

### 2단계: 기존 페이지 모듈화
- [ ] 대시보드 모듈 분리
- [ ] 업무 관리 모듈 분리
- [ ] 보고서 모듈 분리
- [ ] 분석 모듈 분리

### 3단계: 추가 기능 모듈
- [ ] 인증 모듈 구현
- [ ] 캘린더 모듈 구현
- [ ] 채팅 모듈 구현
- [ ] 유틸리티 모듈 구현

### 4단계: 패키징 및 배포
- [ ] NPM 패키지 구성
- [ ] 문서화 완료
- [ ] 테스트 케이스 작성
- [ ] 배포 자동화

이제 실제 구현을 시작하시겠습니까? 어떤 모듈부터 시작하시겠습니까? 