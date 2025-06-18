// 모듈 설정 인터페이스
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
    autoRefresh?: number;        // 자동 새로고침 간격 (ms)
  };
  
  // 권한 설정
  permissions?: {
    required: string[];          // 필수 권한
    optional?: string[];         // 선택 권한
  };
  
  // UI 설정
  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    position?: 'main' | 'sidebar' | 'modal' | 'floating';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    className?: string;          // 추가 CSS 클래스
    style?: React.CSSProperties; // 인라인 스타일
  };
  
  // 의존성
  dependencies?: string[];       // 의존 모듈 목록
  
  // 모듈별 커스텀 설정
  customConfig?: Record<string, any>;
}

// 모듈 프로퍼티 인터페이스
export interface ModuleProps {
  config?: Partial<ModuleConfig>;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: Error) => void;
  onLoad?: () => void;
  onUnload?: () => void;
  children?: React.ReactNode;
}

// 모듈 인스턴스 인터페이스
export interface ModuleInstance {
  config: ModuleConfig;
  component: React.ComponentType<ModuleProps>;
  isLoaded: boolean;
  isActive: boolean;
  error?: Error;
  loadedAt?: Date;
  lastActivity?: Date;
}

// 모듈 상태 인터페이스
export interface ModuleState {
  loading: boolean;
  error: Error | null;
  data: any;
  lastUpdated: Date | null;
}

// 모듈 이벤트 인터페이스
export interface ModuleEvent {
  type: 'load' | 'unload' | 'error' | 'update' | 'activate' | 'deactivate';
  moduleId: string;
  timestamp: Date;
  data?: any;
  error?: Error;
}

// 모듈 매니페스트 인터페이스 (package.json 같은 역할)
export interface ModuleManifest extends ModuleConfig {
  author?: string;
  license?: string;
  repository?: string;
  keywords?: string[];
  main: string;                  // 메인 컴포넌트 파일
  exports?: Record<string, string>; // 내보내는 컴포넌트들
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// 에러 타입
export interface ModuleError extends Error {
  moduleId: string;
  code: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export default ModuleConfig; 