export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  pendingTasks: number;
  reviewTasks: number;
}

export interface TaskFilters {
  status?: string;
  category?: string;
  assignedTo?: number;
}

export interface WebSocketMessage {
  type: 'task_created' | 'task_updated' | 'comment_added' | 'notification';
  data: any;
}

export type StatusType = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed' | 'overdue';
export type PriorityType = 'low' | 'medium' | 'high' | 'urgent';
export type UserRole = 'employee' | 'manager';

export interface TaskFormData {
  title: string;
  description: string;
  category: string;
  priority: PriorityType;
  assignedTo: number;
  startDate: string;
  dueDate: string;
  targetPlace?: string;
  contractType?: string;
}
