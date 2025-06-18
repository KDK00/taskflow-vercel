import { ModuleConfig } from '../core/types/module';

export const taskManagementConfig: ModuleConfig = {
  // 기본 모듈 정보
  name: 'task-management',
  version: '1.0.0',
  description: '업무 관리 및 추진 현황 모니터링 모듈',
  
  // API 엔드포인트
  apiEndpoints: {
    // 기본 CRUD
    getTasks: '/api/tasks',
    createTask: '/api/tasks',
    updateTask: '/api/tasks/:id',
    deleteTask: '/api/tasks/:id',
    bulkDelete: '/api/tasks/bulk-delete',
    
    // 상태 관리
    updateStatus: '/api/tasks/:id/status',
    updatePriority: '/api/tasks/:id/priority',
    updateProgress: '/api/tasks/:id/progress',
    
    // 팀/매니저 기능
    getTeamTasks: '/api/tasks/team',
    getUserTasks: '/api/tasks/user/:userId',
    transferTask: '/api/tasks/:id/transfer',
    
    // 업무 스케줄링
    scheduleTask: '/api/tasks/:id/schedule',
    getScheduledTasks: '/api/tasks/scheduled',
    
    // 일정 연동
    convertToSchedule: '/api/tasks/:id/to-schedule',
    
    // 통계 및 분석
    getTaskStats: '/api/tasks/stats',
    getTaskAnalytics: '/api/tasks/analytics',
    
    // 엑셀/파일 관리
    exportTasks: '/api/tasks/export',
    importTasks: '/api/tasks/import',
    
    // 실시간 업데이트
    websocket: '/api/websocket/tasks'
  },
  
  // 모듈 기능
  features: {
    // 업무 관리 기능
    taskCreation: true,
    taskEditing: true,
    taskDeletion: true,
    bulkOperations: true,
    
    // 상태 관리
    statusManagement: true,
    priorityManagement: true,
    progressTracking: true,
    
    // 필터링 및 정렬
    advancedFiltering: true,
    customSorting: true,
    searchFunctionality: true,
    
    // 뷰 모드
    employeeView: true,
    managerView: true,
    teamView: true,
    
    // 실시간 기능
    realTimeUpdates: true,
    websocketSupport: true,
    
    // 일정 관리
    scheduleIntegration: true,
    calendarSync: true,
    
    // 내보내기/가져오기
    excelExport: true,
    excelImport: true,
    dataBackup: true,
    
    // 협업 기능
    taskTransfer: true,
    followUpTasks: true,
    notifications: true,
    
    // 분석 기능
    taskAnalytics: true,
    performanceMetrics: true,
    reportGeneration: true
  },
  
  // 권한 설정
  permissions: {
    roles: ['employee', 'manager', 'developer'],
    actions: {
      create: ['employee', 'manager', 'developer'],
      read: ['employee', 'manager', 'developer'],
      update: ['employee', 'manager', 'developer'],
      delete: ['manager', 'developer'],
      bulkDelete: ['manager', 'developer'],
      viewTeam: ['manager', 'developer'],
      transfer: ['manager', 'developer'],
      analytics: ['manager', 'developer'],
      export: ['manager', 'developer'],
      import: ['manager', 'developer']
    }
  },
  
  // 캐싱 설정
  caching: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5분
    keys: {
      tasks: 'tasks',
      userTasks: 'user-tasks',
      teamTasks: 'team-tasks',
      stats: 'task-stats',
      analytics: 'task-analytics'
    }
  },
  
  // UI 테마 설정
  theme: {
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    accentColor: '#10b981',
    
    // 상태별 색상
    statusColors: {
      scheduled: '#3b82f6',    // 파란색
      in_progress: '#f59e0b',  // 주황색
      completed: '#10b981',    // 초록색
      cancelled: '#ef4444',    // 빨간색
      postponed: '#6b7280'     // 회색
    },
    
    // 우선순위별 색상
    priorityColors: {
      low: '#6b7280',      // 회색
      medium: '#3b82f6',   // 파란색
      high: '#f59e0b',     // 주황색
      urgent: '#ef4444'    // 빨간색
    }
  },
  
  // UI 구성
  ui: {
    // 테이블 설정
    table: {
      defaultPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
      sortable: true,
      filterable: true,
      selectable: true,
      resizable: true
    },
    
    // 필터 설정
    filters: {
      status: {
        enabled: true,
        options: ['all', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed']
      },
      priority: {
        enabled: true,
        options: ['all', 'low', 'medium', 'high', 'urgent']
      },
      assignee: {
        enabled: true,
        dynamic: true
      },
      category: {
        enabled: true,
        dynamic: true
      },
      dateRange: {
        enabled: true,
        presets: ['today', 'week', 'month', 'quarter']
      }
    },
    
    // 모달 설정
    modals: {
      taskCreate: {
        width: 'lg',
        height: 'auto',
        resizable: false
      },
      taskEdit: {
        width: 'lg', 
        height: 'auto',
        resizable: false
      },
      bulkActions: {
        width: 'md',
        height: 'auto',
        resizable: false
      }
    },
    
    // 레이아웃 설정
    layout: {
      showHeader: true,
      showFilters: true,
      showStats: true,
      showToolbar: true,
      compactMode: false
    }
  },
  
  // 업무관리 전용 설정
  taskManagement: {
    // 상태 설정
    statusConfig: {
      scheduled: { 
        label: "🔵 예정", 
        color: "bg-blue-100 text-blue-800 border-blue-200",
        progress: 0,
        nextStates: ['in_progress', 'cancelled', 'postponed']
      },
      in_progress: { 
        label: "🟡 진행", 
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        progress: 50,
        nextStates: ['completed', 'postponed', 'cancelled']
      },
      completed: { 
        label: "🟢 완료", 
        color: "bg-green-100 text-green-800 border-green-200",
        progress: 100,
        nextStates: ['in_progress'] // 재진행 가능
      },
      cancelled: { 
        label: "🔴 취소", 
        color: "bg-red-100 text-red-800 border-red-200",
        progress: 0,
        nextStates: ['scheduled', 'in_progress']
      },
      postponed: { 
        label: "⏸️ 연기", 
        color: "bg-gray-100 text-gray-800 border-gray-200",
        progress: 0,
        nextStates: ['scheduled', 'in_progress', 'cancelled']
      }
    },
    
    // 우선순위 설정
    priorityConfig: {
      low: { label: "낮음", color: "bg-gray-100 text-gray-600", order: 1 },
      medium: { label: "보통", color: "bg-blue-100 text-blue-600", order: 2 },
      high: { label: "높음", color: "bg-orange-100 text-orange-600", order: 3 },
      urgent: { label: "긴급", color: "bg-red-100 text-red-600", order: 4 }
    },
    
    // 카테고리 설정
    categories: {
      business: "경영지원",
      contract_new: "신규계약",
      contract_manage: "계약관리", 
      contract_terminate: "계약해지",
      development: "개발",
      maintenance: "유지보수",
      support: "고객지원",
      other: "기타"
    },
    
    // 자동화 설정
    automation: {
      // 상태 변경 시 진행률 자동 업데이트
      autoUpdateProgress: true,
      progressMapping: {
        scheduled: 0,
        in_progress: 25,
        completed: 100,
        cancelled: 0,
        postponed: 0
      },
      
      // 마감일 알림
      deadlineNotifications: {
        enabled: true,
        beforeDays: [7, 3, 1], // 마감 7일, 3일, 1일 전 알림
        urgentHours: 2 // 마감 2시간 전 긴급 알림
      },
      
      // 후속 업무 자동 생성
      followUpTasks: {
        enabled: true,
        autoCreate: true,
        templates: {
          contract_new: "[확인요청] {originalTitle}",
          contract_terminate: "[확인요청] {originalTitle}"
        }
      }
    },
    
    // 일괄 작업 설정
    bulkOperations: {
      enabled: true,
      maxItems: 100,
      confirmationRequired: true,
      operations: [
        'delete',
        'updateStatus',
        'updatePriority',
        'transfer',
        'export',
        'archive'
      ]
    },
    
    // 실시간 업데이트 설정
    realTime: {
      enabled: true,
      refreshInterval: 30000, // 30초마다 자동 새로고침
      websocketReconnect: true,
      showLiveUpdates: true
    }
  }
};

export default taskManagementConfig; 