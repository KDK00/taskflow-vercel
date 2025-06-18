// 📋 Task List Module - 완전 독립적 업무 목록 모듈

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, User, Calendar, Clock, CheckSquare, AlertCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { TaskCreateModal } from '../task-management/components/task-create-modal';
import { ModuleConfig } from '../core/types';
import { getAPIClient } from '../core/api/client';
import { ModuleErrorBoundary } from '../core/components/ErrorBoundary';
import { 
  TASK_LIST_CONFIG, 
  STATUS_CONFIGS, 
  PRIORITY_CONFIGS,
  FILTER_OPTIONS,
  buildTaskListConfig,
  type DisplayConfig,
  type NotificationConfig
} from './config';

// ⚡ 자체 UI 컴포넌트 (완전 독립적)
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md border ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 border-b ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);

const Button = ({ children, onClick, className = '', disabled = false, variant = 'default' }: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost';
}) => {
  const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

const Select = ({ value, onValueChange, children }: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) => (
  <select
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    {children}
  </select>
);

const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <option value={value}>{children}</option>
);

const Input = ({ placeholder, value, onChange, className = '' }: {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) => (
  <input
    type="text"
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);

const Progress = ({ value, className = '' }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

const Checkbox = ({ checked, onCheckedChange }: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
  />
);

// 📋 업무 인터페이스
interface Task {
  id: number;
  title: string;
  content: string;
  category: string;
  status: string;
  priority: string;
  assignee: string;
  creator: string;
  dueDate?: string;
  dueTime?: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
}

// 🔧 TaskList 모듈 Props
interface TaskListModuleProps {
  moduleConfig: ModuleConfig;
  onTaskUpdate?: (task: Task) => void;
  enableWebSocket?: boolean;
  statusFilter?: string;
  // 🔌 중앙집중식 데이터 연동 Props
  onDataSync?: (tasks: Task[]) => void;
  invalidateCache?: () => void;
  currentTasks?: Task[];
}

// 🎯 TaskList 모듈 내부 컴포넌트
export function TaskListModule({ 
  moduleConfig, 
  onTaskUpdate,
  enableWebSocket = false,
  statusFilter,
  onDataSync,
  invalidateCache,
  currentTasks
}: TaskListModuleProps) {
  const { toast } = useToast();

  // 🎯 상태 관리
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [rejectingTaskId, setRejectingTaskId] = useState<number | null>(null);
  const [rejectMemo, setRejectMemo] = useState<string>('');

  // 🔄 API 클라이언트 (싱글턴으로 안정화)
  const clientRef = useRef(getAPIClient(moduleConfig));
  const client = clientRef.current;

  // 📥 업무 목록 조회 - 중앙집중식 데이터 우선 사용
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 🔌 중앙집중식 데이터가 있으면 우선 사용
      if (currentTasks && currentTasks.length > 0) {
        console.log('🔄 중앙집중식 데이터 사용:', currentTasks.length, '개 업무');
        setTasks(currentTasks);
        setLoading(false);
        return;
      }
      
      // 독립적 API 호출
      const response = await client.get('/api/tasks');
      
      if (response.success && response.data) {
        const taskData = response.data.tasks || response.data;
        const tasks = Array.isArray(taskData) ? taskData : [];
        setTasks(tasks);
        
        // 🔌 중앙집중식 데이터와 동기화
        if (onDataSync) {
          console.log('📢 독립 모듈 → 중앙집중식 데이터 동기화:', tasks.length, '개 업무');
          onDataSync(tasks);
        }
      } else {
        throw new Error(response.error || '업무 목록을 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('❌ TaskList 업무 조회 실패:', err);
      setError(err instanceof Error ? err.message : '업무 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentTasks, onDataSync]); // 중앙집중식 데이터 의존성 추가

  // 🔄 업무 상태 변경 - 중앙집중식 데이터 동기화 추가
  const updateTaskStatus = useCallback(async (taskId: number, newStatus: string) => {
    try {
      const response = await client.put(`/api/tasks/${taskId}`, { 
        status: newStatus,
        progress: STATUS_CONFIGS[newStatus]?.progress || 0
      });
      
      if (response.success) {
        setTasks(prev => {
          const updatedTasks = prev.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus, progress: STATUS_CONFIGS[newStatus]?.progress || task.progress }
            : task
          );
        
          // onTaskUpdate 콜백 호출
          const updatedTask = updatedTasks.find(t => t.id === taskId);
          if (updatedTask && onTaskUpdate) {
            onTaskUpdate(updatedTask);
          }
          
          // 🔌 중앙집중식 데이터 캐시 무효화
          if (invalidateCache) {
            console.log('📢 독립 모듈 업무 변경 → 중앙집중식 캐시 무효화');
            invalidateCache();
          }
          
          return updatedTasks;
        });
        
        toast({
          title: "✅ 성공",
          description: `업무 상태가 ${STATUS_CONFIGS[newStatus]?.label || newStatus}(으)로 변경되었습니다.`,
        });
      } else {
        throw new Error(response.error || '상태 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error('❌ 업무 상태 변경 실패:', err);
      toast({
        title: "❌ 오류",
        description: err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다.',
        variant: "destructive",
      });
    }
  }, [onTaskUpdate, invalidateCache]); // 중앙집중식 연동 의존성 추가

  // 🗑️ 업무 삭제 - 의존성 최소화
  const deleteTask = useCallback(async (taskId: number) => {
    if (!confirm('정말로 이 업무를 삭제하시겠습니까?')) return;
    
    try {
      const response = await client.delete(`/api/tasks/${taskId}`);
      
      if (response.success) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        toast({
          title: "✅ 성공",
          description: "업무가 삭제되었습니다.",
        });
      } else {
        throw new Error(response.error || '삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('❌ 업무 삭제 실패:', err);
      toast({
        title: "❌ 오류",
        description: err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.',
        variant: "destructive",
      });
    }
  }, []); // 의존성 완전 제거

  // 🚀 초기 로드만 (주기적 업데이트 제거)
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 🔧 WebSocket 처리 (안정화)
  useEffect(() => {
    if (enableWebSocket) {
      console.log('🔌 TaskList WebSocket 연결 준비됨');
    }
  }, [enableWebSocket]);

  // 📱 렌더링
  return (
    <Card className={`task-list-module ${moduleConfig.styling?.className || ''}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            📋 업무 목록 
            {tasks.length !== tasks.length && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({tasks.length})
              </span>
            )}
          </CardTitle>
          <Button onClick={fetchTasks} disabled={loading} variant="outline">
            {loading ? '🔄' : '↻'} 새로고침
          </Button>
        </div>
        
        {/* 🔍 검색 및 필터 */}
        <div className="flex gap-4 mt-4">
          <Input
            placeholder="업무 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            {FILTER_OPTIONS.status.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            {FILTER_OPTIONS.priority.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/* ⚠️ 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <span className="text-red-500 text-lg mr-2">⚠️</span>
              <div>
                <h4 className="text-red-800 font-medium">오류 발생</h4>
                <p className="text-red-600 text-sm">{error}</p>
                <Button 
                  onClick={fetchTasks} 
                  variant="outline" 
                  className="mt-2 text-red-600 border-red-300"
                >
                  다시 시도
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 🔄 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">업무 목록을 불러오는 중...</span>
          </div>
        )}

        {/* 📋 업무 목록 */}
        {!loading && !error && (
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                📭 {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                      ? '조건에 맞는 업무가 없습니다.' 
                      : '등록된 업무가 없습니다.'}
              </div>
            ) : (
              tasks.map(task => (
                <div
                  key={task.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    task.category === '확인요청' 
                      ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => onTaskSelect?.(task)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {task.category === '확인요청' && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          ⚠️ 확인요청
                        </Badge>
                      )}
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_CONFIGS[task.status]?.color || 'bg-gray-100 text-gray-600'}>
                        {STATUS_CONFIGS[task.status]?.label || task.status}
                      </Badge>
                      <Badge className={PRIORITY_CONFIGS[task.priority]?.color || 'bg-gray-100 text-gray-600'}>
                        {PRIORITY_CONFIGS[task.priority]?.label || task.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>진행률: {task.progress}%</span>
                    {task.dueDate && <span>마감: {new Date(task.dueDate).toLocaleDateString()}</span>}
                    {task.assignedTo && <span>담당자: {task.assignedTo}</span>}
                  </div>
                  
                  <Progress value={task.progress} className="mt-2" />
                  
                  <div className="flex justify-end gap-2 mt-3">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTaskStatus(task.id, 
                          task.status === 'completed' ? 'in_progress' : 'completed'
                        );
                      }}
                      variant="ghost"
                      className="text-xs"
                    >
                      {task.status === 'completed' ? '진행중으로' : '완료'}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`"${task.title}" 업무를 삭제하시겠습니까?`)) {
                          deleteTask(task.id);
                        }
                      }}
                      variant="ghost"
                      className="text-xs text-red-600"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 🛡️ 에러 경계와 함께 내보내기
const TaskListModuleWithErrorBoundary: React.FC<TaskListModuleProps> = (props) => (
  <ModuleErrorBoundary moduleName="TaskList">
    <TaskListModule {...props} />
  </ModuleErrorBoundary>
);

export default TaskListModuleWithErrorBoundary;

// 📦 편의 함수들 내보내기
export {
  buildTaskListConfig,
  STATUS_CONFIGS,
  PRIORITY_CONFIGS,
  FILTER_OPTIONS,
  type DisplayConfig,
  type NotificationConfig,
  type Task
}; 