import { ModuleConfig } from '../core/types/module';

export const dashboardConfig: ModuleConfig = {
  id: 'dashboard',
  name: '대시보드',
  version: '1.0.0',
  description: '업무 현황 및 통계를 보여주는 대시보드',
  
  // API 엔드포인트 설정
  endpoints: {
    primary: '/api',
    fallback: ['/api/v1', '/api/backup']
  },
  
  // 기능 설정
  features: {
    realtime: true,        // 실시간 업데이트
    cache: true,           // 캐싱 사용
    offline: false,        // 오프라인 지원
    autoRefresh: 30000     // 30초마다 자동 새로고침
  },
  
  // 권한 설정
  permissions: {
    required: ['dashboard.view'],
    optional: ['dashboard.export', 'dashboard.settings']
  },
  
  // UI 설정
  ui: {
    theme: 'light',
    position: 'main',
    size: 'full',
    className: 'dashboard-module',
    style: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }
  },
  
  // 의존성 모듈
  dependencies: ['auth'],
  
  // 대시보드 전용 설정
  customConfig: {
    // 상태 카드 설정
    statusCards: {
      columns: {
        sm: 1,
        md: 2,
        lg: 5
      },
      showPreview: true,
      maxPreviewItems: 3,
      enableDrillDown: true
    },
    
    // 차트 설정
    charts: {
      showLegend: true,
      showTooltips: true,
      animation: true,
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
    },
    
    // 자동 새로고침 설정
    autoRefresh: {
      enabled: true,
      interval: 30000, // 30초
      endpoints: ['/tasks', '/users/me/stats', '/notifications']
    },
    
    // 위젯 설정
    widgets: {
      taskStatusCards: { enabled: true, order: 1 },
      confirmationRequests: { enabled: true, order: 2 },
      quickStats: { enabled: true, order: 3 },
      recentActivity: { enabled: false, order: 4 },
      upcomingDeadlines: { enabled: false, order: 5 }
    },
    
    // 레이아웃 설정
    layout: {
      type: 'responsive',
      gaps: 'md',
      padding: 'lg'
    }
  }
};

export default dashboardConfig; 