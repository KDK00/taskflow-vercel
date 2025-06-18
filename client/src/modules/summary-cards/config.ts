// ⚙️ Summary Cards Module Config - 완전 독립적 설정

import { ModuleConfig } from '../core/types';

export const SUMMARY_CARDS_CONFIG: ModuleConfig = {
  endpoints: {
    primary: '/api/users/me/stats',
    fallback: [
      '/api/stats/user',
      '/api/dashboard/stats'
    ]
  },
  updateInterval: 0, // 자동 새로고침 비활성화
  enableRealtime: true,
  retryAttempts: 3,
  timeout: 10000,
  styling: {
    theme: 'auto',
    colorScheme: 'purple',
    size: 'md',
    className: 'summary-cards-module'
  },
  permissions: ['read:stats']
};

// 🎨 카드 설정
export interface CardConfig {
  title: string;
  icon: string;
  color: string;
  bgColor: string;
  filter: string;
  showProgress?: boolean;
  showChange?: boolean;
  showAlert?: boolean;
}

export const CARD_CONFIGS: CardConfig[] = [
  {
    title: '전체 업무',
    icon: 'BarChart3',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    filter: 'all',
    showChange: true
  },
  {
    title: '진행 중',
    icon: 'Clock',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    filter: 'progress',
    showProgress: true
  },
  {
    title: '완료',
    icon: 'CheckCircle',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    filter: 'completed',
    showChange: true
  },
  {
    title: '지연',
    icon: 'AlertTriangle',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    filter: 'overdue',
    showAlert: true
  }
];

// 🔧 환경별 설정
export function getConfigForEnvironment(env: 'development' | 'production' | 'test'): ModuleConfig {
  const baseConfig = { ...SUMMARY_CARDS_CONFIG };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        updateInterval: 5000, // 개발 환경에서는 5초마다
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
        retryAttempts: 5
      };

    case 'test':
      return {
        ...baseConfig,
        endpoints: {
          primary: '/api/mock/stats',
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
export function getConfigForRole(role: 'employee' | 'manager' | 'admin'): Partial<ModuleConfig> {
  switch (role) {
    case 'manager':
    case 'admin':
      return {
        endpoints: {
          primary: '/api/team/stats',
          fallback: ['/api/stats/team', '/api/dashboard/team-stats']
        },
        permissions: ['read:team-stats', 'read:stats']
      };

    case 'employee':
    default:
      return {
        endpoints: {
          primary: '/api/users/me/stats',
          fallback: ['/api/stats/user', '/api/dashboard/user-stats']
        },
        permissions: ['read:stats']
      };
  }
}

// 🎨 테마별 설정
export function getThemeConfig(theme: 'light' | 'dark' | 'corporate'): Partial<ModuleConfig> {
  const themes = {
    light: {
      styling: {
        colorScheme: 'blue' as const,
        customStyles: {
          backgroundColor: '#ffffff',
          borderColor: '#e5e7eb',
          textColor: '#374151'
        }
      }
    },
    dark: {
      styling: {
        colorScheme: 'purple' as const,
        customStyles: {
          backgroundColor: '#1f2937',
          borderColor: '#374151',
          textColor: '#f9fafb'
        }
      }
    },
    corporate: {
      styling: {
        colorScheme: 'green' as const,
        customStyles: {
          backgroundColor: '#f8fafc',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        }
      }
    }
  };

  return themes[theme] || themes.light;
}

// 🎯 기본 설정
export const defaultConfig: ModuleConfig = {
  // 📊 데이터 설정
  apiEndpoint: '/api/dashboard/stats',
  refreshOnMount: true,
  updateInterval: 0, // 자동 새로고침 비활성화
  
  // ... existing code ...
}; 