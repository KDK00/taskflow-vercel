// 업무 상태 설정
export const statusConfig = {
  pending: { 
    label: '대기', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⏳'
  },
  'in-progress': { 
    label: '진행중', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '🔄'
  },
  review: { 
    label: '검토중', 
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '👀'
  },
  completed: { 
    label: '완료', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '✅'
  },
  cancelled: { 
    label: '취소', 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: '❌'
  }
} as const;

// 우선순위 설정
export const priorityConfig = {
  low: { 
    label: '낮음', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '🟢'
  },
  medium: { 
    label: '보통', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '🟡'
  },
  high: { 
    label: '높음', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '🟠'
  },
  urgent: { 
    label: '긴급', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '🔴'
  }
} as const;

// 타입 정의
export type TaskStatus = keyof typeof statusConfig;
export type TaskPriority = keyof typeof priorityConfig;

// 헬퍼 함수들
export const getStatusConfig = (status: TaskStatus) => statusConfig[status] || statusConfig.pending;
export const getPriorityConfig = (priority: TaskPriority) => priorityConfig[priority] || priorityConfig.medium;

// 상태 배열 (선택 옵션용)
export const statusOptions = Object.entries(statusConfig).map(([key, config]) => ({
  value: key as TaskStatus,
  label: config.label,
  icon: config.icon
}));

// 우선순위 배열 (선택 옵션용)
export const priorityOptions = Object.entries(priorityConfig).map(([key, config]) => ({
  value: key as TaskPriority,
  label: config.label,
  icon: config.icon
})); 