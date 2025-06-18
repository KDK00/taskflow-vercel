// ⚙️ Task List Module Config - 완전 독립적 설정

import { ModuleConfig } from '../core/types';

export const TASK_LIST_CONFIG: ModuleConfig = {
  endpoints: {
    primary: '/api/tasks',
    fallback: [
      '/api/tasks/list',
      '/api/user/tasks'
    ]
  },
  updateInterval: 30000, // 30초마다 업데이트
  enableRealtime: true,
  retryAttempts: 3,
  timeout: 10000,
  styling: {
    theme: 'auto',
    colorScheme: 'blue',
    size: 'md',
    className: 'task-list-module'
  },
  permissions: ['read:tasks', 'write:tasks']
};

// 📋 상태 설정
export interface StatusConfig {
  label: string;
  color: string;
  progress: number;
  icon?: string;
}

export const STATUS_CONFIGS: Record<string, StatusConfig> = {
  scheduled: { 
    label: "🔵 예정", 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    progress: 0,
    icon: "Clock"
  },
  in_progress: { 
    label: "🟡 진행", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    progress: 25,
    icon: "Play"
  },
  completed: { 
    label: "🟢 완료", 
    color: "bg-green-100 text-green-800 border-green-200",
    progress: 100,
    icon: "CheckCircle"
  },
  cancelled: { 
    label: "🔴 취소", 
    color: "bg-red-100 text-red-800 border-red-200",
    progress: 0,
    icon: "X"
  },
  postponed: { 
    label: "⏸️ 연기", 
    color: "bg-gray-100 text-gray-800 border-gray-200",
    progress: 0,
    icon: "Pause"
  }
};

// 🎯 우선순위 설정
export interface PriorityConfig {
  label: string;
  color: string;
  icon?: string;
  order: number;
}

export const PRIORITY_CONFIGS: Record<string, PriorityConfig> = {
  low: { 
    label: "낮음", 
    color: "bg-gray-100 text-gray-600",
    icon: "ChevronDown",
    order: 1
  },
  medium: { 
    label: "보통", 
    color: "bg-blue-100 text-blue-600",
    icon: "Minus",
    order: 2
  },
  high: { 
    label: "높음", 
    color: "bg-orange-100 text-orange-600",
    icon: "ChevronUp",
    order: 3
  },
  urgent: { 
    label: "긴급", 
    color: "bg-red-100 text-red-600",
    icon: "AlertTriangle",
    order: 4
  }
};

// 🔧 환경별 설정
export function getTaskListConfigForEnvironment(env: 'development' | 'production' | 'test'): ModuleConfig {
  const baseConfig = { ...TASK_LIST_CONFIG };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        updateInterval: 10000, // 개발 환경에서는 10초마다
        retryAttempts: 1,
        styling: {
          ...baseConfig.styling,
          className: `${baseConfig.styling?.className} dev-mode`
        }
      };

    case 'production':
      return {
        ...baseConfig,
        updateInterval: 60000, // 운영 환경에서는 1분마다
        retryAttempts: 5,
        timeout: 15000
      };

    case 'test':
      return {
        ...baseConfig,
        endpoints: {
          primary: '/api/mock/tasks',
          fallback: []
        },
        enableRealtime: false,
        updateInterval: 0
      };

    default:
      return baseConfig;
  }
}

// 🎯 역할별 설정
export function getTaskListConfigForRole(role: 'employee' | 'manager' | 'admin'): Partial<ModuleConfig> {
  switch (role) {
    case 'manager':
    case 'admin':
      return {
        endpoints: {
          primary: '/api/tasks/team',
          fallback: ['/api/team/tasks', '/api/all-tasks']
        },
        permissions: ['read:all-tasks', 'write:all-tasks', 'delete:tasks', 'manage:tasks']
      };

    case 'employee':
    default:
      return {
        endpoints: {
          primary: '/api/tasks',
          fallback: ['/api/user/tasks', '/api/my-tasks']
        },
        permissions: ['read:tasks', 'write:own-tasks']
      };
  }
}

// 🎨 표시 옵션 설정
export interface DisplayConfig {
  maxItems?: number;
  showFilters?: boolean;
  showBulkActions?: boolean;
  showSearch?: boolean;
  showProgress?: boolean;
  showPriority?: boolean;
  showDueDate?: boolean;
  enableEdit?: boolean;
  enableDelete?: boolean;
  enableStatusChange?: boolean;
  compactMode?: boolean;
}

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  maxItems: 50,
  showFilters: true,
  showBulkActions: true,
  showSearch: true,
  showProgress: true,
  showPriority: true,
  showDueDate: true,
  enableEdit: true,
  enableDelete: true,
  enableStatusChange: true,
  compactMode: false
};

// 🔔 알림 설정
export interface NotificationConfig {
  enableRealtime?: boolean;
  showToasts?: boolean;
  soundEnabled?: boolean;
  notifyOnCreate?: boolean;
  notifyOnUpdate?: boolean;
  notifyOnDelete?: boolean;
  notifyOnStatusChange?: boolean;
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  enableRealtime: true,
  showToasts: true,
  soundEnabled: false,
  notifyOnCreate: true,
  notifyOnUpdate: false,
  notifyOnDelete: true,
  notifyOnStatusChange: true
};

// 📊 필터 옵션
export const FILTER_OPTIONS = {
  status: [
    { value: 'all', label: '전체 상태' },
    { value: 'scheduled', label: '예정' },
    { value: 'in_progress', label: '진행중' },
    { value: 'completed', label: '완료' },
    { value: 'cancelled', label: '취소' },
    { value: 'postponed', label: '연기' }
  ],
  priority: [
    { value: 'all', label: '전체 우선순위' },
    { value: 'urgent', label: '긴급' },
    { value: 'high', label: '높음' },
    { value: 'medium', label: '보통' },
    { value: 'low', label: '낮음' }
  ]
};

// 🔧 커스텀 설정 빌더
export function buildTaskListConfig(options: {
  role?: 'employee' | 'manager' | 'admin';
  environment?: 'development' | 'production' | 'test';
  endpoints?: { primary: string; fallback?: string[] };
  display?: Partial<DisplayConfig>;
  notifications?: Partial<NotificationConfig>;
}): ModuleConfig {
  const {
    role = 'employee',
    environment = 'production',
    endpoints,
    display = {},
    notifications = {}
  } = options;

  let config = getTaskListConfigForEnvironment(environment);
  const roleConfig = getTaskListConfigForRole(role);
  
  // 역할별 설정 병합
  config = { ...config, ...roleConfig };
  
  // 커스텀 엔드포인트 적용
  if (endpoints) {
    config.endpoints = endpoints;
  }

  // 메타데이터로 표시/알림 설정 저장
  (config as any).display = { ...DEFAULT_DISPLAY_CONFIG, ...display };
  (config as any).notifications = { ...DEFAULT_NOTIFICATION_CONFIG, ...notifications };

  return config;
} 

// 🎯 기본 설정
export const defaultConfig: ModuleConfig = {
  // 📊 데이터 설정
  apiEndpoint: '/api/tasks',
  refreshOnMount: true,
  updateInterval: 0, // 자동 새로고침 비활성화

  endpoints: {
    primary: '/api/tasks',
    fallback: [
      '/api/tasks/list',
      '/api/user/tasks'
    ]
  },
  enableRealtime: true,
  retryAttempts: 3,
  timeout: 10000,
  styling: {
    theme: 'auto',
    colorScheme: 'blue',
    size: 'md',
    className: 'task-list-module'
  },
  permissions: ['read:tasks', 'write:tasks']
}; 