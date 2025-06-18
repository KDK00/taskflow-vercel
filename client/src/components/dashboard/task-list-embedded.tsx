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
  ChevronUp,
  ChevronDown,
  Download,
  CheckCircle,
  List,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { DailyTaskWithDetails } from "../../../../shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { TaskToScheduleModal } from "@/components/modals/task-to-schedule-modal";
import { TaskExcelUpload } from "@/components/task-excel-upload";
import { useTasks } from "@/hooks/use-tasks";

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

type SortField = 'title' | 'status' | 'priority' | 'createdAt' | 'assignedTo';
type SortDirection = 'asc' | 'desc';

// 새로운 2줄 날짜 포맷 함수
const formatDateForTable = (dateStr: string, task?: DailyTaskWithDetails) => {
  if (!dateStr) return { dateOnly: '-', dayOnly: '', scheduledTime: '-', isSaturday: false, isSunday: false };
  try {
    const date = new Date(dateStr);
    // 1행: 25/06/13(금) 형태 - 날짜와 요일 분리
    const dateOnly = format(date, 'yy/MM/dd', { locale: ko });
    const dayOnly = format(date, '(EEE)', { locale: ko });
    
    // 2행: 설정시간 (업무에 설정된 시작시간, 없으면 '-')
    let scheduledTime = '-';
    if (task?.startTime) {
      scheduledTime = task.startTime;
    }
    
    const day = date.getDay(); // 0: Sunday, 6: Saturday
    const isSaturday = day === 6;
    const isSunday = day === 0;
    return { dateOnly, dayOnly, scheduledTime, isSaturday, isSunday };
  } catch {
    return { dateOnly: 'N/A', dayOnly: '', scheduledTime: '-', isSaturday: false, isSunday: false };
  }
};

interface TaskListEmbeddedProps {
  onCreateTask: () => void;
  onEditTask: (taskId: number) => void;
}

export function TaskListEmbedded({ onCreateTask, onEditTask }: TaskListEmbeddedProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // 중앙집중식 업무목록 사용
  const { 
    getFilteredTasks, 
    allTasks, 
    isLoading, 
    error, 
    invalidateAndRefetch 
  } = useTasks();
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedTasksForSchedule, setSelectedTasksForSchedule] = useState<DailyTaskWithDetails[]>([]);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  
  // 🔥 수정 카운팅 시스템 상태 추가
  const [pendingChanges, setPendingChanges] = useState<{[key: number]: Partial<DailyTaskWithDetails>}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<{[key: number]: boolean}>({});

  // 정렬 상태 추가
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 🆕 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 현재 뷰 상태 추가
  const [currentView, setCurrentView] = useState<"employee" | "manager">(
    user?.role === "developer" || user?.role === "manager" ? "manager" : "employee"
  );

  const { lastMessage } = useWebSocket();

  // 필터링된 업무목록 조회 (중앙집중식)
  const tasksData = getFilteredTasks({
    status: statusFilter === 'all' ? undefined : statusFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
    searchTerm: searchTerm || undefined
  });

  // 정렬 처리
  const sortedTasks = [...tasksData].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'title':
        aValue = a.title?.toLowerCase() || '';
        bValue = b.title?.toLowerCase() || '';
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt || 0).getTime();
        bValue = new Date(b.createdAt || 0).getTime();
        break;
      case 'assignedTo':
        aValue = a.assignedTo?.toLowerCase() || '';
        bValue = b.assignedTo?.toLowerCase() || '';
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 페이지네이션 처리
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = sortedTasks.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 ml-1" />
      : <ChevronDown className="w-4 h-4 ml-1" />;
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
    const taskIds = Object.keys(pendingChanges).map(Number);
    
    try {
      for (const taskId of taskIds) {
        const changes = pendingChanges[taskId];
        if (Object.keys(changes).length > 0) {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changes)
          });
          
          if (!response.ok) {
            throw new Error(`업무 ${taskId} 수정 실패`);
          }
        }
      }
      
      // 성공 시 상태 초기화
      setPendingChanges({});
      setHasUnsavedChanges({});
      
      // 데이터 새로고침
      invalidateAndRefetch();
      
      toast({
        title: "✅ 변경사항 저장 완료",
        description: `${taskIds.length}개 업무가 성공적으로 수정되었습니다.`,
      });
      
    } catch (error) {
      console.error('일괄 저장 실패:', error);
      toast({
        title: "❌ 저장 실패",
        description: "변경사항 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        invalidateAndRefetch();
        toast({
          title: "✅ 상태 변경 완료",
          description: "업무 상태가 성공적으로 변경되었습니다.",
        });
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
    }
  };

  const handlePriorityChange = async (taskId: number, currentPriority: string) => {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorities.indexOf(currentPriority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    const newPriority = priorities[nextIndex];
    
    savePendingChange(taskId, 'priority', newPriority);
  };

  const handleProgressChange = async (taskId: number, currentProgress: number) => {
    const newProgress = currentProgress >= 100 ? 0 : currentProgress + 25;
    savePendingChange(taskId, 'progress', newProgress);
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: "bg-gray-100 text-gray-800 border-gray-200",
      progress: 0
    };
  };

  const getPriorityConfig = (priority: string) => {
    return priorityConfig[priority as keyof typeof priorityConfig] || {
      label: priority,
      color: "bg-gray-100 text-gray-600"
    };
  };

  const handleDelete = async (taskId: number, taskTitle: string) => {
    if (!confirm(`"${taskTitle}" 업무를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        invalidateAndRefetch();
        toast({
          title: "✅ 업무 삭제 완료",
          description: `"${taskTitle}" 업무가 삭제되었습니다.`,
        });
      } else {
        throw new Error('삭제 실패');
      }
    } catch (error) {
      console.error('업무 삭제 실패:', error);
      toast({
        title: "❌ 삭제 실패",
        description: "업무 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) {
      toast({
        title: "⚠️ 선택된 업무 없음",
        description: "삭제할 업무를 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`선택된 ${selectedTaskIds.length}개 업무를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const deletePromises = selectedTaskIds.map(taskId =>
        fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      );
      
      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        invalidateAndRefetch();
        setSelectedTaskIds([]);
        
        toast({
          title: "✅ 일괄 삭제 완료",
          description: `${successCount}개 업무가 삭제되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`,
        });
      }
    } catch (error) {
      console.error('일괄 삭제 실패:', error);
      toast({
        title: "❌ 삭제 실패",
        description: "업무 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleTaskSelect = (taskId: number, checked: boolean) => {
    setSelectedTaskIds(prev => 
      checked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTaskIds(checked ? currentTasks.map(task => task.id) : []);
  };

  const handleRefresh = () => {
    invalidateAndRefetch();
    toast({
      title: "🔄 새로고침 완료",
      description: "업무 목록이 업데이트되었습니다.",
    });
  };

  const handleExcelUploadComplete = (result: any) => {
    setIsExcelUploadOpen(false);
    
    if (result.success) {
      invalidateAndRefetch();
      toast({
        title: "✅ Excel 업로드 완료",
        description: `${result.insertedCount}개의 업무가 추가되었습니다.`,
      });
    } else {
      toast({
        title: "❌ 업로드 실패",
        description: result.error || "Excel 업로드 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleCloseScheduleModal = () => {
    setIsScheduleModalOpen(false);
    setSelectedTasksForSchedule([]);
  };

  const handleScheduleConversionSuccess = () => {
    handleCloseScheduleModal();
    invalidateAndRefetch();
    toast({
      title: "✅ 일정 변환 완료",
      description: "선택된 업무들이 일정으로 변환되었습니다.",
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600">업무 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">❌ 업무 목록을 불러오는데 실패했습니다.</div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 섹션 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <CheckSquare className="w-6 h-6 mr-2 text-purple-300" />
            업무목록 전체
          </h1>
          <p className="text-purple-200 mt-1">
            총 {allTasks.length}개 업무 중 {tasksData.length}개 표시
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button onClick={onCreateTask} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            새 업무 추가
          </Button>
        </div>
      </div>

      {/* 필터 및 검색 섹션 */}
      <Card className="glass-card border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center text-lg text-white">
            <Filter className="w-5 h-5 mr-2" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="업무 제목, 담당자 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-300"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="scheduled">🔵 예정</SelectItem>
                <SelectItem value="in_progress">🟡 진행</SelectItem>
                <SelectItem value="completed">🟢 완료</SelectItem>
                <SelectItem value="postponed">⏸️ 연기</SelectItem>
                <SelectItem value="cancelled">🔴 취소</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="우선순위 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 우선순위</SelectItem>
                <SelectItem value="urgent">🔴 긴급</SelectItem>
                <SelectItem value="high">🟠 높음</SelectItem>
                <SelectItem value="medium">🔵 보통</SelectItem>
                <SelectItem value="low">⚪ 낮음</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10개씩 보기</SelectItem>
                <SelectItem value="25">25개씩 보기</SelectItem>
                <SelectItem value="50">50개씩 보기</SelectItem>
                <SelectItem value="100">100개씩 보기</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 일괄 작업 버튼 */}
      {selectedTaskIds.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-orange-800 font-medium">
                {selectedTaskIds.length}개 업무 선택됨
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  size="sm"
                >
                  <Trash className="w-4 h-4 mr-2" />
                  선택 삭제
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 미저장 변경사항 알림 */}
      {Object.keys(pendingChanges).length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {Object.keys(pendingChanges).length}개 업무에 미저장 변경사항이 있습니다
              </span>
              <Button
                onClick={handleSaveAllChanges}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                모든 변경사항 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 업무 목록 테이블 */}
      <Card className="glass-card border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center text-white">
              <List className="w-5 h-5 mr-2" />
              업무 목록
            </span>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setIsExcelUploadOpen(true)}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Excel 업로드
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="w-12 text-white">
                    <Checkbox
                      checked={selectedTaskIds.length === currentTasks.length && currentTasks.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-white/10 text-white"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      일자
                      {getSortIcon('createdAt')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-white/10 text-white"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      업무 제목
                      {getSortIcon('title')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-white/10 text-white"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      상태
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-white/10 text-white"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center">
                      우선순위
                      {getSortIcon('priority')}
                    </div>
                  </TableHead>
                  <TableHead className="text-white">담당자</TableHead>
                  <TableHead className="text-white">진행률</TableHead>
                  <TableHead className="text-white">수정/삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTasks.map((task) => {
                  const { dateOnly, dayOnly, scheduledTime, isSaturday, isSunday } = formatDateForTable(task.createdAt, task);
                  const statusConfig = getStatusConfig(task.status);
                  const priorityConfig = getPriorityConfig(task.priority);
                  const hasChanges = hasUnsavedChanges[task.id];
                  const pendingTask = { ...task, ...pendingChanges[task.id] };

                  return (
                    <TableRow key={task.id} className={`border-white/20 ${hasChanges ? "bg-yellow-50/20" : ""}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTaskIds.includes(task.id)}
                          onCheckedChange={(checked) => handleTaskSelect(task.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center space-y-1">
                          <div className={`px-2 py-1 rounded text-xs font-bold text-white ${
                            isSunday ? 'bg-red-500' : isSaturday ? 'bg-blue-500' : 'bg-red-500'
                          }`}>
                            {dateOnly}{dayOnly}
                          </div>
                          <div className="text-xs text-gray-300">
                            {scheduledTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium text-white truncate">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-300 truncate mt-1">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={pendingTask.status}
                          onValueChange={(value) => handleStatusChange(task.id, value)}
                        >
                          <SelectTrigger className="w-32 bg-white/10 border-white/20">
                            <SelectValue>
                              <Badge className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">🔵 예정</SelectItem>
                            <SelectItem value="in_progress">🟡 진행</SelectItem>
                            <SelectItem value="completed">🟢 완료</SelectItem>
                            <SelectItem value="postponed">⏸️ 연기</SelectItem>
                            <SelectItem value="cancelled">🔴 취소</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePriorityChange(task.id, pendingTask.priority)}
                          className="p-0 h-auto hover:bg-white/10"
                        >
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-300">
                          {task.assignedTo || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={pendingTask.progress || 0} 
                            className="w-16 h-2"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProgressChange(task.id, pendingTask.progress || 0)}
                            className="text-xs px-2 py-1 h-auto text-white hover:bg-white/10"
                          >
                            {pendingTask.progress || 0}%
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditTask(task.id)}
                            className="p-1 h-auto hover:bg-white/10"
                          >
                            <Edit2 className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(task.id, task.title)}
                            className="p-1 h-auto hover:bg-white/10"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-300">
                {startIndex + 1}-{Math.min(endIndex, sortedTasks.length)} / {sortedTasks.length}개 업무
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 p-0 ${
                          currentPage === pageNum 
                            ? "bg-purple-600 text-white" 
                            : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 모달들 */}
      {isScheduleModalOpen && (
        <TaskToScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={handleCloseScheduleModal}
          tasks={selectedTasksForSchedule}
          onSuccess={handleScheduleConversionSuccess}
        />
      )}

      {isExcelUploadOpen && (
        <TaskExcelUpload
          isOpen={isExcelUploadOpen}
          onClose={() => setIsExcelUploadOpen(false)}
          onUploadComplete={handleExcelUploadComplete}
        />
      )}
    </div>
  );
} 