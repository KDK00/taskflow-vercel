// 📋 Core Module Types - 모든 모듈의 기본 타입 정의

import { ReactNode, ComponentType } from 'react';

// 🎯 기본 모듈 인터페이스
export interface Module {
  name: string;
  version: string;
  config: ModuleConfig;
  component: ComponentType<ModuleProps>;
  dependencies?: string[];
  init?(context: ModuleContext): Promise<void>;
  cleanup?(): void;
}

// ⚙️ 모듈 설정 인터페이스
export interface ModuleConfig {
  endpoints: {
    primary: string;
    fallback?: string[];
  };
  updateInterval?: number;
  enableRealtime?: boolean;
  styling?: ModuleStyling;
  permissions?: string[];
  retryAttempts?: number;
  timeout?: number;
}

// 🎨 스타일링 설정
export interface ModuleStyling {
  theme?: 'light' | 'dark' | 'auto';
  colorScheme?: 'blue' | 'green' | 'purple' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  customStyles?: Record<string, string>;
}

// 🔧 모듈 Props
export interface ModuleProps {
  config: ModuleConfig;
  context: ModuleContext;
  onError?: (error: ModuleError) => void;
  onUpdate?: (data: any) => void;
  onLoading?: (loading: boolean) => void;
  className?: string;
  children?: ReactNode;
}

// 🌐 모듈 컨텍스트
export interface ModuleContext {
  user?: User;
  permissions?: string[];
  environment?: 'development' | 'production' | 'test';
  apiClient?: any;
  eventBus?: EventBus;
}

// 👤 사용자 정보
export interface User {
  id: string | number;
  name: string;
  email?: string;
  role?: 'employee' | 'manager' | 'admin';
  department?: string;
  permissions?: string[];
}

// ❌ 모듈 에러
export interface ModuleError {
  code: string;
  message: string;
  module: string;
  timestamp: Date;
  details?: any;
  recoverable?: boolean;
}

// 📊 API 응답 구조
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  timestamp?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// 🔄 로딩 상태
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 📡 이벤트 버스
export interface EventBus {
  emit(event: string, data?: any): void;
  on(event: string, callback: (data: any) => void): () => void;
  off(event: string, callback: (data: any) => void): void;
}

// 🎯 모듈 레지스트리
export interface ModuleRegistry {
  register(module: Module): void;
  unregister(name: string): void;
  get(name: string): Module | undefined;
  getAll(): Module[];
  isRegistered(name: string): boolean;
}

// 📋 공통 데이터 타입들
export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  pendingTasks: number;
  reviewTasks: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed' | 'overdue';
  assignedTo: number;
  startDate: string;
  dueDate: string;
  targetPlace?: string;
  contractType?: string;
  progress?: number;
  confirmed?: boolean;
}

export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  userId?: number;
}

// 🔧 유틸리티 타입들
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// 📦 모듈 매니페스트
export interface ModuleManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  repository?: string;
  dependencies: string[];
  peerDependencies: string[];
  exports: string[];
}

// 🎛️ 글로벌 설정
export interface GlobalConfig {
  modules: Record<string, ModuleConfig>;
  api: {
    baseURL: string;
    timeout: number;
    retries: number;
  };
  auth: {
    enabled: boolean;
    tokenKey: string;
  };
  theme: ModuleStyling;
  debug: boolean;
} 