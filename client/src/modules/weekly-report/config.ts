// 📊 Weekly Report Module Config - 완전 독립적 설정

import { ModuleConfig } from '../core/types';

export const WEEKLY_REPORT_CONFIG: ModuleConfig = {
  endpoints: {
    primary: '/api/reports/weekly',
    fallback: [
      '/api/analytics/weekly',
      '/api/tasks/weekly-summary'
    ]
  },
  updateInterval: 0, // 자동 새로고침 비활성화
  enableRealtime: true,
  retryAttempts: 3,
  timeout: 15000,
  styling: {
    theme: 'auto',
    colorScheme: 'indigo',
    size: 'lg',
    className: 'weekly-report-module'
  },
  permissions: ['read:reports', 'read:analytics']
};

// 📈 차트 타입
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area';

// 📅 기간 타입
export type PeriodType = 'this_week' | 'last_week' | 'last_4_weeks' | 'this_month' | 'custom';

// 📊 리포트 메트릭
export interface ReportMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  unit: string;
  format: 'number' | 'percentage' | 'currency' | 'time';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  color?: string;
  icon?: string;
}

// 🎨 차트 색상 팔레트
export const CHART_COLORS = {
  primary: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#84cc16'],
  secondary: ['#e0e7ff', '#ede9fe', '#fce7f3', '#fef3c7', '#d1fae5', '#cffafe', '#ecfccb'],
  status: {
    completed: '#10b981',
    in_progress: '#f59e0b', 
    scheduled: '#6366f1',
    cancelled: '#ef4444',
    postponed: '#6b7280'
  }
};

// 📊 기본 메트릭 설정
export const DEFAULT_METRICS: ReportMetric[] = [
  {
    id: 'total_tasks',
    name: '총 업무',
    value: 0,
    unit: '개',
    format: 'number',
    color: CHART_COLORS.primary[0],
    icon: '📋'
  },
  {
    id: 'completed_tasks',
    name: '완료 업무',
    value: 0,
    unit: '개',
    format: 'number',
    color: CHART_COLORS.status.completed,
    icon: '✅'
  },
  {
    id: 'completion_rate',
    name: '완료율',
    value: 0,
    unit: '%',
    format: 'percentage',
    color: CHART_COLORS.primary[1],
    icon: '📈'
  },
  {
    id: 'avg_completion_time',
    name: '평균 완료시간',
    value: 0,
    unit: '시간',
    format: 'time',
    color: CHART_COLORS.primary[2],
    icon: '⏱️'
  }
];

// 🔧 환경별 설정
export function getWeeklyReportConfigForEnvironment(env: 'development' | 'production' | 'test'): ModuleConfig {
  const baseConfig = { ...WEEKLY_REPORT_CONFIG };

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
          primary: '/api/mock/reports',
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
export function getWeeklyReportConfigForRole(role: 'employee' | 'manager' | 'admin'): Partial<ModuleConfig> {
  switch (role) {
    case 'manager':
    case 'admin':
      return {
        endpoints: {
          primary: '/api/reports/team-weekly',
          fallback: ['/api/analytics/team', '/api/reports/all']
        },
        permissions: ['read:all-reports', 'read:team-analytics', 'export:reports']
      };

    case 'employee':
    default:
      return {
        endpoints: {
          primary: '/api/reports/weekly',
          fallback: ['/api/analytics/personal', '/api/my-reports']
        },
        permissions: ['read:reports', 'read:own-analytics']
      };
  }
}

// 🎨 표시 옵션 설정
export interface ReportDisplayConfig {
  showMetrics?: boolean;
  showCharts?: boolean;
  showTrends?: boolean;
  showComparison?: boolean;
  showExport?: boolean;
  showFilters?: boolean;
  defaultPeriod?: PeriodType;
  defaultChartType?: ChartType;
  metricsLayout?: 'grid' | 'list';
  chartsLayout?: 'stacked' | 'side-by-side';
  compact?: boolean;
  showWeekends?: boolean;
  groupByCategory?: boolean;
}

export const DEFAULT_REPORT_DISPLAY_CONFIG: ReportDisplayConfig = {
  showMetrics: true,
  showCharts: true,
  showTrends: true,
  showComparison: true,
  showExport: false,
  showFilters: true,
  defaultPeriod: 'this_week',
  defaultChartType: 'bar',
  metricsLayout: 'grid',
  chartsLayout: 'stacked',
  compact: false,
  showWeekends: true,
  groupByCategory: true
};

// 📊 차트 설정
export interface ChartConfig {
  type: ChartType;
  title: string;
  dataKey: string;
  color?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  height?: number;
}

export const DEFAULT_CHARTS: ChartConfig[] = [
  {
    type: 'bar',
    title: '일별 업무 완료 현황',
    dataKey: 'daily_completion',
    color: CHART_COLORS.primary[0],
    showLegend: true,
    showTooltip: true,
    height: 300
  },
  {
    type: 'pie',
    title: '상태별 업무 분포',
    dataKey: 'status_distribution',
    showLegend: true,
    showTooltip: true,
    height: 300
  },
  {
    type: 'line',
    title: '주간 업무 트렌드',
    dataKey: 'weekly_trend',
    color: CHART_COLORS.primary[1],
    showLegend: false,
    showTooltip: true,
    height: 250
  }
];

// 🔧 커스텀 설정 빌더
export function buildWeeklyReportConfig(options: {
  role?: 'employee' | 'manager' | 'admin';
  environment?: 'development' | 'production' | 'test';
  endpoints?: { primary: string; fallback?: string[] };
  display?: Partial<ReportDisplayConfig>;
  metrics?: ReportMetric[];
  charts?: ChartConfig[];
  period?: PeriodType;
}): ModuleConfig {
  const {
    role = 'employee',
    environment = 'production',
    endpoints,
    display = {},
    metrics = DEFAULT_METRICS,
    charts = DEFAULT_CHARTS,
    period = 'this_week'
  } = options;

  let config = getWeeklyReportConfigForEnvironment(environment);
  const roleConfig = getWeeklyReportConfigForRole(role);
  
  // 역할별 설정 병합
  config = { ...config, ...roleConfig };
  
  // 커스텀 엔드포인트 적용
  if (endpoints) {
    config.endpoints = endpoints;
  }

  // 메타데이터로 표시/메트릭/차트 설정 저장
  (config as any).display = { ...DEFAULT_REPORT_DISPLAY_CONFIG, ...display, defaultPeriod: period };
  (config as any).metrics = metrics;
  (config as any).charts = charts;

  return config;
}

// 📊 리포트 유틸리티 함수들
export const ReportUtils = {
  // 📈 트렌드 계산
  calculateTrend: (current: number, previous: number): { trend: 'up' | 'down' | 'stable'; value: number } => {
    if (previous === 0) return { trend: 'stable', value: 0 };
    
    const change = ((current - previous) / previous) * 100;
    
    if (Math.abs(change) < 1) return { trend: 'stable', value: change };
    return { trend: change > 0 ? 'up' : 'down', value: Math.abs(change) };
  },

  // 📅 날짜 범위 계산
  getDateRange: (period: PeriodType, customStart?: Date, customEnd?: Date): { start: Date; end: Date } => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    switch (period) {
      case 'this_week':
        return {
          start: startOfWeek,
          end: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000)
        };

      case 'last_week':
        return {
          start: new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(startOfWeek.getTime() - 1)
        };

      case 'last_4_weeks':
        return {
          start: new Date(startOfWeek.getTime() - 28 * 24 * 60 * 60 * 1000),
          end: new Date(startOfWeek.getTime() - 1)
        };

      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: startOfMonth, end: endOfMonth };

      case 'custom':
        return {
          start: customStart || startOfWeek,
          end: customEnd || new Date()
        };

      default:
        return { start: startOfWeek, end: new Date() };
    }
  },

  // 🎨 값 포맷팅
  formatValue: (value: number, format: ReportMetric['format'], unit?: string): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;

      case 'currency':
        return new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency: 'KRW'
        }).format(value);

      case 'time':
        if (value < 1) return `${Math.round(value * 60)}분`;
        return `${value.toFixed(1)}시간`;

      case 'number':
      default:
        const formatted = new Intl.NumberFormat('ko-KR').format(value);
        return unit ? `${formatted}${unit}` : formatted;
    }
  },

  // 📊 차트 데이터 생성
  generateChartData: (tasks: any[], type: ChartType): any => {
    switch (type) {
      case 'bar':
        // 일별 완료 현황
        const dailyData = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          const dayTasks = tasks.filter(task => {
            const taskDate = new Date(task.createdAt || task.dueDate);
            return taskDate.toDateString() === date.toDateString();
          });
          
          return {
            name: date.toLocaleDateString('ko-KR', { weekday: 'short' }),
            completed: dayTasks.filter(t => t.status === 'completed').length,
            total: dayTasks.length
          };
        });
        return dailyData;

      case 'pie':
        // 상태별 분포
        const statusCounts = tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {});
        
        return Object.entries(statusCounts).map(([status, count]) => ({
          name: status,
          value: count as number,
          color: CHART_COLORS.status[status as keyof typeof CHART_COLORS.status] || CHART_COLORS.primary[0]
        }));

      case 'line':
        // 주간 트렌드 (지난 4주)
        const weeklyData = Array.from({ length: 4 }, (_, i) => {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + (3 - i) * 7));
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          const weekTasks = tasks.filter(task => {
            const taskDate = new Date(task.createdAt || task.dueDate);
            return taskDate >= weekStart && taskDate <= weekEnd;
          });
          
          return {
            name: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
            value: weekTasks.filter(t => t.status === 'completed').length
          };
        });
        return weeklyData;

      default:
        return [];
    }
  },

  // 📈 완료율 계산
  calculateCompletionRate: (tasks: any[]): number => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.status === 'completed').length;
    return (completed / tasks.length) * 100;
  },

  // ⏱️ 평균 완료시간 계산
  calculateAverageCompletionTime: (tasks: any[]): number => {
    const completedTasks = tasks.filter(task => 
      task.status === 'completed' && task.createdAt && task.updatedAt
    );
    
    if (completedTasks.length === 0) return 0;
    
    const totalHours = completedTasks.reduce((sum, task) => {
      const created = new Date(task.createdAt);
      const completed = new Date(task.updatedAt);
      return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
    }, 0);
    
    return totalHours / completedTasks.length;
  }
};

// 📋 필터 옵션
export const REPORT_FILTER_OPTIONS = {
  period: [
    { value: 'this_week', label: '이번 주' },
    { value: 'last_week', label: '지난 주' },
    { value: 'last_4_weeks', label: '지난 4주' },
    { value: 'this_month', label: '이번 달' },
    { value: 'custom', label: '사용자 정의' }
  ],
  chartType: [
    { value: 'bar', label: '막대 차트' },
    { value: 'line', label: '선 차트' },
    { value: 'pie', label: '원형 차트' },
    { value: 'area', label: '영역 차트' }
  ]
}; 