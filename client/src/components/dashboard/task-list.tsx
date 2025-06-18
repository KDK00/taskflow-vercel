import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Loader2, RefreshCw, Plus, Edit2, Trash2, Calendar, Clock, User, AlertCircle, CheckCircle, Pause, X, List, ExternalLink, Search, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DailyTaskWithDetails } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useTasks } from "@/hooks/use-tasks";

interface TaskListProps {
  onCreateTask: () => void;
  onEditTask: (taskId: number) => void;
  refreshTrigger?: number;
}

const statusConfig = {
  scheduled: { 
    label: "🔵 예정", 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    progress: 0
  },
  in_progress: { 
    label: "🟡 진행", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    progress: 25
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

export function TaskList({ onCreateTask, onEditTask, refreshTrigger }: TaskListProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAllTasks, setShowAllTasks] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilterActive, setStatusFilterActive] = useState<string>('all');
  
  // 🔥 수정 카운팅 시스템 상태 추가
  const [pendingChanges, setPendingChanges] = useState<{[key: number]: Partial<DailyTaskWithDetails>}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<{[key: number]: boolean}>({});

  const { toast } = useToast();
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // 중앙집중식 업무목록 사용
  const { 
    getFilteredTasks, 
    todayTasks, 
    allTasks, 
    isLoading, 
    error, 
    invalidateAndRefetch 
  } = useTasks();

  // 🔥 다른 페이지에서의 업무 변경사항 실시간 반영을 위한 전역 이벤트 리스너
  useEffect(() => {
    const handleTaskUpdate = () => {
      // 중앙집중식 업무목록 새로고침
      invalidateAndRefetch();
    };

    // 전역 이벤트 리스너 등록 (다른 페이지에서 업무 변경 시 발생)
    window.addEventListener('taskUpdated', handleTaskUpdate);
    window.addEventListener('taskCreated', handleTaskUpdate);
    window.addEventListener('taskDeleted', handleTaskUpdate);
    window.addEventListener('taskStatusChanged', handleTaskUpdate);
    window.addEventListener('tasksBulkDeleted', handleTaskUpdate);
    window.addEventListener('tasksBulkUpdated', handleTaskUpdate);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
      window.removeEventListener('taskCreated', handleTaskUpdate);
      window.removeEventListener('taskDeleted', handleTaskUpdate);
      window.removeEventListener('taskStatusChanged', handleTaskUpdate);
      window.removeEventListener('tasksBulkDeleted', handleTaskUpdate);
      window.removeEventListener('tasksBulkUpdated', handleTaskUpdate);
    };
  }, [invalidateAndRefetch]);

  // 필터링된 업무목록 조회
  const tasks = getFilteredTasks({
    status: statusFilter === 'all' ? undefined : statusFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
    searchTerm: searchTerm || undefined
  });

  // 업무 수정 Mutation 추가
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: { id: number; [key: string]: any }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('업무 수정에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // 전역 이벤트 발생 (주간보고서 실시간 업데이트용)
      window.dispatchEvent(new CustomEvent('taskUpdated', { detail: data.task }));
      
      toast({
        title: "✅ 업무 수정",
        description: "업무가 성공적으로 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error('❌ 업무 수정 실패:', error);
      toast({
        variant: "destructive",
        title: "❌ 수정 실패",
        description: error.message || "업무 수정 중 오류가 발생했습니다.",
      });
    }
  });

  // WebSocket 메시지 처리 (실시간 업데이트)
  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const data = JSON.parse(lastMessage.data);
        console.log('📨 WebSocket 메시지 수신:', data.type);
        
        // 업무 관련 모든 이벤트에 대해 목록 새로고침
        if (data.type === 'TASK_UPDATE' || 
            data.type === 'task_created' || 
            data.type === 'task_updated' || 
            data.type === 'task_deleted') {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          
          // 사용자에게 변경사항 알림
          if (data.type === 'task_created') {
            toast({
              title: "✨ 새 업무 추가",
              description: `"${data.data?.title || '새 업무'}"가 생성되었습니다.`,
            });
          }
        }
      } catch (error) {
        // 에러 시에만 로그 출력
        console.error('WebSocket 메시지 파싱 오류:', error);
      }
    }
  }, [lastMessage, queryClient, toast]);

  // 사용자 정보 조회 - 한 번만 조회하고 캐시 유지
  const { data: userData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await fetch('/api/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        return data.user || data;
      }
      return null;
    },
    staleTime: Infinity, // 무한 캐시 - 세션 동안 유지
    refetchInterval: false, // 자동 새로고침 비활성화
    refetchOnWindowFocus: false, // 창 포커스시 갱신 비활성화
    refetchOnMount: false // 컴포넌트 마운트시 갱신 비활성화 (첫 로드만)
  });

  useEffect(() => {
    if (userData) {
      setCurrentUser(userData);
    }
  }, [userData]);

  // 날짜 포맷팅 헬퍼 (시간대 문제 해결)
  const formatWorkDate = (dateStr: string) => {
    try {
      // 빈 문자열이나 null/undefined 체크
      if (!dateStr || dateStr.trim() === '') {
        return "📅 날짜 미설정";
      }
      
      // ISO 문자열인 경우 로컬 시간대로 변환하여 날짜만 추출
      const date = new Date(dateStr);
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return `📅 ${dateStr}`;
      }
      
      // 로컬 시간대 기준으로 오늘, 내일, 어제 비교
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const dateStrFormatted = format(date, 'yyyy-MM-dd');
      
      if (dateStrFormatted === todayStr) {
        return "📅 오늘";
      } else if (dateStrFormatted === format(new Date(today.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd')) {
        return "📅 내일";
      } else if (dateStrFormatted === format(new Date(today.getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')) {
        return "📅 어제";
      } else {
        return `📅 ${format(date, 'MM월 dd일', { locale: ko })}`;
      }
    } catch (error) {
      console.warn('날짜 포맷팅 오류:', error, 'dateStr:', dateStr);
      return `📅 ${dateStr}`;
    }
  };

  // 수동 새로고침
  const handleManualRefresh = () => {
    invalidateAndRefetch();
    setSelectedTaskIds([]);
    toast({
      title: "🔄 새로고침",
      description: "업무 목록을 다시 불러오고 있습니다.",
    });
  };

  // 상태 변경 함수 수정 - 새로운 진행률 규칙 적용
  const handleStatusChange = (taskId: number, newStatus: string) => {
    // 연기/취소가 아닌 상태 변경 시 제한
    if (newStatus !== 'postponed' && newStatus !== 'cancelled') {
      toast({
        variant: "destructive",
        title: "❌ 상태 변경 제한",
        description: "연기/취소만 수동 변경 가능합니다. 진행률을 클릭하여 상태를 변경하세요.",
        duration: 3000
      });
      return;
    }
    
    // 연기/취소 시 진행률도 0%로 설정
    savePendingChange(taskId, 'status', newStatus);
    savePendingChange(taskId, 'progress', 0);
    
    setHasUnsavedChanges(prev => ({
      ...prev,
      [taskId]: true
    }));
    
    toast({
      title: "🔄 상태 변경됨",
      description: `상태: ${newStatus === 'postponed' ? '연기' : '취소'} (진행률: 0%) (수정저장 클릭 필요)`,
      duration: 2000
    });
  };

  // 우선순위 변경 함수 수정 - pending 방식으로 변경
  const handlePriorityChange = (taskId: number, currentPriority: string) => {
    const priorityOptions = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorityOptions.indexOf(currentPriority);
    const nextPriority = priorityOptions[(currentIndex + 1) % priorityOptions.length];
    
    savePendingChange(taskId, 'priority', nextPriority);
  };

  // 진행률에 따른 상태 자동변환 함수
  const getStatusFromProgress = (progress: number): string => {
    if (progress === 0) return 'scheduled';
    if (progress >= 1 && progress <= 99) return 'in_progress';
    if (progress === 100) return 'completed';
    return 'scheduled';
  };

  // 진행율 변경 함수 - 오늘할일 카드와 동일한 로직
  const handleProgressChange = (taskId: number, currentProgress: number) => {
    // 25% 단위로 순환 (0 → 25 → 50 → 75 → 100 → 0)
    const progressLevels = [0, 25, 50, 75, 100];
      const currentIndex = progressLevels.indexOf(currentProgress);
    const nextIndex = (currentIndex + 1) % progressLevels.length;
      const newProgress = progressLevels[nextIndex];
      
    // 진행률에 따른 상태 자동 변경
    const newStatus = getStatusFromProgress(newProgress);
    
    // 🔥 진행률과 상태를 동시에 변경
      savePendingChange(taskId, 'progress', newProgress);
    savePendingChange(taskId, 'status', newStatus);
    
    // 변경사항 저장 표시
    setHasUnsavedChanges(prev => ({
      ...prev,
      [taskId]: true
    }));
    
    toast({
      title: "📊 진행률 변경됨",
      description: `진행률: ${newProgress}% → 상태: ${
        newStatus === 'scheduled' ? '예정' :
        newStatus === 'in_progress' ? '진행중' :
        newStatus === 'completed' ? '완료' : newStatus
      } (수정저장 클릭 필요)`,
      duration: 2000
    });
  };

  // 상태 아이콘과 색상 함수 수정
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'bg-green-100 text-green-800 hover:bg-green-200', text: '완료' };
      case 'in_progress':
        return { icon: Clock, color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', text: '진행' };
      case 'postponed':
        return { icon: Pause, color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', text: '연기' };
      case 'cancelled':
        return { icon: X, color: 'bg-red-100 text-red-800 hover:bg-red-200', text: '취소' };
      default:
        return { icon: Calendar, color: 'bg-gray-100 text-gray-800 hover:bg-gray-200', text: '예정' };
    }
  };

  // 우선순위 색상 함수 수정
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { color: 'bg-red-100 text-red-800 hover:bg-red-200', text: '긴급' };
      case 'high':
        return { color: 'bg-orange-100 text-orange-800 hover:bg-orange-200', text: '높음' };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', text: '보통' };
      case 'low':
        return { color: 'bg-green-100 text-green-800 hover:bg-green-200', text: '낮음' };
      default:
        return { color: 'bg-gray-100 text-gray-800 hover:bg-gray-200', text: '보통' };
    }
  };

  // 개별 업무 삭제
  const handleDelete = async (taskId: number, taskTitle: string) => {
    if (!confirm(`"${taskTitle}" 업무를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('업무 삭제에 실패했습니다.');
      }

      // 캐시 무효화하여 즉시 갱신
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // 전역 이벤트 발생 (주간보고서 실시간 업데이트용)
      window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { id: taskId, title: taskTitle } }));
        
        toast({
          title: "✅ 업무 삭제",
          description: `"${taskTitle}" 업무가 삭제되었습니다.`,
        });
    } catch (error: any) {
      console.error('❌ 업무 삭제 실패:', error);
      toast({
        variant: "destructive",
        title: "❌ 삭제 실패",
        description: error.message || "업무 삭제 중 오류가 발생했습니다.",
      });
    }
  };

  // 일괄 삭제
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

    console.log(`🗑️ 일괄삭제 시작: ${selectedTaskIds.length}개 업무 (IDs: ${selectedTaskIds.join(', ')})`);

    try {
      // 요청 전 로딩 상태 표시
      toast({
        title: "🔄 삭제 중...",
        description: `${selectedTaskIds.length}개 업무를 삭제하고 있습니다.`,
      });

      const response = await fetch('/api/tasks/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ taskIds: selectedTaskIds })
      });

      console.log(`📡 서버 응답 상태: ${response.status} ${response.statusText}`);

      let result;
      try {
        result = await response.json();
        console.log('📥 서버 응답 데이터:', result);
      } catch (parseError) {
        console.error('❌ 응답 파싱 오류:', parseError);
        throw new Error('서버 응답을 처리할 수 없습니다. 다시 시도해주세요.');
      }

      if (!response.ok) {
        console.error(`❌ HTTP 오류: ${response.status}`, result);
        throw new Error(result.message || `서버 오류 (${response.status}): 일괄 삭제에 실패했습니다.`);
      }
      
      console.log(`✅ 일괄삭제 성공: ${result.deletedCount}개 삭제됨`);
      
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
      console.error('❌ 일괄 삭제 치명적 오류:', error);
      console.error('오류 상세:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // 네트워크 오류인지 확인
      const isNetworkError = error.name === 'TypeError' && error.message.includes('fetch');
      const errorMessage = isNetworkError 
        ? "네트워크 연결을 확인하고 다시 시도해주세요."
        : (error.message || "일괄 삭제 중 알 수 없는 오류가 발생했습니다.");
      
      toast({
        variant: "destructive",
        title: "❌ 일괄 삭제 실패",
        description: errorMessage,
      });
    }
  };

  // 체크박스 처리
  const handleTaskSelect = (taskId: number, checked: boolean) => {
    setSelectedTaskIds(prev => 
      checked 
        ? [...prev, taskId]
        : prev.filter(id => id !== taskId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTaskIds(checked ? filteredTasks.map(task => task.id) : []);
  };

  // 권한 확인
  const canEdit = (task: DailyTaskWithDetails) => {
    return currentUser && (
      currentUser.role === 'manager' || 
      currentUser.id === task.assignedTo || 
      currentUser.id === task.createdBy
    );
  };

  const canDelete = (task: DailyTaskWithDetails) => {
    return currentUser && (
      currentUser.role === 'manager' || 
      currentUser.id === task.createdBy
    );
  };

  // 필터링된 업무 목록
  const filteredTasks = showAllTasks 
    ? tasks.filter(task => {
        // 검색어가 없으면 모든 업무 표시
        if (!searchTerm) {
          const matchesStatus = statusFilter === "all" || task.status === statusFilter;
          const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
          return matchesStatus && matchesPriority;
        }
        
        // 검색어가 있으면 정확한 검색 수행
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      })
    : tasks.filter(task => {
        const today = new Date().toISOString().split('T')[0];
        // workDate나 dueDate가 있을 때만 오늘 업무로 판단 (createdAt 제외)
        const taskWorkDate = task.workDate;
        const taskDueDate = task.dueDate;
        
        let isToday = false;
        if (taskWorkDate) {
          const workDateOnly = new Date(taskWorkDate).toISOString().split('T')[0];
          isToday = workDateOnly === today;
        } else if (taskDueDate) {
          const dueDateOnly = new Date(taskDueDate).toISOString().split('T')[0];
          isToday = dueDateOnly === today;
        }
        
        // 검색어가 없으면 오늘 업무만 표시
        if (!searchTerm) {
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
          return isToday && matchesStatus && matchesPriority;
        }
        
        // 검색어가 있으면 정확한 검색 수행
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
        return isToday && matchesSearch && matchesStatus && matchesPriority;
      });

  // 상태별 통계 계산
  const statusStats = {
    scheduled: tasks.filter(t => t.status === 'scheduled').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    postponed: tasks.filter(t => t.status === 'postponed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
    total: tasks.length
  };

  // 상태별 필터링 함수
  const handleStatusFilter = (status: string) => {
    setStatusFilterActive(status);
    if (status === 'all') {
      setStatusFilter('all');
    } else {
      setStatusFilter(status);
    }
  };

  // 새로고침 트리거
  useEffect(() => {
    if (refreshTrigger) {
      handleManualRefresh();
    }
  }, [refreshTrigger]);

  // 🔥 pending 변경사항 저장 함수
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

  // 🔥 모든 변경사항 저장 함수
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

      // 모든 변경사항을 순차적으로 저장
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

      // 성공적으로 저장된 후 모든 상태 초기화
      setPendingChanges({});
      setHasUnsavedChanges({});

      // 즉시 캐시 무효화 및 리페치 (즉시 반영)
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

  // 전체 미저장 변경사항 개수 계산
  const totalUnsavedChanges = Object.keys(pendingChanges).length;

  return (
            <Card className="w-full task-list-container no-vertical-text bg-gray-200">
      <CardHeader className="pb-4">
        {/* 심플한 헤더 - 반응형 레이아웃 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 horizontal-text-force">
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <CardTitle className="text-base font-medium text-gray-900 whitespace-nowrap horizontal-text-force">
              업무 목록 <span className="text-sm font-normal text-gray-400 whitespace-nowrap horizontal-text-force">({filteredTasks.length})</span>
            </CardTitle>
            
            {/* 상태별 카운팅 아이콘 - 클릭 가능한 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* 전체 선택 체크박스 (전체 모드에서만) */}
              {showAllTasks && (
                <Checkbox
                  checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="mr-2"
                />
              )}
              
              <Button
                variant={statusFilterActive === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('all')}
                className="h-7 px-2 text-xs font-medium"
              >
                <List className="h-3 w-3 mr-1" />
                전체 {statusStats.total}
              </Button>
              
              <Button
                variant={statusFilterActive === 'scheduled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('scheduled')}
                className="h-7 px-2 text-xs font-medium"
              >
                <span className="text-lg text-blue-600 mr-1">●</span>
                예정 {statusStats.scheduled}
              </Button>
              
              <Button
                variant={statusFilterActive === 'in_progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('in_progress')}
                className="h-7 px-2 text-xs font-medium"
              >
                <span className="text-lg text-yellow-500 mr-1">●</span>
                진행 {statusStats.in_progress}
              </Button>
              
              <Button
                variant={statusFilterActive === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('completed')}
                className="h-7 px-2 text-xs font-medium"
              >
                <span className="text-lg text-green-600 mr-1">●</span>
                완료 {statusStats.completed}
              </Button>
              
              <Button
                variant={statusFilterActive === 'postponed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('postponed')}
                className="h-7 px-2 text-xs font-medium"
              >
                <span className="text-lg text-gray-500 mr-1">●</span>
                연기 {statusStats.postponed}
              </Button>
              
              <Button
                variant={statusFilterActive === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('cancelled')}
                className="h-7 px-2 text-xs font-medium"
              >
                <span className="text-lg text-red-600 mr-1">●</span>
                취소 {statusStats.cancelled}
              </Button>
            </div>
          </div>

          {/* 미니멀한 액션 영역 - 반응형 */}
          <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
            <Input
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-16 sm:w-20 h-7 text-xs border-gray-200 placeholder:text-gray-400 flex-shrink-0 horizontal-text-force"
            />
            
            {/* 간단한 필터 드롭다운 */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-14 sm:w-16 h-7 text-xs border-gray-200 flex-shrink-0 horizontal-text-force">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="horizontal-text-force">전체</SelectItem>
                <SelectItem value="scheduled" className="horizontal-text-force">예정</SelectItem>
                <SelectItem value="in_progress" className="horizontal-text-force">진행중</SelectItem>
                <SelectItem value="completed" className="horizontal-text-force">완료</SelectItem>
                <SelectItem value="cancelled" className="horizontal-text-force">취소</SelectItem>
                <SelectItem value="postponed" className="horizontal-text-force">연기</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleManualRefresh} 
              variant="ghost" 
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={onCreateTask} size="sm" className="h-7 px-2 sm:px-3 text-xs bg-gray-900 hover:bg-gray-800 whitespace-nowrap flex-shrink-0 horizontal-text-force">
              <Plus className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline horizontal-text-force">새 업무</span>
              <span className="sm:hidden horizontal-text-force">추가</span>
            </Button>

            {/* 일괄 작업 버튼 */}
            {(selectedTaskIds.length > 0 || totalUnsavedChanges > 0) && (
              <div className="flex items-center gap-3 ml-auto">
                {selectedTaskIds.length > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="destructive"
                    size="sm"
                    className="h-8 px-3 text-xs font-medium"
                  >
                    {selectedTaskIds.length} 선택삭제
                  </Button>
                )}
                
                {totalUnsavedChanges > 0 && (
                  <Button
                    onClick={handleSaveAllChanges}
                    variant="default"
                    size="sm"
                    className="h-8 px-3 text-xs font-medium bg-green-600 hover:bg-green-700"
                  >
                    {totalUnsavedChanges} 수정저장
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 필터가 적용된 경우에만 표시 */}
        {(statusFilter !== "all" || priorityFilter !== "all" || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            {statusFilter !== "all" && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded whitespace-nowrap flex-shrink-0">
                상태: {statusFilter === 'scheduled' ? '예정' : statusFilter === 'in_progress' ? '진행중' : statusFilter === 'completed' ? '완료' : statusFilter === 'postponed' ? '연기' : '취소'}
                <button onClick={() => setStatusFilter("all")} className="ml-1 text-blue-500">×</button>
              </span>
            )}
            {priorityFilter !== "all" && (
              <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded whitespace-nowrap flex-shrink-0">
                우선순위: {priorityFilter}
                <button onClick={() => setPriorityFilter("all")} className="ml-1 text-orange-500">×</button>
              </span>
            )}
            {searchTerm && (
              <span className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded whitespace-nowrap flex-shrink-0">
                검색: "{searchTerm}"
                <button onClick={() => setSearchTerm("")} className="ml-1 text-gray-500">×</button>
              </span>
          )}
        </div>
        )}

        {/* 일괄 작업 (선택된 항목이 있을 때만) */}
        {selectedTaskIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-shrink-0">
            <Checkbox
              checked={selectedTaskIds.length === filteredTasks.length}
              onCheckedChange={handleSelectAll}
            />
              <span className="text-sm text-gray-600 whitespace-nowrap">{selectedTaskIds.length}개 선택됨</span>
            </div>
            <Button
              onClick={handleBulkDelete}
              variant="outline"
              size="sm"
              className="h-8 text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap flex-shrink-0"
            >
              삭제
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
            <p className="text-gray-600">업무 목록을 불러오는 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">업무 목록 불러오기 실패</h3>
            <p className="text-gray-600 text-center mb-4">
              {error.message}
              <br />
              <span className="text-sm">서버가 실행 중인지 확인해주세요.</span>
            </p>
            <div className="flex gap-2">
              <Button onClick={handleManualRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
              <Button onClick={() => window.location.reload()} variant="default">
                페이지 새로고침
              </Button>
            </div>
          </div>
        )}

        {/* 업무 목록 */}
        {!isLoading && !error && (
          <>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {showAllTasks ? '업무가 없습니다' : '오늘 할 업무가 없습니다'}
                </h3>
                <p className="text-gray-500 mb-4">새로운 업무를 생성해보세요.</p>
                <Button onClick={onCreateTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  첫 번째 업무 만들기
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => {
                  // 🔥 pending 변경사항이 있으면 그 값을 표시, 없으면 원래 값 표시
                  const displayTask = {
                    ...task,
                    ...pendingChanges[task.id]
                  };
                  
                  // 🔥 변경사항이 있는 행은 빨간색으로 강조
                  const hasChanges = hasUnsavedChanges[task.id];

                  return (
                  <Card key={task.id} className={`border border-gray-200 hover:shadow-md transition-shadow ${hasChanges ? 'bg-red-50 border-l-4 border-l-red-400' : 'bg-white'}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        {/* 체크박스 (전체 모드에서만) */}
                        {showAllTasks && (
                          <Checkbox
                            checked={selectedTaskIds.includes(task.id)}
                            onCheckedChange={(checked) => handleTaskSelect(task.id, checked)}
                            className="mt-1 flex-shrink-0"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          {/* 첫 번째 줄: 반응형 레이아웃 */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3">
                            {/* 상단 그룹: 날짜, 상태, 우선순위 */}
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            {/* 1. 날짜 */}
                              <div className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap flex-shrink-0">
                              <Calendar className="h-4 w-4" />
                              {formatWorkDate(task.workDate || task.dueDate || '')}
                            </div>

                            {/* 2. 진행상태 - 드롭다운 선택 */}
                            <Select value={displayTask.status} onValueChange={(value) => handleStatusChange(task.id, value)}>
                              <SelectTrigger className={`h-6 px-2 text-xs ${getStatusConfig(displayTask.status).color} border-0 bg-transparent hover:bg-opacity-80 whitespace-nowrap flex-shrink-0 w-auto min-w-[70px] [&>svg]:hidden`}>
                                <div className="flex items-center gap-1">
                                  {React.createElement(getStatusConfig(displayTask.status).icon, { className: "h-3 w-3" })}
                                  <span>{getStatusConfig(displayTask.status).text}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="postponed">
                                  <div className="flex items-center gap-2">
                                    <Pause className="h-3 w-3" />
                                    연기
                                  </div>
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  <div className="flex items-center gap-2">
                                    <X className="h-3 w-3" />
                                    취소
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {/* 3. 긴급도 - 클릭 가능 */}
                            <Button
                              variant="ghost"
                              size="sm"
                                className={`h-6 px-2 text-xs ${getPriorityConfig(displayTask.priority).color} transition-colors cursor-pointer whitespace-nowrap flex-shrink-0`}
                              onClick={() => handlePriorityChange(task.id, displayTask.priority)}
                              title="클릭하여 우선순위 변경"
                            >
                              {getPriorityConfig(displayTask.priority).text}
                            </Button>
                            </div>

                            {/* 4. 업무제목 */}
                            <h3 className="font-semibold text-lg flex-1 min-w-0 break-words">{displayTask.title}</h3>

                            {/* 담당자 정보 */}
                            {task.assignedToUser && (
                              <div className="flex items-center gap-1 text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
                                <User className="h-4 w-4" />
                                {task.assignedToUser.name}
                              </div>
                            )}
                          </div>

                            {/* 원형 진행률 표시 */}
                          <div className="mb-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="relative cursor-pointer group"
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
                                        strokeWidth="3"
                                        className="text-gray-200"
                                      />
                                      <circle
                                        cx="20"
                                        cy="20"
                                        r="15"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
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
                                <div className="flex-1">
                                  <div className="text-sm text-gray-600">
                                    진행률 클릭으로 25% 단위 변경
                                  </div>
                              </div>
                            </div>
                          </div>

                          {/* 업무 설명 */}
                          {displayTask.description && (
                            <p className="text-gray-600 mb-3 text-sm break-words">{displayTask.description}</p>
                          )}
                        </div>

                        {/* 액션 버튼 */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canEdit(task) && (
                            <Button
                              onClick={() => onEditTask(task.id)}
                              variant="outline"
                              size="sm"
                              className="whitespace-nowrap"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {canDelete(task) && (
                            <Button
                              onClick={() => handleDelete(task.id, task.title)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 whitespace-nowrap"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 메모 */}
                      {task.memo && (
                        <>
                          <Separator className="my-3" />
                          <div className="bg-gray-50 p-3 rounded text-sm break-words">
                            <strong>메모:</strong> {task.memo}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
