import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Loader2, 
  RefreshCw, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Filter,
  ArrowUpDown,
  Trash,
  CheckSquare,
  Calendar,
  ChevronUp,
  ChevronDown,
  Download,
  List,
  ChevronLeft,
  ChevronRight,
  X,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { DailyTaskWithDetails } from "../../../../shared/schema";
import { useQuery } from "@tanstack/react-query";

import { TaskExcelUpload } from "@/components/task-excel-upload";
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTasks } from "@/hooks/use-tasks";
import { TaskTableSkeleton } from "@/components/ui/task-skeleton";
import { ApiError, TaskErrorBoundary } from "@/components/ui/task-error-boundary";

const statusConfig = {
  scheduled: { 
    label: "🔵 예정", 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    progress: 0
  },
  in_progress: { 
    label: "🟡 진행", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    progress: 50
  },
  completed: { 
    label: "🟢 완료", 
    color: "bg-green-100 text-green-800 border-green-200",
    progress: 100
  },
  cancelled: { 
    label: "🔴 취소", 
    color: "bg-red-100 text-red-800 border-red-200",
    progress: 0
  },
  postponed: { 
    label: "⏸️ 연기", 
    color: "bg-gray-100 text-gray-800 border-gray-200",
    progress: 0
  }
};

const priorityConfig = {
  low: { label: "낮음", color: "bg-gray-100 text-gray-600" },
  medium: { label: "보통", color: "bg-blue-100 text-blue-600" },
  high: { label: "높음", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "긴급", color: "bg-red-100 text-red-600" }
};

type SortField = 'title' | 'status' | 'priority' | 'createdAt';
type SortDirection = 'asc' | 'desc';

// 새로운 2줄 날짜 포맷 함수
const formatDateForTable = (dateStr: string, task?: DailyTaskWithDetails) => {
  if (!dateStr) return { dateOnly: '-', dayOnly: '-', scheduledTime: '-', isSaturday: false, isSunday: false };
  try {
    const date = new Date(dateStr);
    const dateOnly = format(date, 'yy/MM/dd', { locale: ko });
    const dayOnly = format(date, '(EEE)', { locale: ko });
    
    let scheduledTime = '-';
    if (task?.startTime) {
      scheduledTime = task.startTime;
    }
    
    const day = date.getDay();
    const isSaturday = day === 6;
    const isSunday = day === 0;
    return { dateOnly, dayOnly, scheduledTime, isSaturday, isSunday };
  } catch {
    return { dateOnly: 'N/A', dayOnly: '', scheduledTime: '-', isSaturday: false, isSunday: false };
  }
};

interface TaskListTableProps {
  onCreateTask?: () => void;
  onEditTask?: (taskId: number) => void;
  viewMode?: "employee" | "manager";
}

export function TaskListTable({ onCreateTask, onEditTask, viewMode = "manager" }: TaskListTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { 
    getFilteredTasks, 
    allTasks, 
    isLoading,
    isInitialLoading,
    isRefreshing,
    isEmpty,
    hasError,
    error, 
    invalidateAndRefetch,
    retryWithBackoff
  } = useTasks();
  
  // 사용자 목록 가져오기
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", { credentials: "include" });
      if (!response.ok) throw new Error('사용자 목록을 가져올 수 없습니다.');
      const data = await response.json();
      return data.users || [];
    },
  });

  // ID를 이름으로 변환하는 함수
  const getUserName = (userId: string): string => {
    if (!userId) return '미지정';
    const user = users.find((u: any) => u.id === userId || u.username === userId);
    
    // 디버깅용 로그
    if (!user && userId !== 'unknown') {
      console.log('🔍 사용자 찾기 실패:', { 
        userId, 
        availableUsers: users.map(u => ({ id: u.id, username: u.username, name: u.name }))
      });
    }
    
    return user?.name || userId;
  };

  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  
  const [pendingChanges, setPendingChanges] = useState<{[key: number]: Partial<DailyTaskWithDetails>}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<{[key: number]: boolean}>({});

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 설명서 표시 상태 추가
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  // 설명서 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      if (showHelpTooltip) {
        setShowHelpTooltip(false);
      }
    };

    if (showHelpTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showHelpTooltip]);

  // 필터링된 업무목록 조회
  const tasksData = getFilteredTasks({
    status: statusFilter === 'all' ? undefined : statusFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
    searchTerm: searchTerm || undefined
  });

  // 🎯 뷰 모드에 따른 업무 필터링 (직원은 자신의 업무만, 관리자는 전체)
  const rawTasks = Array.isArray(tasksData) ? tasksData : [];
  const tasks = viewMode === "employee" 
    ? rawTasks.filter(task => task.assignedTo === user?.id || task.assignedTo === user?.username)
    : rawTasks;

  // 월별 옵션 생성
  const generateMonthOptions = () => {
    const months = [];
    months.push({ value: 'all', label: '전체 월' });
    
    // 최근 12개월 생성
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStr = month.toString().padStart(2, '0');
      months.push({
        value: `${year}-${monthStr}`,
        label: `${year}년 ${month}월`
      });
    }
    
    return months;
  };

  // 월별 필터링된 업무 목록
  const monthFilteredTasks = monthFilter === 'all' ? tasks : tasks.filter(task => {
    if (!task.workDate && !task.dueDate) return false;
    
    const taskDate = task.workDate || task.dueDate;
    if (!taskDate) return false;
    
    const date = new Date(taskDate);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const taskMonth = `${year}-${month}`;
    
    return taskMonth === monthFilter;
  });

  // 정렬 로직
  const sortedTasks = [...monthFilteredTasks].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'priority':
        const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 페이지네이션
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageTasks = sortedTasks.slice(startIndex, endIndex);

  const totalUnsavedChanges = Object.keys(pendingChanges).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const savePendingChange = (taskId: number, field: string, newValue: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: newValue
      }
    }));
    
    setHasUnsavedChanges(prev => ({
      ...prev,
      [taskId]: true
    }));
  };

  const handleSaveAllChanges = async () => {
    const taskIdsWithChanges = Object.keys(pendingChanges).map(id => parseInt(id));
    
    if (taskIdsWithChanges.length === 0) {
      toast({
        title: "💡 저장할 변경사항 없음",
        description: "수정된 항목이 없습니다.",
      });
      return;
    }

    try {
      let successCount = 0;

      for (const taskId of taskIdsWithChanges) {
        const changes = pendingChanges[taskId];
        if (!changes) continue;
      
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(changes)
        });

        if (response.ok) {
          successCount++;
        }
      }

      setPendingChanges({});
      setHasUnsavedChanges({});

      invalidateAndRefetch();
      
      toast({
        title: "✅ 일괄 저장 완료",
        description: `${successCount}개 업무가 저장되었습니다.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ 일괄 저장 실패",
        description: error.message || "저장 중 오류가 발생했습니다.",
      });
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    // 연기/취소만 수동 변경 가능, 나머지는 진행률에 따라 자동 설정됨
    if (newStatus === 'postponed' || newStatus === 'cancelled') {
      savePendingChange(taskId, 'status', newStatus);
      // 연기/취소 시 진행률을 0%로 자동 설정
      savePendingChange(taskId, 'progress', 0);
    } else {
      // 예정/진행중/완료는 진행률에 따라 자동 설정되므로 변경 불가
      toast({
        title: "상태 변경 제한",
        description: "예정/진행중/완료 상태는 진행률에 따라 자동으로 변경됩니다.",
        variant: "default"
      });
    }
  };

  const handlePriorityChange = async (taskId: number, currentPriority: string) => {
    const priorityOptions = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorityOptions.indexOf(currentPriority);
    const nextPriority = priorityOptions[(currentIndex + 1) % priorityOptions.length];
    
    savePendingChange(taskId, 'priority', nextPriority);
  };

  // 진행률 기반 상태 자동변환 함수
  const getStatusFromProgress = (progress: number): string => {
    if (progress === 0) return 'scheduled';
    if (progress >= 25 && progress <= 75) return 'in_progress';
    if (progress === 100) return 'completed';
    return 'scheduled'; // 기본값
  };

  const handleProgressChange = async (taskId: number, currentProgress: number) => {
    const progressOptions = [0, 25, 50, 75, 100];
    const currentIndex = progressOptions.indexOf(currentProgress);
    const nextProgress = progressOptions[(currentIndex + 1) % progressOptions.length];
    
    // 진행률에 따른 상태 자동 변환
    const newStatus = getStatusFromProgress(nextProgress);
    
    // pending 변경사항으로 저장 (즉시 저장하지 않음)
    savePendingChange(taskId, 'progress', nextProgress);
    savePendingChange(taskId, 'status', newStatus);
    
    // 변경사항을 사용자에게 알림
    toast({
      title: "📊 진행률 변경됨",
      description: `진행률: ${nextProgress}% (${newStatus === 'completed' ? '완료' : newStatus === 'in_progress' ? '진행중' : '예정'}) (수정저장 클릭 필요)`,
      duration: 3000,
    });
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      scheduled: { emoji: '●', text: '예정', color: 'bg-blue-100 text-blue-800', emojiColor: 'text-blue-600' },
      in_progress: { emoji: '●', text: '진행', color: 'bg-yellow-100 text-yellow-800', emojiColor: 'text-yellow-500' },
      completed: { emoji: '●', text: '완료', color: 'bg-green-100 text-green-800', emojiColor: 'text-green-600' },
      postponed: { emoji: '●', text: '연기', color: 'bg-gray-100 text-gray-800', emojiColor: 'text-gray-500' },
      cancelled: { emoji: '●', text: '취소', color: 'bg-red-100 text-red-800', emojiColor: 'text-red-600' }
    };
    return configs[status as keyof typeof configs] || configs.scheduled;
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      low: { text: '낮음', color: 'bg-gray-100 text-gray-600' },
      medium: { text: '보통', color: 'bg-blue-100 text-blue-600' },
      high: { text: '높음', color: 'bg-orange-100 text-orange-600' },
      urgent: { text: '긴급', color: 'bg-red-100 text-red-600' }
    };
    return configs[priority as keyof typeof configs] || configs.medium;
  };

  const handleDelete = async (taskId: number, taskTitle: string) => {
    if (!confirm(`"${taskTitle}" 업무를 삭제하시겠습니까?`)) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        invalidateAndRefetch();
        toast({ title: "업무가 삭제되었습니다." });
      }
    } catch (error) {
      toast({ title: "업무 삭제에 실패했습니다.", variant: "destructive" });
    }
  };

  const handleTaskSelect = (taskId: number, checked: boolean) => {
    if (checked) {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    } else {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTaskIds(checked ? currentPageTasks.map(task => task.id) : []);
  };

  const handleCreateTask = () => {
    onCreateTask?.();
  };

  const handleEditTask = (taskId: number) => {
    const taskToEdit = tasks.find(task => task.id === taskId);
    if (taskToEdit) {
      onEditTask?.(taskId);
    } else {
      toast({
        title: "오류",
        description: "수정할 업무를 찾을 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = () => {
    invalidateAndRefetch();
  };

  const handleExcelUploadComplete = (result: any) => {
    console.log('📊 엑셀 업로드 완료:', result);
    setIsExcelUploadOpen(false);
    invalidateAndRefetch();
    
    if (result.success) {
      toast({
        title: "엑셀 업로드 완료",
        description: `${result.insertedCount || 0}개의 업무가 등록되었습니다.`,
      });
    } else {
      toast({
        title: "엑셀 업로드 실패",
        description: result.message || "업로드 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) {
      toast({
        variant: "destructive",
        title: "선택된 업무 없음",
        description: "삭제할 업무를 선택해주세요.",
      });
      return;
    }

    if (!confirm(`선택된 ${selectedTaskIds.length}개의 업무를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const response = await fetch('/api/tasks/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ taskIds: selectedTaskIds })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '일괄 삭제에 실패했습니다.');
      }
      
      setSelectedTaskIds([]);
      invalidateAndRefetch();
      
      // 결과에 따른 토스트 메시지
      if (result.deletedCount > 0) {
        toast({
          title: "✅ 일괄 삭제 완료",
          description: result.message,
        });
      } else {
        toast({
          title: "⚠️ 삭제 결과",
          description: result.message,
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error('❌ 일괄 삭제 오류:', error);
      toast({
        variant: "destructive",
        title: "❌ 일괄 삭제 실패",
        description: error.message || "일괄 삭제 중 오류가 발생했습니다.",
      });
    }
  };

  return (
    <TaskErrorBoundary 
      componentName="TaskListTable"
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            업무목록 전체
            <div className="relative">
              <div 
                className="w-5 h-5 ml-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg hover:scale-110 transition-all duration-200 group"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHelpTooltip(!showHelpTooltip);
                }}
              >
                <span className="text-white text-xs font-bold group-hover:scale-110 transition-transform duration-200">?</span>
              </div>
              {showHelpTooltip && (
                <div 
                  className="absolute top-8 left-0 z-50 w-96 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 헤더 */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
                    <h3 className="text-white font-bold text-base flex items-center">
                      <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-2">
                        <HelpCircle className="w-4 h-4" />
                      </span>
                      업무목록 사용 가이드
                    </h3>
                  </div>
                  
                  {/* 내용 */}
                  <div className="p-5 space-y-4">
                    {/* 진행률 기반 상태 자동변환 */}
                    <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                      <div className="font-bold text-blue-800 text-sm mb-2 flex items-center">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                        📊 진행률 기반 상태 자동변환
                      </div>
                      <div className="text-sm text-blue-700 space-y-1">
                        <div className="flex items-center">
                          <span className="w-12 text-center bg-gray-100 rounded px-2 py-1 mr-2 text-xs font-mono">0%</span>
                          <span>→ 예정 상태</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-12 text-center bg-yellow-100 rounded px-2 py-1 mr-2 text-xs font-mono">25-75%</span>
                          <span>→ 진행중 상태</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-12 text-center bg-green-100 rounded px-2 py-1 mr-2 text-xs font-mono">100%</span>
                          <span>→ 완료 상태</span>
                        </div>
                      </div>
                    </div>

                    {/* 상태 변경 규칙 */}
                    <div className="bg-amber-50 rounded-lg p-3 border-l-4 border-amber-400">
                      <div className="font-bold text-amber-800 text-sm mb-2 flex items-center">
                        <div className="w-2 h-2 bg-amber-400 rounded-full mr-2"></div>
                        🔧 상태 변경 규칙
                      </div>
                      <div className="text-sm text-amber-700 space-y-1">
                        <div>• <span className="font-medium">연기/취소</span>만 수동 변경 가능</div>
                        <div>• 연기/취소 선택 시 진행률 <span className="font-medium">0%로 자동 설정</span></div>
                      </div>
                    </div>

                    {/* 사용법 */}
                                         <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-400">
                       <div className="font-bold text-green-800 text-sm mb-2 flex items-center">
                         <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                         💡 사용법
                       </div>
                       <div className="text-sm text-green-700 space-y-1">
                         <div>• 진행률 클릭: <span className="font-medium">25% 단위로 순환</span></div>
                         <div>• 상태는 <span className="font-medium">자동으로 변경</span>됩니다</div>
                         <div>• 변경시 <span className="font-medium">수정저장 확인 필수</span></div>
                       </div>
                     </div>
                  </div>

                  {/* 푸터 */}
                  <div className="bg-gray-50 px-4 py-2 border-t">
                    <p className="text-xs text-gray-500 text-center">클릭하여 설명서를 닫을 수 있습니다</p>
                  </div>
                </div>
              )}
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* 수정저장 버튼 - 신규추가 왼쪽에 위치 */}
            {totalUnsavedChanges > 0 && (
              <Button
                onClick={handleSaveAllChanges}
                size="sm"
                variant="default"
                className="w-24 px-4 py-2 h-8 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-md border-0 shadow-sm transition-colors duration-200"
              >
                {totalUnsavedChanges} 수정저장
              </Button>
            )}
            <Button 
              onClick={handleCreateTask} 
              size="sm" 
              variant="default"
              className="w-24 px-4 py-2 h-8 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md border-0 shadow-sm transition-colors duration-200"
            >
              신규추가
            </Button>
            <Button 
              onClick={() => setIsExcelUploadOpen(true)} 
              size="sm" 
              variant="outline"
              className="w-24 px-4 py-2 h-8 text-sm font-medium border-green-300 text-green-700 hover:bg-green-50 rounded-md shadow-sm transition-colors duration-200"
            >
              <Download className="h-4 w-4 mr-1" />
              일괄등록
            </Button>
          </div>
        </div>
        
        {/* 필터 및 검색 */}
        <div className="flex items-center gap-4 mt-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="대상처, 업무제목, 내용 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
          </div>
          
          {/* 월별 검색 */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue placeholder="월별 검색" />
              </SelectTrigger>
              <SelectContent>
                {generateMonthOptions().map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {monthFilter && monthFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMonthFilter('all')}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 px-2 py-1 text-xs font-medium">
              <div className="flex items-center gap-1">
                {statusFilter === 'all' ? (
                  <>
                    <List className="h-3 w-3" />
                    <span>상태 {monthFilteredTasks.length}</span>
                  </>
                ) : statusFilter === 'scheduled' ? (
                  <>
                    <span className="text-lg text-blue-600">●</span>
                    <span>예정 {monthFilteredTasks.filter(t => t.status === 'scheduled').length}</span>
                  </>
                ) : statusFilter === 'in_progress' ? (
                  <>
                    <span className="text-lg text-yellow-500">●</span>
                    <span>진행 {monthFilteredTasks.filter(t => t.status === 'in_progress').length}</span>
                  </>
                ) : statusFilter === 'completed' ? (
                  <>
                    <span className="text-lg text-green-600">●</span>
                    <span>완료 {monthFilteredTasks.filter(t => t.status === 'completed').length}</span>
                  </>
                ) : statusFilter === 'postponed' ? (
                  <>
                    <span className="text-lg text-gray-500">●</span>
                    <span>연기 {monthFilteredTasks.filter(t => t.status === 'postponed').length}</span>
                  </>
                ) : statusFilter === 'cancelled' ? (
                  <>
                    <span className="text-lg text-red-600">●</span>
                    <span>취소 {monthFilteredTasks.filter(t => t.status === 'cancelled').length}</span>
                  </>
                ) : null}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                <div className="flex items-center gap-2">
                  <List className="h-3 w-3" />
                  상태 ({monthFilteredTasks.length})
                </div>
              </SelectItem>
              <SelectItem value="scheduled" className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-blue-600">●</span>
                  예정 ({monthFilteredTasks.filter(t => t.status === 'scheduled').length})
                </div>
              </SelectItem>
              <SelectItem value="in_progress" className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-yellow-500">●</span>
                  진행 ({monthFilteredTasks.filter(t => t.status === 'in_progress').length})
                </div>
              </SelectItem>
              <SelectItem value="completed" className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-green-600">●</span>
                  완료 ({monthFilteredTasks.filter(t => t.status === 'completed').length})
                </div>
              </SelectItem>
              <SelectItem value="postponed" className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-gray-500">●</span>
                  연기 ({monthFilteredTasks.filter(t => t.status === 'postponed').length})
                </div>
              </SelectItem>
              <SelectItem value="cancelled" className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-red-600">●</span>
                  취소 ({monthFilteredTasks.filter(t => t.status === 'cancelled').length})
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 h-8 px-2 py-1 text-xs font-medium">
              <div className="flex items-center gap-1">
                {priorityFilter === 'all' ? (
                  <span>우선순위 ({monthFilteredTasks.length})</span>
                ) : priorityFilter === 'low' ? (
                  <span>낮음 ({monthFilteredTasks.filter(t => t.priority === 'low').length})</span>
                ) : priorityFilter === 'medium' ? (
                  <span>보통 ({monthFilteredTasks.filter(t => t.priority === 'medium').length})</span>
                ) : priorityFilter === 'high' ? (
                  <span>높음 ({monthFilteredTasks.filter(t => t.priority === 'high').length})</span>
                ) : priorityFilter === 'urgent' ? (
                  <span>긴급 ({monthFilteredTasks.filter(t => t.priority === 'urgent').length})</span>
                ) : null}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">우선순위 ({monthFilteredTasks.length})</SelectItem>
              <SelectItem value="low" className="text-xs">낮음 ({monthFilteredTasks.filter(t => t.priority === 'low').length})</SelectItem>
              <SelectItem value="medium" className="text-xs">보통 ({monthFilteredTasks.filter(t => t.priority === 'medium').length})</SelectItem>
              <SelectItem value="high" className="text-xs">높음 ({monthFilteredTasks.filter(t => t.priority === 'high').length})</SelectItem>
              <SelectItem value="urgent" className="text-xs">긴급 ({monthFilteredTasks.filter(t => t.priority === 'urgent').length})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="w-32 h-8 px-2 py-1 text-xs font-medium">
              <div className="flex items-center gap-1">
                <span>{itemsPerPage}개씩보기</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10" className="text-xs">10개씩보기</SelectItem>
              <SelectItem value="20" className="text-xs">20개씩보기</SelectItem>
              <SelectItem value="50" className="text-xs">50개씩보기</SelectItem>
              <SelectItem value="100" className="text-xs">100개씩보기</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-gray-600">
            총 {sortedTasks.length}개 업무 ({currentPage}/{totalPages} 페이지)
          </div>

          {/* 일괄 작업 버튼 */}
          {selectedTaskIds.length > 0 && (
            <div className="flex items-center gap-3 ml-auto">
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                size="sm"
                className="h-8 px-3 text-xs font-medium"
              >
                {selectedTaskIds.length} 선택삭제
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* 🔄 초기 로딩 상태 - 스켈레톤 UI */}
        {isInitialLoading ? (
          <TaskTableSkeleton rows={itemsPerPage} />
        ) : hasError ? (
          /* 🚨 에러 상태 - 향상된 에러 UI */
          <ApiError 
            error={error || "알 수 없는 오류가 발생했습니다"}
            onRetry={() => retryWithBackoff()}
            onReset={handleRefresh}
            title="업무 목록을 불러올 수 없습니다"
            description="서버 연결을 확인하고 다시 시도해주세요."
          />
        ) : isEmpty ? (
          /* 📭 빈 상태 */
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <List className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">업무가 없습니다</h3>
            <p className="text-gray-600 text-center mb-4">
              새로운 업무를 추가하거나 필터를 조정해보세요.
            </p>
            <Button onClick={handleCreateTask} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              새 업무 추가
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12 min-w-[48px]">
                    <Checkbox
                      checked={selectedTaskIds.length === currentPageTasks.length && currentPageTasks.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="min-w-[120px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        일자
                        {sortField === 'createdAt' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[350px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        업무 제목
                        {sortField === 'title' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[50px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        우선순위
                        {sortField === 'priority' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[60px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        진행률
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[50px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        상태
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[140px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        업무연계
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead className="w-32 min-w-[128px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs font-medium hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        수정/작업
                      </div>
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                      조건에 맞는 업무가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentPageTasks.map((task) => {
                    const { dateOnly, dayOnly, scheduledTime, isSaturday, isSunday } = formatDateForTable(task.workDate || task.dueDate || task.createdAt, task);
                    
                    const displayTask = {
                      ...task,
                      ...pendingChanges[task.id]
                    };
                    
                    const hasChanges = hasUnsavedChanges[task.id];
                    
                    // 업무연계 체인 생성
                    const getTaskChain = (currentTask: DailyTaskWithDetails): string => {
                      const visited = new Set<string>();
                      const chain: string[] = [];
                      
                      let task = currentTask;
                      while (task && !visited.has(task.id.toString())) {
                        visited.add(task.id.toString());
                        chain.push(task.assignedUser?.name || task.assignedTo || '미지정');
                        
                        if (task.followUpAssignee) {
                          const nextUser = allTasks.find(t => t.assignedTo === task.followUpAssignee);
                          if (nextUser) {
                            task = nextUser;
                          } else {
                            chain.push(task.followUpAssignee);
                            break;
                          }
                        } else {
                          break;
                        }
                      }
                      
                      return [...new Set(chain)].join(' → ');
                    };
                    
                    return (
                      <TableRow 
                        key={task.id} 
                        className={`${hasChanges ? 'bg-red-50 border-l-4 border-l-red-400' : 'bg-white'} hover:bg-gray-50`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedTaskIds.includes(task.id)}
                            onCheckedChange={(checked) => handleTaskSelect(task.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center p-2">
                          <div className="text-sm font-bold text-gray-800">
                            {dateOnly}<span className={isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-gray-800'}>{dayOnly}</span>
                          </div>
                          <div className="text-sm text-gray-900">
                            {scheduledTime}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div 
                              className="cursor-pointer hover:text-blue-600 transition-colors"
                              onDoubleClick={() => handleEditTask(task.id)}
                              title="더블클릭하여 수정"
                            >
                              <span className="font-bold text-gray-800 bg-gray-300 px-2 py-1 rounded mr-2">
                                {displayTask.targetPlace || '미지정'}
                              </span>
                              <span className="font-semibold">
                                {displayTask.title.startsWith('[확인요청]') ? '🔴 ' : ''}{displayTask.title}
                              </span>
                            </div>
                            {displayTask.description && (
                              <div className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                                {displayTask.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 px-2 text-xs ${getPriorityConfig(displayTask.priority).color} transition-colors cursor-pointer`}
                            onClick={() => handlePriorityChange(task.id, displayTask.priority)}
                            title="클릭하여 우선순위 변경"
                          >
                            {getPriorityConfig(displayTask.priority).text}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {/* 원형 진행률 표시 - 오늘할일 카드와 동일 */}
                            <div 
                              className="relative cursor-pointer group flex-shrink-0"
                              onClick={() => handleProgressChange(task.id, displayTask.progress || 0)}
                              title="클릭하여 진행률 변경 (25% 단위)"
                            >
                              <div className="w-10 h-10 relative">
                                {/* 원형 배경 */}
                                <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 40 40">
                                  <circle
                                    cx="20"
                                    cy="20"
                                    r="15"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    className="text-gray-200"
                                  />
                                  <circle
                                    cx="20"
                                    cy="20"
                                    r="15"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    className={`transition-all duration-300 ${
                                      (displayTask.progress || 0) === 100 ? 'text-green-500' :
                                      (displayTask.progress || 0) >= 75 ? 'text-blue-500' :
                                      (displayTask.progress || 0) >= 50 ? 'text-yellow-500' :
                                      (displayTask.progress || 0) >= 25 ? 'text-orange-500' :
                                      'text-gray-300'
                                    }`}
                                    strokeDasharray={`${((displayTask.progress || 0) / 100) * 94} 94`}
                                    strokeDashoffset="0"
                                  />
                                </svg>
                                {/* 중앙 텍스트 */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className={`text-xs font-bold transition-colors duration-200 ${
                                    (displayTask.progress || 0) === 100 ? 'text-green-600' :
                                    (displayTask.progress || 0) >= 75 ? 'text-blue-600' :
                                    (displayTask.progress || 0) >= 50 ? 'text-yellow-600' :
                                    (displayTask.progress || 0) >= 25 ? 'text-orange-600' :
                                    'text-gray-500'
                                  }`}>
                                    {displayTask.progress || 0}%
                                  </span>
                                </div>
                              </div>
                              {/* 호버 효과 */}
                              <div className="absolute inset-0 rounded-full bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select value={displayTask.status} onValueChange={(value) => handleStatusChange(task.id, value)}>
                            <SelectTrigger className={`h-6 px-2 text-xs ${getStatusConfig(displayTask.status).color} border-0 bg-transparent hover:bg-opacity-80 whitespace-nowrap flex-shrink-0 w-auto min-w-[70px] [&>svg]:hidden`}>
                              <div className="flex items-center gap-1">
                                <span className={`text-lg ${getStatusConfig(displayTask.status).emojiColor}`}>{getStatusConfig(displayTask.status).emoji}</span>
                                <span>{getStatusConfig(displayTask.status).text}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="postponed">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg text-gray-500">●</span>
                                  연기
                                </div>
                              </SelectItem>
                              <SelectItem value="cancelled">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg text-red-600">●</span>
                                  취소
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col items-start space-y-1">
                            {(() => {
                              // 후속담당자 필드 통합 확인
                              const followUpAssignee = task.followUpAssignee || 
                                                     task.followUpAssigneeGeneral || 
                                                     task.followUpAssigneeContract;
                              
                              // 후속업무 확인 상태 체크
                              const followUpTask = allTasks.find(t => 
                                t.isFollowUpTask && 
                                t.parentTaskId === task.id &&
                                t.assignedTo === followUpAssignee
                              );
                              
                              const isFollowUpConfirmed = followUpTask?.status === 'completed';
                              const isFollowUpRejected = followUpTask?.status === 'cancelled';
                              
                              if (task.assignedTo && followUpAssignee && followUpAssignee !== task.assignedTo) {
                                return (
                                  <>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {getUserName(task.assignedTo)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-400 text-xs">↓</span>
                                      {isFollowUpConfirmed && (
                                        <span className="text-green-600 text-xs" title="확인완료">✓</span>
                                      )}
                                      {isFollowUpRejected && (
                                        <span className="text-red-600 text-xs" title="반려됨">✗</span>
                                      )}
                                      {!isFollowUpConfirmed && !isFollowUpRejected && (
                                        <span className="text-yellow-600 text-xs" title="확인대기">⏳</span>
                                      )}
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      isFollowUpConfirmed ? 'bg-green-100 text-green-800' :
                                      isFollowUpRejected ? 'bg-red-100 text-red-800' :
                                      'bg-purple-100 text-purple-800'
                                    }`}>
                                      {getUserName(followUpAssignee)}
                                    </span>
                                  </>
                                );
                              } else if (task.assignedTo) {
                                return (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {getUserName(task.assignedTo)}
                                  </span>
                                );
                              } else if (followUpAssignee) {
                                return (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {getUserName(followUpAssignee)}
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="text-gray-400 text-xs">-</span>
                                );
                              }
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={() => handleEditTask(task.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(task.id, task.title)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            
            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    {startIndex + 1}-{Math.min(endIndex, sortedTasks.length)} / {sortedTasks.length}개 업무
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => 
                        page === 1 || 
                        page === totalPages || 
                        Math.abs(page - currentPage) <= 2
                      )
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="px-1 text-gray-400">...</span>
                            )}
                            <Button
                              onClick={() => handlePageChange(page)}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0 text-xs"
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        );
                      })}
                  </div>
                  
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      


      {isExcelUploadOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <TaskExcelUpload 
                onUploadComplete={handleExcelUploadComplete} 
                onClose={() => setIsExcelUploadOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
    </TaskErrorBoundary>
  );
} 