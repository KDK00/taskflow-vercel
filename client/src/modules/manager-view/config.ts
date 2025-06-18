// 👨‍💼 Manager View Module Config - 완전 독립적 설정

import { ModuleConfig } from '../core/types';

export const MANAGER_VIEW_CONFIG: ModuleConfig = {
  endpoints: {
    primary: '/api/manager/dashboard',
    fallback: [
      '/api/team/overview',
      '/api/admin/stats'
    ]
  },
  updateInterval: 0, // 자동 새로고침 비활성화
  enableRealtime: true,
  retryAttempts: 3,
  timeout: 15000,
  styling: {
    theme: 'auto',
    colorScheme: 'slate',
    size: 'xl',
    className: 'manager-view-module'
  },
  permissions: ['read:team-data', 'read:analytics', 'manage:team']
};

// 📊 대시보드 위젯 타입
export type WidgetType = 'metric' | 'chart' | 'table' | 'progress' | 'activity';

// 👥 팀원 상태
export type TeamMemberStatus = 'active' | 'away' | 'busy' | 'offline';

// 📈 성과 메트릭
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  target?: number;
  unit: string;
  format: 'number' | 'percentage' | 'currency' | 'time';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  priority: 'high' | 'medium' | 'low';
  color?: string;
  icon?: string;
}

// 👤 팀원 정보
export interface TeamMember {
  id: number;
  name: string;
  role: string;
  department?: string;
  status: TeamMemberStatus;
  avatar?: string;
  email?: string;
  currentTasks: number;
  completedTasks: number;
  completionRate: number;
  lastActivity?: string;
  productivity?: number;
}

// 🎨 상태별 색상 설정
export const STATUS_COLORS = {
  active: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
};

// 📊 기본 성과 메트릭
export const DEFAULT_PERFORMANCE_METRICS: PerformanceMetric[] = [
  {
    id: 'team_productivity',
    name: '팀 생산성',
    value: 0,
    target: 85,
    unit: '%',
    format: 'percentage',
    priority: 'high',
    color: '#10b981',
    icon: '🎯'
  },
  {
    id: 'active_members',
    name: '활성 팀원',
    value: 0,
    unit: '명',
    format: 'number',
    priority: 'medium',
    color: '#6366f1',
    icon: '👥'
  },
  {
    id: 'completion_rate',
    name: '업무 완료율',
    value: 0,
    target: 90,
    unit: '%',
    format: 'percentage',
    priority: 'high',
    color: '#f59e0b',
    icon: '✅'
  },
  {
    id: 'avg_response_time',
    name: '평균 응답시간',
    value: 0,
    target: 2,
    unit: '시간',
    format: 'time',
    priority: 'medium',
    color: '#8b5cf6',
    icon: '⏱️'
  }
];

// 🔧 환경별 설정
export function getManagerViewConfigForEnvironment(env: 'development' | 'production' | 'test'): ModuleConfig {
  const baseConfig = { ...MANAGER_VIEW_CONFIG };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        updateInterval: 0, // 자동 새로고침 비활성화
        retryAttempts: 1,
        styling: {
          ...baseConfig.styling,
          className: `${baseConfig.styling?.className} dev-mode`
        }
      };

    case 'production':
      return {
        ...baseConfig,
        updateInterval: 0, // 자동 새로고침 비활성화
        retryAttempts: 5,
        timeout: 20000
      };

    case 'test':
      return {
        ...baseConfig,
        endpoints: {
          primary: '/api/mock/manager',
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
export function getManagerViewConfigForRole(role: 'manager' | 'admin' | 'director'): Partial<ModuleConfig> {
  switch (role) {
    case 'director':
    case 'admin':
      return {
        endpoints: {
          primary: '/api/director/dashboard',
          fallback: ['/api/admin/overview', '/api/company/stats']
        },
        permissions: ['read:all-data', 'read:company-analytics', 'manage:all-teams', 'export:all-reports']
      };

    case 'manager':
    default:
      return {
        endpoints: {
          primary: '/api/manager/dashboard',
          fallback: ['/api/team/overview', '/api/department/stats']
        },
        permissions: ['read:team-data', 'read:team-analytics', 'manage:team', 'export:team-reports']
      };
  }
}

// 🎨 표시 옵션 설정
export interface ManagerDisplayConfig {
  showTeamOverview?: boolean;
  showPerformanceMetrics?: boolean;
  showActivityFeed?: boolean;
  showTaskDistribution?: boolean;
  showProductivityChart?: boolean;
  showTeamCalendar?: boolean;
  layout?: 'grid' | 'list' | 'compact';
  widgetSizes?: 'small' | 'medium' | 'large';
  autoRefresh?: boolean;
  showNotifications?: boolean;
  enableExport?: boolean;
  compactMode?: boolean;
}

export const DEFAULT_MANAGER_DISPLAY_CONFIG: ManagerDisplayConfig = {
  showTeamOverview: true,
  showPerformanceMetrics: true,
  showActivityFeed: true,
  showTaskDistribution: true,
  showProductivityChart: true,
  showTeamCalendar: false,
  layout: 'grid',
  widgetSizes: 'medium',
  autoRefresh: true,
  showNotifications: true,
  enableExport: true,
  compactMode: false
};

// 📊 위젯 설정
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  position: { x: number; y: number };
  enabled: boolean;
  refreshInterval?: number;
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'team_metrics',
    type: 'metric',
    title: '팀 성과 지표',
    size: 'lg',
    position: { x: 0, y: 0 },
    enabled: true
  },
  {
    id: 'task_distribution',
    type: 'chart',
    title: '업무 분배 현황',
    size: 'md',
    position: { x: 1, y: 0 },
    enabled: true
  },
  {
    id: 'team_members',
    type: 'table',
    title: '팀원 현황',
    size: 'lg',
    position: { x: 0, y: 1 },
    enabled: true
  },
  {
    id: 'productivity_trend',
    type: 'chart',
    title: '생산성 트렌드',
    size: 'md',
    position: { x: 1, y: 1 },
    enabled: true
  },
  {
    id: 'recent_activities',
    type: 'activity',
    title: '최근 활동',
    size: 'md',
    position: { x: 2, y: 0 },
    enabled: true
  }
];

// 🔧 커스텀 설정 빌더
export function buildManagerViewConfig(options: {
  role?: 'manager' | 'admin' | 'director';
  environment?: 'development' | 'production' | 'test';
  endpoints?: { primary: string; fallback?: string[] };
  display?: Partial<ManagerDisplayConfig>;
  metrics?: PerformanceMetric[];
  widgets?: WidgetConfig[];
  teamSize?: number;
}): ModuleConfig {
  const {
    role = 'manager',
    environment = 'production',
    endpoints,
    display = {},
    metrics = DEFAULT_PERFORMANCE_METRICS,
    widgets = DEFAULT_WIDGETS,
    teamSize = 10
  } = options;

  let config = getManagerViewConfigForEnvironment(environment);
  const roleConfig = getManagerViewConfigForRole(role);
  
  // 역할별 설정 병합
  config = { ...config, ...roleConfig };
  
  // 커스텀 엔드포인트 적용
  if (endpoints) {
    config.endpoints = endpoints;
  }

  // 메타데이터로 표시/메트릭/위젯 설정 저장
  (config as any).display = { ...DEFAULT_MANAGER_DISPLAY_CONFIG, ...display };
  (config as any).metrics = metrics;
  (config as any).widgets = widgets;
  (config as any).teamSize = teamSize;

  return config;
}

// 👨‍💼 매니저 유틸리티 함수들
export const ManagerUtils = {
  // 📊 팀 생산성 계산
  calculateTeamProductivity: (members: TeamMember[]): number => {
    if (members.length === 0) return 0;
    
    const totalProductivity = members.reduce((sum, member) => sum + (member.productivity || 0), 0);
    return totalProductivity / members.length;
  },

  // ✅ 전체 완료율 계산
  calculateOverallCompletionRate: (members: TeamMember[]): number => {
    if (members.length === 0) return 0;
    
    const totalTasks = members.reduce((sum, member) => sum + member.currentTasks + member.completedTasks, 0);
    const completedTasks = members.reduce((sum, member) => sum + member.completedTasks, 0);
    
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  },

  // 🎯 목표 달성률 계산
  calculateTargetAchievement: (current: number, target: number): number => {
    if (target === 0) return 100;
    return Math.min((current / target) * 100, 100);
  },

  // 📈 트렌드 분석
  analyzeTrend: (current: number, previous: number): { trend: 'up' | 'down' | 'stable'; percentage: number } => {
    if (previous === 0) return { trend: 'stable', percentage: 0 };
    
    const change = ((current - previous) / previous) * 100;
    
    if (Math.abs(change) < 1) return { trend: 'stable', percentage: 0 };
    return { trend: change > 0 ? 'up' : 'down', percentage: Math.abs(change) };
  },

  // 👥 활성 멤버 수 계산
  getActiveMembersCount: (members: TeamMember[]): number => {
    return members.filter(member => member.status === 'active').length;
  },

  // 🏆 최고 성과자 찾기
  getTopPerformer: (members: TeamMember[]): TeamMember | null => {
    if (members.length === 0) return null;
    
    return members.reduce((top, current) => 
      (current.completionRate > top.completionRate) ? current : top
    );
  },

  // ⚠️ 주의 필요 멤버 찾기
  getMembersNeedingAttention: (members: TeamMember[], threshold = 60): TeamMember[] => {
    return members.filter(member => 
      member.completionRate < threshold || 
      member.currentTasks > 10 ||
      member.status === 'offline'
    );
  },

  // 📊 업무 분배 분석
  analyzeWorkload: (members: TeamMember[]): {
    balanced: TeamMember[];
    overloaded: TeamMember[];
    underutilized: TeamMember[];
  } => {
    const avgTasks = members.reduce((sum, m) => sum + m.currentTasks, 0) / members.length;
    const threshold = avgTasks * 0.3; // 30% 편차 허용
    
    return {
      balanced: members.filter(m => 
        Math.abs(m.currentTasks - avgTasks) <= threshold
      ),
      overloaded: members.filter(m => 
        m.currentTasks > avgTasks + threshold
      ),
      underutilized: members.filter(m => 
        m.currentTasks < avgTasks - threshold
      )
    };
  },

  // 🕐 마지막 활동 시간 포맷팅
  formatLastActivity: (lastActivity?: string): string => {
    if (!lastActivity) return '활동 없음';
    
    const now = new Date();
    const activity = new Date(lastActivity);
    const diffInHours = (now.getTime() - activity.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}시간 전`;
    if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}일 전`;
    
    return activity.toLocaleDateString('ko-KR');
  },

  // 📋 업무 우선순위 매트릭스
  createPriorityMatrix: (members: TeamMember[]): {
    urgent_important: TeamMember[];
    urgent_not_important: TeamMember[];
    not_urgent_important: TeamMember[];
    not_urgent_not_important: TeamMember[];
  } => {
    const avgCompletion = members.reduce((sum, m) => sum + m.completionRate, 0) / members.length;
    const avgTasks = members.reduce((sum, m) => sum + m.currentTasks, 0) / members.length;
    
    return {
      urgent_important: members.filter(m => 
        m.currentTasks > avgTasks && m.completionRate < avgCompletion
      ),
      urgent_not_important: members.filter(m => 
        m.currentTasks > avgTasks && m.completionRate >= avgCompletion
      ),
      not_urgent_important: members.filter(m => 
        m.currentTasks <= avgTasks && m.completionRate < avgCompletion
      ),
      not_urgent_not_important: members.filter(m => 
        m.currentTasks <= avgTasks && m.completionRate >= avgCompletion
      )
    };
  }
};

// 🔔 알림 유형
export const MANAGER_NOTIFICATION_TYPES = {
  task_overdue: { 
    icon: '⚠️', 
    color: 'text-red-600', 
    priority: 'high' 
  },
  team_milestone: { 
    icon: '🎉', 
    color: 'text-green-600', 
    priority: 'medium' 
  },
  member_inactive: { 
    icon: '😴', 
    color: 'text-yellow-600', 
    priority: 'medium' 
  },
  productivity_drop: { 
    icon: '📉', 
    color: 'text-orange-600', 
    priority: 'high' 
  },
  new_assignment: { 
    icon: '📋', 
    color: 'text-blue-600', 
    priority: 'low' 
  }
};

// 📊 리포트 템플릿
export const REPORT_TEMPLATES = {
  daily: {
    name: '일일 리포트',
    metrics: ['active_members', 'completion_rate', 'urgent_tasks'],
    format: 'summary'
  },
  weekly: {
    name: '주간 리포트',
    metrics: ['team_productivity', 'completion_rate', 'avg_response_time'],
    format: 'detailed'
  },
  monthly: {
    name: '월간 리포트',
    metrics: ['team_productivity', 'completion_rate', 'member_growth', 'goal_achievement'],
    format: 'comprehensive'
  }
}; 