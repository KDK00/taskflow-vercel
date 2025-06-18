import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { statusConfig, priorityConfig, type TaskStatus, type TaskPriority } from '@/constants/task-configs';
import { formatDate, formatRelativeTime } from '@/utils/date-formatters';
import { Eye, Edit, Trash2, UserCheck } from 'lucide-react';

// 업무 데이터 타입
export interface TaskTableItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  assigneeName?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  isFollowUpTask?: boolean;
  parentTaskId?: string;
}

// 액션 버튼 타입
export interface TaskAction {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: (task: TaskTableItem) => void;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  show?: (task: TaskTableItem) => boolean;
}

// 컴포넌트 Props
export interface TaskTableProps {
  tasks: TaskTableItem[];
  loading?: boolean;
  showColumns?: {
    status?: boolean;
    priority?: boolean;
    assignee?: boolean;
    dueDate?: boolean;
    createdAt?: boolean;
    actions?: boolean;
  };
  actions?: TaskAction[];
  onTaskClick?: (task: TaskTableItem) => void;
  emptyMessage?: string;
  className?: string;
}

// 기본 설정
const defaultShowColumns = {
  status: true,
  priority: true,
  assignee: true,
  dueDate: true,
  createdAt: false,
  actions: true,
};

const defaultActions: TaskAction[] = [
  {
    icon: Eye,
    label: '보기',
    onClick: () => {},
    variant: 'outline',
  },
  {
    icon: Edit,
    label: '수정',
    onClick: () => {},
    variant: 'default',
  },
  {
    icon: Trash2,
    label: '삭제',
    onClick: () => {},
    variant: 'destructive',
  },
];

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  loading = false,
  showColumns = defaultShowColumns,
  actions = defaultActions,
  onTaskClick,
  emptyMessage = '업무가 없습니다.',
  className = '',
}) => {
  const columns = { ...defaultShowColumns, ...showColumns };

  if (loading) {
    return (
      <div className={`border rounded-lg ${className}`}>
        <div className="p-8 text-center text-gray-500">
          로딩 중...
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={`border rounded-lg ${className}`}>
        <div className="p-8 text-center text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제목</TableHead>
            {columns.status && <TableHead>상태</TableHead>}
            {columns.priority && <TableHead>우선순위</TableHead>}
            {columns.assignee && <TableHead>담당자</TableHead>}
            {columns.dueDate && <TableHead>마감일</TableHead>}
            {columns.createdAt && <TableHead>생성일</TableHead>}
            {columns.actions && actions.length > 0 && <TableHead>작업</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              className={`
                ${onTaskClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                ${task.isFollowUpTask ? 'bg-red-50 border-l-4 border-l-red-500' : ''}
              `}
              onClick={() => onTaskClick?.(task)}
            >
              <TableCell>
                <div className="flex flex-col space-y-1">
                  <span className="font-medium">
                    {task.isFollowUpTask && '🔴 '}
                    {task.title}
                  </span>
                  {task.description && (
                    <span className="text-sm text-gray-500 line-clamp-2">
                      {task.description}
                    </span>
                  )}
                </div>
              </TableCell>
              
              {columns.status && (
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusConfig[task.status]?.color || ''}
                  >
                    {statusConfig[task.status]?.icon} {statusConfig[task.status]?.label}
                  </Badge>
                </TableCell>
              )}
              
              {columns.priority && (
                <TableCell>
                  <Badge
                    variant="outline"
                    className={priorityConfig[task.priority]?.color || ''}
                  >
                    {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
                  </Badge>
                </TableCell>
              )}
              
              {columns.assignee && (
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <UserCheck size={16} className="text-gray-400" />
                    <span>{task.assigneeName || task.assignee || '-'}</span>
                  </div>
                </TableCell>
              )}
              
              {columns.dueDate && (
                <TableCell>
                  {task.dueDate ? (
                    <div className="flex flex-col space-y-1">
                      <span>{formatDate(task.dueDate)}</span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(task.dueDate)}
                      </span>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              )}
              
              {columns.createdAt && (
                <TableCell>
                  {task.createdAt ? formatDate(task.createdAt) : '-'}
                </TableCell>
              )}
              
              {columns.actions && actions.length > 0 && (
                <TableCell>
                  <div className="flex space-x-1">
                    {actions
                      .filter(action => !action.show || action.show(task))
                      .map((action, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant={action.variant || 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(task);
                          }}
                          title={action.label}
                        >
                          <action.icon size={16} />
                        </Button>
                      ))}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskTable; 