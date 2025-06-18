import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
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
  Repeat,
  Settings,
  Pause,
  Clock,
  CheckCircle,
  X,
  List,
  ArrowLeft,
  Edit,
  ChevronLeft,
  ChevronRight,
  Info,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { DailyTaskWithDetails } from "../../../shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { TaskCreateModal } from "@/modules/task-management/components";
import { Header } from "@/components/layout/header";
import { FloatingShapes } from "@/components/ui/floating-shapes";
import React from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { TaskToScheduleModal } from "@/components/modals/task-to-schedule-modal";
import { TaskExcelUpload } from "@/components/task-excel-upload";
import { useLocation } from "wouter";
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

// 마감일용 날짜 포맷 함수
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    // 'MM/dd(요일)' 형식으로 반환
    return format(new Date(dateStr), 'MM/dd(EEE)', { locale: ko });
  } catch {
    return dateStr;
  }
};

// 새로운 2줄 날짜 포맷 함수
const formatDateForTable = (dateStr: string, task?: DailyTaskWithDetails) => {
  if (!dateStr) return { dateWithDay: '-', scheduledTime: '-', isWeekend: false };
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

// 시간 포맷 함수 추가
const formatTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return '-';
  return timeStr;
};

export default function TaskListAll() {
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

  const [monthFilter, setMonthFilter] = useState('all');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedTasksForSchedule, setSelectedTasksForSchedule] = useState<DailyTaskWithDetails[]>([]);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  
  // 🔥 수정 카운팅 시스템 상태 추가
  const [pendingChanges, setPendingChanges] = useState<{[key: number]: Partial<DailyTaskWithDetails>}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<{[key: number]: boolean}>({});
  const [isSaving, setIsSaving] = useState(false); // 저장 중 상태 추가

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

  // 설명서 표시 상태 추가
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const { lastMessage } = useWebSocket();
  const [location, setLocation] = useLocation();

  // URL 파라미터에서 상태 필터 가져오기
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam && statusParam !== 'all') {
      setStatusFilter(statusParam);
    }
  }, [location]);

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

  // 필터링된 업무목록 조회 (중앙집중식)
  const tasksData = getFilteredTasks({
    status: statusFilter === 'all' ? undefined : statusFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
    searchTerm: searchTerm || undefined
  });

  // WebSocket 메시지 처리 (실시간 업데이트)
  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const data = JSON.parse(lastMessage.data);
        console.log('📨 WebSocket 메시지 수신 (전체 목록):', data.type);
        
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
        console.error('WebSocket 메시지 파싱 오류:', error);
      }
    }
  }, [lastMessage, queryClient, toast]);

  // 데이터 로딩 상태 로깅
  useEffect(() => {
    console.log('🔍 업무목록 전체 - 데이터 상태:', {
      tasksDataLength: Array.isArray(tasksData) ? tasksData.length : 'not array',
      isLoading: isLoading,
      isArray: Array.isArray(tasksData)
    });
  }, [tasksData, isLoading]);

  // 에러 처리 - useTasks 훅에서 에러 처리는 내부적으로 처리됨
  // 필요시 추가 에러 처리 로직을 여기에 구현

  // 월 옵션 생성 함수
  const generateMonthOptions = () => {
    const options = [{ value: 'all', label: '전체 기간' }];
    const currentDate = new Date();
    
    // 지난 12개월과 향후 3개월
    for (let i = -12; i <= 3; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
      options.push({ value: yearMonth, label });
    }
    
    return options;
  };

  // 정렬 함수 추가
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 정렬 및 필터링
  const filteredAndSortedTasks = (Array.isArray(tasksData) ? tasksData : [])
    .filter(task => {
      // 월별 필터 검사 (간단하고 확실한 방식)
      const matchesMonth = !monthFilter || monthFilter === 'all' || (task.workDate && (() => {
        const workDate = task.workDate;
        if (!workDate) return false;
        
        // monthFilter가 "2025-06" 형식인 경우
        if (monthFilter.includes('-')) {
          // workDate에서 년-월 부분만 추출하여 비교
          let taskYearMonth = '';
          
          // "2025-06-18" 형식인 경우
          if (workDate.includes('-') && workDate.length >= 7) {
            const parts = workDate.split('-');
            if (parts.length >= 2) {
              taskYearMonth = `${parts[0]}-${parts[1].padStart(2, '0')}`;
            }
          }
          // "25/06/18" 형식인 경우  
          else if (workDate.includes('/')) {
            const parts = workDate.split('/');
            if (parts.length >= 2) {
              const taskYear = parts[0].length === 2 ? `20${parts[0]}` : parts[0];
              const taskMonth = parts[1].padStart(2, '0');
              taskYearMonth = `${taskYear}-${taskMonth}`;
            }
          }
          
          console.log('🔍 월별 필터 디버깅:', {
            taskTitle: task.title?.substring(0, 20),
            workDate: workDate,
            taskYearMonth: taskYearMonth,
            monthFilter: monthFilter,
            matches: taskYearMonth === monthFilter
          });
          
          return taskYearMonth === monthFilter;
        }
        
        // monthFilter가 빈 문자열이거나 특수 값이면 모든 업무 표시
        return true;
      })());
      // 날짜 필터 검사

      
      // 검색어가 없으면 모든 업무 표시 (월별/날짜 필터는 적용)
      if (!searchTerm) {
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
        return matchesStatus && matchesPriority && matchesMonth;
      }
      
      // 검색어가 있으면 정확한 검색 수행
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.targetPlace?.toLowerCase().includes(searchLower) ||
        (task.workDate && (formatDateForTable(task.workDate, task).dateOnly + formatDateForTable(task.workDate, task).dayOnly).toLowerCase().includes(searchLower)) ||
        (task.dueDate && (formatDateForTable(task.dueDate, task).dateOnly + formatDateForTable(task.dueDate, task).dayOnly).toLowerCase().includes(searchLower));
      
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesMonth;
    })
    .sort((a, b) => {
      // 🎯 후속업무 우선 정렬: 후속업무는 항상 최상단에 표시
      const aIsFollowUp = a.isFollowUpTask || a.category === '확인요청' || a.title?.includes('[확인요청]');
      const bIsFollowUp = b.isFollowUpTask || b.category === '확인요청' || b.title?.includes('[확인요청]');
      
      if (aIsFollowUp && !bIsFollowUp) return -1; // a가 후속업무면 위로
      if (!aIsFollowUp && bIsFollowUp) return 1;  // b가 후속업무면 위로
      
      // 둘 다 후속업무이거나 둘 다 일반업무인 경우 기존 정렬 로직 적용
      let aValue: any;
      let bValue: any;
      
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
          const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'assignedTo':
          aValue = a.assignedUser?.name || '';
          bValue = b.assignedUser?.name || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = 0;
          bValue = 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // 🔍 필터링 결과 디버깅
  console.log('🔍 업무목록 전체 - 필터링 결과:', {
    originalTasksLength: Array.isArray(tasksData) ? tasksData.length : 'not array',
    filteredTasksLength: filteredAndSortedTasks.length,
    searchTerm: searchTerm,
    statusFilter: statusFilter,
    priorityFilter: priorityFilter,
    monthFilter: monthFilter,
    sampleTasks: Array.isArray(tasksData) ? tasksData.slice(0, 3).map(t => ({ 
      title: t.title, 
      status: t.status, 
      priority: t.priority,
      workDate: t.workDate,
      monthMatch: !monthFilter || monthFilter === 'all' || (t.workDate && t.workDate.startsWith(monthFilter))
    })) : 'not array'
    });

  const savePendingChange = (taskId: number, field: string, newValue: any) => {
    console.log('💾 Pending 변경사항 저장:', { taskId, field, newValue });
    
    setPendingChanges(prev => {
      const updated = {
        ...prev,
        [taskId]: {
          ...prev[taskId],
          [field]: newValue
        }
      };
      console.log('📝 Updated pendingChanges:', updated);
      return updated;
    });
    
    setHasUnsavedChanges(prev => {
      const updated = {
        ...prev,
        [taskId]: true
      };
      console.log('🔔 Updated hasUnsavedChanges:', updated);
      return updated;
    });
  };

  // 전체 수정사항 일괄 저장 함수
  const handleSaveAllChanges = async () => {
    console.log('🚀 일괄 저장 시작 - pendingChanges:', pendingChanges);
    
    const taskIdsWithChanges = Object.keys(pendingChanges).map(id => parseInt(id));
    
    console.log('📋 저장할 업무 ID들:', taskIdsWithChanges);
    
    if (taskIdsWithChanges.length === 0) {
      console.log('❌ 저장할 변경사항 없음 - pendingChanges가 비어있음');
      toast({
        title: "💡 저장할 변경사항 없음",
        description: "수정된 항목이 없습니다.",
      });
      return;
    }

    // 🛡️ 저장 중 상태 설정 (다른 이벤트로 인한 리셋 방지)
    setIsSaving(true);

    try {
      let successCount = 0;

      // 모든 변경사항을 순차적으로 저장
      for (const taskId of taskIdsWithChanges) {
        const changes = pendingChanges[taskId];
        if (!changes) continue;
      
        console.log(`💾 업무 ${taskId} 저장 시도:`, changes);
        
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(changes)
        });
        
        console.log(`📡 업무 ${taskId} 서버 응답:`, response.status, response.statusText);

        if (response.ok) {
          successCount++;
        }
      }

      console.log('🔄 서버 저장 완료 - 캐시 무효화 및 새로고침 시작');
      
      // 🎯 핵심 수정: 서버 데이터 동기화를 먼저 완료
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.refetchQueries({ queryKey: ['tasks'] });
      
      // 서버 응답이 완전히 처리되고 화면이 업데이트되도록 충분한 딜레이
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 🛡️ 저장 중 상태가 여전히 true인지 확인 (다른 저장 프로세스와의 충돌 방지)
      if (!isSaving) {
        console.log('⚠️ 저장 상태가 이미 해제됨 - 로컬 상태 초기화 건너뜀');
        return;
      }
      
      console.log('🧹 서버 데이터 동기화 완료 - 로컬 상태 초기화');
      
      // 🎯 서버 데이터 동기화 완료 후 로컬 상태 초기화
      setPendingChanges({});
      setHasUnsavedChanges({});
      
      toast({
        title: "✅ 일괄 저장 완료",
        description: `${successCount}개 업무가 저장되었습니다.`,
      });
      
      console.log('✅ 일괄 저장 프로세스 완전 완료');
    } catch (error: any) {
      console.error('❌ 일괄 저장 실패:', error);
      toast({
        variant: "destructive",
        title: "❌ 일괄 저장 실패",
        description: error.message || "저장 중 오류가 발생했습니다.",
      });
    } finally {
      // 🛡️ 저장 완료 후 상태 해제
      setIsSaving(false);
    }
  };

  // 상태 변경 함수 수정 - 즉시 저장하지 않고 pending에 저장
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

  // 우선순위 변경도 pending으로 변경
  const handlePriorityChange = async (taskId: number, currentPriority: string) => {
    const priorityOptions = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorityOptions.indexOf(currentPriority);
    const nextPriority = priorityOptions[(currentIndex + 1) % priorityOptions.length];
    
    savePendingChange(taskId, 'priority', nextPriority);
  };
      
  // 진행률 변경도 pending으로 변경
  // 진행률 기반 상태 자동변환 함수
  const getStatusFromProgress = (progress: number): string => {
    if (progress === 0) return 'scheduled';
    if (progress >= 1 && progress <= 99) return 'in_progress';
    if (progress === 100) return 'completed';
    return 'scheduled'; // 기본값
  };

  const handleProgressChange = async (taskId: number, currentProgress: number) => {
    const progressOptions = [0, 25, 50, 75, 100];
    const currentIndex = progressOptions.indexOf(currentProgress);
    const nextProgress = progressOptions[(currentIndex + 1) % progressOptions.length];
    
    // 진행률에 따른 상태 자동 변환
    const newStatus = getStatusFromProgress(nextProgress);
    
    savePendingChange(taskId, 'progress', nextProgress);
    savePendingChange(taskId, 'status', newStatus);
  };

  // 상태 아이콘과 색상 함수
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { emoji: '●', emojiColor: 'text-green-600', color: 'bg-green-100 text-green-800 hover:bg-green-200', text: '완료' };
      case 'in_progress':
        return { emoji: '●', emojiColor: 'text-yellow-500', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', text: '진행' };
      case 'postponed':
        return { emoji: '●', emojiColor: 'text-gray-500', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', text: '연기' };
      case 'cancelled':
        return { emoji: '●', emojiColor: 'text-red-600', color: 'bg-red-100 text-red-800 hover:bg-red-200', text: '취소' };
      default:
        return { emoji: '●', emojiColor: 'text-blue-600', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200', text: '예정' };
    }
  };

  // 우선순위 색상 함수
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

  // 개별 삭제
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

      // 즉시 캐시 무효화 및 리페치 (즉시 반영)
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['tasks'] });
      
      // 전역 이벤트 발생 (주간보고서 실시간 업데이트용)
      window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { id: taskId, title: taskTitle } }));
      
      toast({
        title: "✅ 업무 삭제",
        description: `"${taskTitle}" 업무가 삭제되었습니다.`,
      });
    } catch (error: any) {
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
      // 즉시 캐시 무효화 및 리페치 (즉시 반영)
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['tasks'] });
      
      // 전역 이벤트 발생 (주간보고서 실시간 업데이트용)
      window.dispatchEvent(new CustomEvent('tasksBulkDeleted', { 
        detail: { deletedIds: selectedTaskIds, count: result.deletedCount } 
      }));
      
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

  // 체크박스 처리
  const handleTaskSelect = (taskId: number, checked: boolean) => {
    setSelectedTaskIds(prev => 
      checked 
        ? [...prev, taskId]
        : prev.filter(id => id !== taskId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTaskIds(checked ? filteredAndSortedTasks.map(task => task.id) : []);
  };

  // 업무 생성/수정 모달
  const handleCreateTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (taskId: number) => {
    const taskToEdit = (Array.isArray(tasksData) ? tasksData : []).find(task => task.id === taskId);
    if (taskToEdit) {
      setEditingTask(taskId);
      setIsTaskModalOpen(true);
    } else {
      toast({
        title: "오류",
        description: "수정할 업무를 찾을 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  // 새로고침
  const handleRefresh = () => {
    // 중앙집중식 업무목록 새로고침
    invalidateAndRefetch();
    setSelectedTaskIds([]);
    toast({
      title: "🔄 새로고침",
      description: "업무 목록을 다시 불러왔습니다.",
    });
  };

  const handleBackToDashboard = () => {
    setLocation('/dashboard');
  };

  // 엑셀 업로드 완료 핸들러
  const handleExcelUploadComplete = (result: any) => {
    if (result.success) {
      toast({
        title: "업무 일괄등록 완료",
        description: result.message,
      });
      invalidateAndRefetch(); // 업무 목록 새로고침
      setIsExcelUploadOpen(false);
    } else {
      toast({
        title: "업무 일괄등록 실패",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  // 스케줄 모달 닫기 핸들러
  const handleCloseScheduleModal = () => {
    setIsScheduleModalOpen(false);
    setSelectedTasksForSchedule([]);
  };

  // 스케줄 변환 성공 핸들러
  const handleScheduleConversionSuccess = () => {
    toast({
      title: "일정 변환 완료",
      description: "선택한 업무가 일정으로 변환되었습니다.",
    });
    setSelectedTaskIds([]);
    invalidateAndRefetch();
  };

  // 전체 미저장 변경사항 개수 계산
  const totalUnsavedChanges = Object.keys(pendingChanges).length;

  // 🆕 페이지네이션 로직 추가
  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageTasks = filteredAndSortedTasks.slice(startIndex, endIndex);

  // 🆕 페이지 변경 함수들
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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

  // 🆕 필터 변경시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter]);

  // 페이지당 표시 개수 변경시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // 🔥 다른 페이지에서의 업무 변경사항 실시간 반영을 위한 전역 이벤트 리스너
  useEffect(() => {
    const handleTaskUpdate = (event?: CustomEvent) => {
      // 🛡️ 저장 중일 때는 자동 새로고침 방지
      if (isSaving) {
        console.log('🛡️ 저장 중이므로 자동 새로고침 생략');
        return;
      }
      
      // 🛡️ 오늘할일 카드에서 발생한 이벤트는 무시 (중복 새로고침 방지)
      if (event?.detail?.source === 'today-schedule-card' && event?.detail?.preventAutoRefresh) {
        console.log('🛡️ 오늘할일 카드 저장 이벤트 - 자동 새로고침 건너뜀');
        return;
      }
      
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
  }, [invalidateAndRefetch, isSaving]);

  return (
    <div className="min-h-screen gradient-bg relative">
      <FloatingShapes />
      
      <div className="relative z-10">
        <Header 
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="w-full glass-card bg-gray-200">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-2xl font-bold flex items-center">
                  <CheckSquare className="w-6 h-6 mr-3 text-purple-600" />
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
                    {statusFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-3">
                        {statusConfig[statusFilter as keyof typeof statusConfig]?.label || statusFilter} 필터 적용됨
                      </Badge>
                    )}
                </CardTitle>
                <div className="flex items-center gap-3">
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
                {/* 월별 필터 (심플한 달력 아이콘 1개) */}
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
                
                {/* 상태 드롭다운 필터 */}
                <Select value={statusFilter} onValueChange={(value) => {
                  console.log(`🔄 상태 필터 변경: ${statusFilter} → ${value}`);
                  console.log(`📊 현재 업무 목록:`, (Array.isArray(tasksData) ? tasksData : []).map(t => ({ title: t.title, status: t.status })));
                  setStatusFilter(value);
                }}>
                  <SelectTrigger className="w-36 h-8 px-2 py-1 text-xs font-medium">
                    <div className="flex items-center gap-1">
                      {statusFilter === 'all' ? (
                        <>
                    <List className="h-3 w-3" />
                          <span>상태 {(Array.isArray(tasksData) ? tasksData : []).length}</span>
                        </>
                      ) : statusFilter === 'scheduled' ? (
                        <>
                          <span className="text-lg text-blue-600">●</span>
                          <span>예정 {(Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'scheduled').length}</span>
                        </>
                      ) : statusFilter === 'in_progress' ? (
                        <>
                          <span className="text-lg text-yellow-500">●</span>
                          <span>진행 {(Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'in_progress').length}</span>
                        </>
                      ) : statusFilter === 'completed' ? (
                        <>
                          <span className="text-lg text-green-600">●</span>
                          <span>완료 {(Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'completed').length}</span>
                        </>
                      ) : statusFilter === 'postponed' ? (
                        <>
                          <span className="text-lg text-gray-500">●</span>
                          <span>연기 {(Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'postponed').length}</span>
                        </>
                      ) : statusFilter === 'cancelled' ? (
                        <>
                          <span className="text-lg text-red-600">●</span>
                          <span>취소 {(Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'cancelled').length}</span>
                        </>
                      ) : null}
                </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      <div className="flex items-center gap-2">
                        <List className="h-3 w-3" />
                        상태 ({(Array.isArray(tasksData) ? tasksData : []).length})
                      </div>
                    </SelectItem>
                    <SelectItem value="scheduled" className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-blue-600">●</span>
                        예정 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'scheduled').length})
                      </div>
                    </SelectItem>
                    <SelectItem value="in_progress" className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-yellow-500">●</span>
                        진행 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'in_progress').length})
                      </div>
                    </SelectItem>
                    <SelectItem value="completed" className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-green-600">●</span>
                        완료 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'completed').length})
                      </div>
                    </SelectItem>
                    <SelectItem value="postponed" className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-gray-500">●</span>
                        연기 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'postponed').length})
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelled" className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-red-600">●</span>
                        취소 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'cancelled').length})
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-36 h-8 px-2 py-1 text-xs font-medium">
                    <div className="flex items-center gap-1">
                      {priorityFilter === 'all' ? (
                        <span>우선순위 ({(Array.isArray(tasksData) ? tasksData : []).length})</span>
                      ) : priorityFilter === 'low' ? (
                        <span>낮음 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.priority === 'low').length})</span>
                      ) : priorityFilter === 'medium' ? (
                        <span>보통 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.priority === 'medium').length})</span>
                      ) : priorityFilter === 'high' ? (
                        <span>높음 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.priority === 'high').length})</span>
                      ) : priorityFilter === 'urgent' ? (
                        <span>긴급 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.priority === 'urgent').length})</span>
                      ) : null}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">우선순위 ({(Array.isArray(tasksData) ? tasksData : []).length})</SelectItem>
                    <SelectItem value="low" className="text-xs">낮음 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.priority === 'low').length})</SelectItem>
                    <SelectItem value="medium" className="text-xs">보통 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.priority === 'medium').length})</SelectItem>
                    <SelectItem value="high" className="text-xs">높음 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.priority === 'high').length})</SelectItem>
                    <SelectItem value="urgent" className="text-xs">긴급 ({(Array.isArray(tasksData) ? tasksData : []).filter(t => t.priority === 'urgent').length})</SelectItem>
                  </SelectContent>
                </Select>

                {/* 페이지당 표시 개수 선택 */}
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
                  총 {filteredAndSortedTasks.length}개 업무 ({currentPage}/{totalPages} 페이지)
                </div>

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
                        disabled={isSaving}
                        className="h-8 px-3 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-400"
                    >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            저장중...
                          </>
                        ) : (
                          `${totalUnsavedChanges} 수정저장`
                        )}
                    </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-3" />
                  <p className="text-gray-600">업무 목록을 불러오는 중...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-red-600 mb-4">업무 목록 불러오기에 실패했습니다.</p>
                  <Button onClick={handleRefresh} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    다시 시도
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12 min-w-[48px]">
                          <Checkbox
                            checked={selectedTaskIds.length === filteredAndSortedTasks.length && filteredAndSortedTasks.length > 0}
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
                        <TableHead className="min-w-[120px]">
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
                        <TableHead className="min-w-[75px]">
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
                        <TableHead className="min-w-[100px]">
                          <span className="whitespace-nowrap">진행률</span>
                        </TableHead>
                        <TableHead className="min-w-[70px]">
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
                          <span className="whitespace-nowrap">업무연계</span>
                        </TableHead>
                        <TableHead className="w-32 min-w-[128px]">
                          <span className="whitespace-nowrap">수정/작업</span>
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
                          
                          // 🔥 pending 변경사항이 있으면 그 값을 표시, 없으면 원래 값 표시
                          const displayTask = {
                            ...task,
                            ...pendingChanges[task.id]
                          };
                          
                          // 🔥 변경사항이 있는 행은 빨간색으로 강조
                          const hasChanges = hasUnsavedChanges[task.id];
                          
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
                              {/* 클릭 가능한 우선순위 Badge */}
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
                              {/* 클릭 가능한 진행률 */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs font-medium text-gray-700 hover:bg-gray-100 whitespace-nowrap flex-shrink-0"
                                  onClick={() => handleProgressChange(task.id, displayTask.progress || 0)}
                                  title="클릭하여 진행률 변경 (25% 단위)"
                                >
                                  {displayTask.progress || 0}%
                                </Button>
                                <div className="w-16">
                                  <Progress value={displayTask.progress || 0} className="h-2" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {/* 상태 드롭다운 선택 - 연기/취소만 선택 가능 */}
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
                                  // 🔥 후속업무인 경우 원담당자 정보 표시
                                  if (task.isFollowUpTask && task.parentTaskId) {
                                    // 원본 업무 찾기
                                    const parentTask = allTasks.find(t => t.id === task.parentTaskId);
                                    const originalAssignee = parentTask?.assignedTo || 'unknown';
                                    const followUpAssignee = task.assignedTo;
                                    
                                    // 후속업무 확인 상태 체크
                                    const isFollowUpConfirmed = task.status === 'completed';
                                    const isFollowUpRejected = task.status === 'cancelled';
                                    
                                    return (
                                      <>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          {originalAssignee}
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
                                          {followUpAssignee}
                                        </span>
                                      </>
                                    );
                                  }
                                  
                                  // 🔥 일반업무인 경우 후속담당자 필드 확인
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
                                          {task.assignedTo}
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
                                          {followUpAssignee}
                                        </span>
                                      </>
                                    );
                                  } else if (task.assignedTo) {
                                    return (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {task.assignedTo}
                                      </span>
                                    );
                                  } else if (followUpAssignee) {
                                    return (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {followUpAssignee}
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
                  
                  {/* 🆕 페이지네이션 컨트롤 추가 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
                      <div className="flex items-center text-sm text-gray-700">
                        <span>
                          {startIndex + 1}-{Math.min(endIndex, filteredAndSortedTasks.length)} / {filteredAndSortedTasks.length}개 업무
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
          </Card>
        </main>
      </div>
      
      {isTaskModalOpen && (
        <TaskCreateModal
          isOpen={isTaskModalOpen}
          onClose={handleCloseTaskModal}
          task={editingTask ? tasksData.find(task => task.id === editingTask) : undefined}
        />
      )}

      {isScheduleModalOpen && (
        <TaskToScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={handleCloseScheduleModal}
          selectedTasks={tasksData.filter(task => selectedTaskIds.includes(task.id))}
          onSuccess={handleScheduleConversionSuccess}
        />
      )}

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
    </div>
  );
} 
