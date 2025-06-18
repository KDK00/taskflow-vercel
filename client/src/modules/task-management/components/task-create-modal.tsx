import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, X, Repeat, Calendar, CheckCircle, AlertCircle, Send, Users, Clock, Minus, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ko } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FollowUpAssigneeSelector } from './follow-up-assignee-selector';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  task?: any; // 업무 수정용
  onTaskCreated?: () => void; // 업무 생성 완료 콜백
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  createdBy?: string;
  dueDate?: string;
  targetPlace?: string;
  contractType?: string;
  category?: string;
  followUpAssigneeGeneral?: string;
  followUpAssigneeContract?: string;
  followUpMemo?: string;
  createdAt?: string;
}

interface FollowUpTask {
  id: number;
  title: string;
  description?: string;
  assignedTo: string;
  assignedUser: { name: string };
  followUpType: 'general' | 'contract';
  followUpMemo?: string;
}

interface TaskTransferConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  createdTask: Task | null;
  followUpTasks: FollowUpTask[];
  onConfirm: () => void;
}

// 업무 카테고리와 우선순위
const taskCategories = ["경영지원", "계약관리", "신규계약", "계약해지"];
const priorities = [
  { value: "low", label: "낮음", color: "bg-gray-100 text-gray-600" },
  { value: "medium", label: "보통", color: "bg-blue-100 text-blue-600" },
  { value: "high", label: "높음", color: "bg-orange-100 text-orange-600" },
  { value: "urgent", label: "긴급", color: "bg-red-100 text-red-600" }
];

// 반복일정 설정
const recurringTypes = [
  { value: "daily", label: "매일" },
  { value: "weekly", label: "매주" },
  { value: "monthly", label: "매월" },
  { value: "yearly", label: "매년" },
  { value: "weekdays", label: "평일만" },
  { value: "custom", label: "사용자 정의" }
];

const weekDays = [
  { value: "monday", label: "월", short: "월" },
  { value: "tuesday", label: "화", short: "화" },
  { value: "wednesday", label: "수", short: "수" },
  { value: "thursday", label: "목", short: "목" },
  { value: "friday", label: "금", short: "금" },
  { value: "saturday", label: "토", short: "토", style: "text-blue-600 font-bold" },
  { value: "sunday", label: "일", short: "일", style: "text-red-600 font-bold" }
];

export function TaskCreateModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  task, 
  onTaskCreated 
}: TaskCreateModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // 최소화 상태 관리
  const [isMinimized, setIsMinimized] = useState(false);
  
  // useRef로 안정화된 참조 관리
  const isLoadingRef = useRef(false);
  const formDataRef = useRef({
    title: "",
    description: "",
    startDate: "", // 사용자 입력값만 사용
    endDate: "",
    startTime: "09:00",
    endTime: "18:00",
    allDay: false,
    category: "경영지원",
    priority: "medium",
    assignedTo: user?.id || "admin",
    status: "scheduled",
    progress: 0,
    targetPlace: "",
    // 반복일정 관련 필드
    isRecurring: false,
    recurringType: "weekly",
    recurringInterval: 1,
    recurringDays: [] as string[],
    recurringEndDate: "",
    recurringCount: 1,
    isIndefinite: false, // 무기한 반복 여부
    // 후속담당자 필드 (경영일반/계약업무 구분 없이 통합)
    followUpAssignee: null as string | null,
    followUpMemo: "", // 후속담당자에게 전달할 메모
  });

  // 상태 관리
  const [formData, setFormData] = useState(formDataRef.current);
  const [loading, setLoading] = useState(false);
  const [showTransferConfirmation, setShowTransferConfirmation] = useState(false);
  const [createdTask, setCreatedTask] = useState<Task | null>(null);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);

  // 사용자 목록 조회 (의존성 최소화)
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/users", { credentials: "include" });
        if (!response.ok) {
          // 서버 연결 문제시 기본 사용자 목록 반환
          console.warn("사용자 목록 조회 실패, 기본 사용자 목록 사용");
          return [
            { id: "admin", name: "개발자(김동규)", username: "admin", role: "developer" },
            { id: "nara0", name: "관리자", username: "nara0", role: "manager" },
            { id: "nara1", name: "관리자", username: "nara1", role: "manager" },
            { id: "nara2", name: "직원", username: "nara2", role: "employee" },
            { id: "nara3", name: "직원", username: "nara3", role: "employee" },
            { id: "nara4", name: "직원", username: "nara4", role: "employee" }
          ];
        }
        const data = await response.json();
        const userList = Array.isArray(data) ? data : (data.users || []);
        return userList.filter(u => u && u.id && u.name);
      } catch (error) {
        console.error("사용자 목록 조회 에러:", error);
        // 네트워크 오류시 기본 사용자 목록 반환
        return [
          { id: "admin", name: "개발자(김동규)", username: "admin", role: "developer" },
          { id: "nara0", name: "관리자", username: "nara0", role: "manager" },
          { id: "nara1", name: "관리자", username: "nara1", role: "manager" },
          { id: "nara2", name: "직원", username: "nara2", role: "employee" },
          { id: "nara3", name: "직원", username: "nara3", role: "employee" },
          { id: "nara4", name: "직원", username: "nara4", role: "employee" }
        ];
      }
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
    cacheTime: 10 * 60 * 1000, // 10분간 보관
    retry: false, // 재시도 비활성화
  });

  // 폼 데이터 업데이트 함수 (useCallback으로 안정화)
  const updateFormData = useCallback((updates: Partial<typeof formData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      formDataRef.current = newData;
      return newData;
    });
  }, []);

  // 선택된 날짜 자동 설정 제거 - 사용자 입력값만 사용

  // 업무 수정 모드일 때 데이터 로드
  useEffect(() => {
    console.log('🔍 TaskCreateModal - task prop 확인:', task);
    console.log('🔍 TaskCreateModal - task?.id:', task?.id);
    
    if (task) {
      console.log('📝 TaskCreateModal - 수정 모드 데이터 로드:', task);
      
      const formatDate = (dateString: string) => {
        if (!dateString) return ""; // 기본값 제거
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      const formatTime = (dateString: string) => {
        if (!dateString) return "09:00";
        const date = new Date(dateString);
        return date.toTimeString().split(' ')[0].substring(0, 5);
      };

      const newFormData = {
        title: task.title || "",
        description: task.description || "",
        category: task.category || "경영지원",
        priority: task.priority || "medium",
        assignedTo: task.assignedTo || user?.id || "admin",
        startDate: formatDate(task.workDate || task.startDate), // workDate 우선 사용
        endDate: formatDate(task.dueDate),
        startTime: formatTime(task.workDate || task.startDate), // workDate 우선 사용
        endTime: formatTime(task.dueDate),
        allDay: task.allDay || false,
        status: task.status || "scheduled",
        progress: task.progress || 0,
        targetPlace: task.targetPlace || "",
        isRecurring: task.isRecurring || false,
        recurringType: task.recurringType || "weekly",
        recurringInterval: task.recurringInterval || 1,
        recurringDays: task.recurringDays || [],
        recurringEndDate: task.recurringEndDate || "",
        recurringCount: task.recurringCount || 1,
        isIndefinite: task.isIndefinite !== false,
        followUpAssignee: task.followUpAssignee || task.followUpAssigneeGeneral || task.followUpAssigneeContract || null,
        followUpMemo: task.followUpMemo || "",
      };
      
      console.log('🔍 TaskCreateModal - 후속담당자 필드 확인:', {
        followUpAssignee: task.followUpAssignee,
        followUpAssigneeGeneral: task.followUpAssigneeGeneral,
        followUpAssigneeContract: task.followUpAssigneeContract,
        최종선택값: newFormData.followUpAssignee
      });
      console.log('📝 TaskCreateModal - 설정될 폼 데이터:', newFormData);
      setFormData(newFormData);
    }
  }, [task, user?.id]);

  // 모달 닫기 처리
  const handleClose = useCallback(() => {
    if (loading) return;
    setIsMinimized(false);
    onClose();
  }, [loading, onClose]);

  // 최소화 토글
  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
  }, [isMinimized]);

  // 업무 생성/수정 처리
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const url = task?.id ? `/api/tasks/${task.id}` : "/api/tasks";
      const method = task?.id ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `업무 ${task?.id ? '수정' : '생성'}에 실패했습니다.`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // 즉시 캐시 업데이트 - 새로운 업무를 캐시에 추가
      queryClient.setQueryData(["tasks"], (oldData: any) => {
        if (oldData && Array.isArray(oldData)) {
          return task?.id 
            ? oldData.map((t: any) => t.id === task.id ? data.task : t)
            : [data.task, ...oldData];
        }
        return [data.task];
      });
      
      // 캐시 무효화 및 리페치
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      // 전역 이벤트 발생 (주간보고서 실시간 업데이트용)
      if (task?.id) {
        window.dispatchEvent(new CustomEvent('taskUpdated', { detail: data.task }));
      } else {
        window.dispatchEvent(new CustomEvent('taskCreated', { detail: data.task }));
      }
      
      toast({
        title: task?.id ? "업무 수정 완료" : "업무 생성 완료",
        description: `"${formData.title}" ${task?.id ? '수정이' : '생성이'} 완료되었습니다.`,
      });

      // 업무 수정의 경우 서버에서 반환된 최신 데이터로 폼 업데이트
      if (task?.id && data.task) {
        const updatedTask = data.task;
        const newFormData = {
          title: updatedTask.title || "",
          description: updatedTask.description || "",
          category: updatedTask.category || "경영지원",
          priority: updatedTask.priority || "medium",
          assignedTo: updatedTask.assignedTo || user?.id || "admin",
          startDate: updatedTask.workDate ? updatedTask.workDate.split('T')[0] : "",
          endDate: updatedTask.dueDate ? updatedTask.dueDate.split('T')[0] : "",
          startTime: updatedTask.startTime || "09:00",
          endTime: updatedTask.endTime || "18:00",
          allDay: updatedTask.allDay || false,
          status: updatedTask.status || "scheduled",
          progress: updatedTask.progress || 0,
          targetPlace: updatedTask.targetPlace || "",
          isRecurring: updatedTask.isRecurring || false,
          recurringType: updatedTask.recurringType || "weekly",
          recurringInterval: updatedTask.recurringInterval || 1,
          recurringDays: updatedTask.recurringDays || [],
          recurringEndDate: updatedTask.recurringEndDate || "",
          recurringCount: updatedTask.recurringCount || 1,
          isIndefinite: updatedTask.isIndefinite !== false,
          followUpAssignee: updatedTask.followUpAssignee || updatedTask.followUpAssigneeGeneral || updatedTask.followUpAssigneeContract || null,
          followUpMemo: updatedTask.followUpMemo || "",
        };
        
        console.log('🔄 업무 수정 완료 - 폼 데이터 업데이트:', {
          기존: formData.followUpAssignee,
          서버응답: updatedTask.followUpAssignee,
          최종: newFormData.followUpAssignee
        });
        
        setFormData(newFormData);
      }

      // 후속담당자가 있으면 전달 확인 모달 표시
      if (data.followUpTasks && data.followUpTasks.length > 0) {
        setCreatedTask(data.task);
        setFollowUpTasks(data.followUpTasks);
        setShowTransferConfirmation(true);
      } else {
        // 업무 생성/수정 모두 성공 토스트 표시 후 onTaskCreated 호출
        toast({
          title: task?.id ? "✅ 업무 수정 완료" : "✅ 업무 생성 완료",
          description: task?.id ? "업무가 성공적으로 수정되었습니다." : "새로운 업무가 생성되었습니다.",
          duration: 3000,
        });
        
        // 업무 생성의 경우 모달 자동 닫기, 수정의 경우는 잠시 열어둔 후 닫기
        if (!task?.id) {
          handleClose();
          if (onTaskCreated) onTaskCreated();
        } else {
          // 업무 수정의 경우 1초 후 모달 닫기
          setTimeout(() => {
            handleClose();
            if (onTaskCreated) onTaskCreated();
          }, 1000);
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: task?.id ? "업무 수정 실패" : "업무 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    // 필수 필드 검증
    if (!formData.title.trim()) {
      toast({
        title: "입력 오류",
        description: "업무 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 신규계약, 계약해지의 경우 후속담당자 필수
    if ((formData.category === "신규계약" || formData.category === "계약해지") && !formData.followUpAssignee) {
      toast({
        title: "입력 오류",
        description: `${formData.category} 업무는 후속담당자 지정이 필수입니다.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 날짜/시간 조합
      const startDateTime = formData.allDay 
        ? formData.startDate 
        : `${formData.startDate}T${formData.startTime}:00`;
      
      const endDateTime = formData.endDate 
        ? (formData.allDay 
            ? formData.endDate 
            : `${formData.endDate}T${formData.endTime}:00`)
        : null;

      // 사용자가 입력한 날짜를 그대로 사용 (변환 없이)
      console.log('📅 클라이언트에서 전송할 날짜 데이터:', {
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime
      });

      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        assignedTo: formData.assignedTo,
        status: formData.status,
        progress: formData.progress,
        targetPlace: formData.targetPlace.trim(),
        startDate: formData.startDate, // 사용자 입력값 그대로 전달
        dueDate: formData.endDate, // 사용자 입력값 그대로 전달
        allDay: formData.allDay,
        // 시작시간과 마감시간 별도 필드로 추가
        startTime: formData.startTime,
        endTime: formData.endTime,
        workDate: formData.startDate, // 사용자 입력값 그대로 전달
        // 반복일정 설정
        isRecurring: formData.isRecurring,
        recurringType: formData.isRecurring ? formData.recurringType : null,
        recurringInterval: formData.isRecurring ? formData.recurringInterval : null,
        recurringDays: formData.isRecurring && formData.recurringType === "custom" ? formData.recurringDays : null,
        recurringEndDate: formData.isRecurring && formData.recurringEndDate ? formData.recurringEndDate : null,
        recurringCount: formData.isRecurring ? formData.recurringCount : null,
        isIndefinite: formData.isRecurring ? formData.isIndefinite : null,
        // 후속담당자 (통합)
        followUpAssignee: formData.followUpAssignee,
        followUpMemo: formData.followUpMemo.trim(),
      };

      await createTaskMutation.mutateAsync(taskData);
    } catch (error) {
      console.error("업무 생성/수정 오류:", error);
    }
  };

  // 반복 요일 토글
  const handleRecurringDayToggle = (day: string) => {
    const currentDays = formData.recurringDays || [];
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    updateFormData({ recurringDays: updatedDays });
  };

  // 업무 전달 확인 처리
  const handleTransferConfirmation = () => {
    setShowTransferConfirmation(false);
    handleClose();
    if (onTaskCreated) onTaskCreated();
  };

  // 필수 조건 체크
  const isFollowUpRequired = formData.category === "신규계약" || formData.category === "계약해지";

  // 최소화된 상태 렌더링
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg cursor-pointer 
                   w-[200px] sm:w-[250px] h-[50px] flex items-center gap-3 px-4"
        onClick={() => setIsMinimized(false)}
      >
        <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span className="text-sm font-medium truncate flex-1">
          {task?.id ? "업무 수정" : "새업무추가"}
        </span>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="w-6 h-6 p-0 hover:bg-gray-100"
          >
            <Maximize2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="w-6 h-6 p-0 hover:bg-red-100 text-red-600"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dialog open={isOpen && !isMinimized} onOpenChange={handleClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto p-0 [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{task?.id ? "업무 수정" : "새업무추가"}</DialogTitle>
          </DialogHeader>
          {/* 커스텀 헤더 */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 rounded-t-lg text-white">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <CheckSquare className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold truncate">
                {task?.id ? "업무 수정" : "새업무추가"}
              </span>
              {/* 생성시간 표시 - 업무 수정 시에만 표시 */}
              {task?.id && (
              <span className="ml-3 text-xs text-blue-100 font-normal">
                  생성시간: {task?.createdAt ? format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss') : '정보 없음'}
              </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="w-8 h-8 p-0 hover:bg-red-500/80 text-white"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* 기본 정보 섹션 */}
            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                  <span className="truncate">기본 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 업무 제목과 우선순위 - 반응형 그리드 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
                      업무 제목 <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => updateFormData({ title: e.target.value })}
                      placeholder="업무 제목을 입력하세요"
                      className="mt-1 bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">우선순위</Label>
                    <Select value={formData.priority} onValueChange={(value) => updateFormData({ priority: value })}>
                      <SelectTrigger className="mt-1 bg-gray-50 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.filter(priority => priority && priority.value && priority.value.trim() !== "").map(priority => (
                          <SelectItem key={priority.value} value={priority.value}>
                            <div className={`px-2 py-1 rounded text-xs ${priority.color}`}>
                              {priority.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 대상처 입력 */}
                <div>
                  <Label htmlFor="targetPlace" className="text-sm font-semibold text-gray-700">대상처</Label>
                  <Input
                    id="targetPlace"
                    value={formData.targetPlace}
                    onChange={(e) => updateFormData({ targetPlace: e.target.value })}
                    placeholder="대상처를 입력하세요"
                    className="mt-1 bg-gray-50 text-sm"
                  />
                </div>

                {/* 설명 */}
                <div>
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700">설명</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    placeholder="업무에 대한 설명을 입력하세요"
                    className="mt-1 bg-gray-50 text-sm resize-none"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                    업무구분 <span className="text-red-600">*</span>
                  </Label>
                  <Select value={formData.category} onValueChange={(value) => updateFormData({ category: value })}>
                    <SelectTrigger className="mt-1 bg-red-50 border-red-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taskCategories.filter(cat => cat && cat.trim() !== "").map(cat => (
                        <SelectItem key={cat} value={cat}>
                          <span className={
                            cat === "경영지원" ? "text-black font-bold" :
                            cat === "계약관리" ? "text-green-600 font-bold" :
                            cat === "신규계약" ? "text-blue-600 font-bold" :
                            cat === "계약해지" ? "text-red-600 font-bold" :
                            ""
                          }>
                            {cat}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 후속담당자 선택 */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    후속담당자
                    {isFollowUpRequired && <span className="text-red-600 ml-1">*</span>}
                  </Label>
                  {users.length === 0 && (
                    <div className="text-xs text-yellow-600 mb-1">
                      ⚠️ 사용자 목록을 불러오는 중... ({users.length}명)
                    </div>
                  )}
                    <Select 
                      value={formData.followUpAssignee ? formData.followUpAssignee.toString() : "none"} 
                      onValueChange={(value) => updateFormData({ followUpAssignee: value === "none" ? null : value })}
                    >
                      <SelectTrigger className={`mt-1 text-sm ${isFollowUpRequired ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                        <SelectValue placeholder="선택안함" />
                      </SelectTrigger>
                      <SelectContent>
                        {!isFollowUpRequired && (
                          <SelectItem value="none">
                            <div className="flex items-center gap-2 text-gray-500">
                              <span>선택안함</span>
                            </div>
                          </SelectItem>
                        )}
                        {users.length > 0 ? users.map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3 text-green-600" />
                              {user.name}
                            </div>
                          </SelectItem>
                        )) : (
                          <SelectItem value="loading" disabled>
                            <div className="text-gray-500 text-xs">사용자 목록 로딩 중...</div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {isFollowUpRequired 
                        ? `${formData.category} 업무는 후속담당자 지정이 필수입니다.`
                        : "후속담당자를 지정하면 업무 완료 후 확인요청이 전달됩니다."
                      }
                    </p>
                  </div>

                {/* 후속담당자 메모 */}
                {formData.followUpAssignee && (
                  <div>
                    <Label htmlFor="followUpMemo" className="text-sm font-semibold text-gray-700">전달 메모</Label>
                    <Textarea
                      id="followUpMemo"
                      value={formData.followUpMemo}
                      onChange={(e) => updateFormData({ followUpMemo: e.target.value })}
                      placeholder="후속담당자에게 전달할 메모를 입력하세요"
                      className="mt-1 bg-gray-50 text-sm resize-none"
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>



            {/* 날짜 설정 섹션 */}
            <Card className="border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                  <span className="truncate flex-1">날짜 설정</span>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Label htmlFor="allDay" className="text-sm font-medium whitespace-nowrap">하루종일</Label>
                    <Switch
                      id="allDay"
                      checked={formData.allDay}
                      onCheckedChange={(checked) => updateFormData({ allDay: checked })}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">
                      시작 날짜 <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => updateFormData({ startDate: e.target.value })}
                      className="mt-1 bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">마감 날짜</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => updateFormData({ endDate: e.target.value })}
                      className="mt-1 bg-gray-50 text-sm"
                    />
                  </div>
                </div>

                {!formData.allDay && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">시작 시간</Label>
                      <Input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => updateFormData({ startTime: e.target.value })}
                        className="mt-1 bg-gray-50 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">마감 시간</Label>
                      <Input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => updateFormData({ endTime: e.target.value })}
                        className="mt-1 bg-gray-50 text-sm"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 반복일정 설정 섹션 */}
            <Card className="border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
                  <span className="truncate flex-1">반복일정 설정</span>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Label htmlFor="isRecurring" className="text-sm font-medium whitespace-nowrap">반복일정</Label>
                    <Switch
                      id="isRecurring"
                      checked={formData.isRecurring}
                      onCheckedChange={(checked) => updateFormData({ isRecurring: checked })}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              {formData.isRecurring && (
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">반복 유형</Label>
                      <Select
                        value={formData.recurringType}
                        onValueChange={(value) => updateFormData({ recurringType: value })}
                      >
                        <SelectTrigger className="mt-1 bg-gray-50 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {recurringTypes.filter(type => type && type.value && type.value.trim() !== "").map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">반복 종료 설정</Label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={!formData.isIndefinite ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateFormData({ isIndefinite: false })}
                            className="text-xs px-3 py-1 flex-1"
                          >
                            종료일 지정
                          </Button>
                          <Button
                            type="button"
                            variant={formData.isIndefinite ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateFormData({ isIndefinite: true, recurringEndDate: "" })}
                            className="text-xs px-3 py-1 flex-1"
                          >
                            무기한
                          </Button>
                        </div>
                        {!formData.isIndefinite && (
                          <Input
                            type="date"
                            value={formData.recurringEndDate}
                            onChange={(e) => updateFormData({ recurringEndDate: e.target.value })}
                            className="bg-gray-50 text-sm"
                            placeholder="종료일을 선택하세요"
                          />
                        )}
                        {formData.isIndefinite && (
                          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                            <p className="text-yellow-700 text-xs">
                              ♾️ 무기한으로 설정되었습니다. 수동으로 중단할 때까지 계속 반복됩니다.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 매주 반복일 때 요일 선택 */}
                  {formData.recurringType === 'weekly' && (
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">반복 요일</Label>
                      <div className="flex flex-wrap gap-2">
                        {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
                          <Button
                            key={day}
                            type="button"
                            variant={formData.recurringDays?.includes(day) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleRecurringDayToggle(day)}
                            className="text-xs px-3 py-1"
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 반복일정설정 안내 */}
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mt-4">
                    <h4 className="font-semibold text-orange-800 mb-2 text-sm flex items-center gap-2">
                      🔄 반복종료 설정 안내
                    </h4>
                    <p className="text-orange-700 mb-3 text-xs">
                      반복업무는 <strong>종료일 지정</strong> 또는 <strong>무기한</strong>으로 설정할 수 있습니다.
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="bg-white p-2 rounded border border-orange-200">
                        <strong className="text-orange-800">📅 종료일 지정 예시:</strong>
                        <div className="text-orange-600 mt-1">
                          • 반복 유형: 매일<br/>
                          • 반복 종료: 종료일 지정 → 2025-02-28<br/>
                          • → 2025-02-28까지 매일 반복
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded border border-orange-200">
                        <strong className="text-orange-800">📅 매주 반복 예시:</strong>
                        <div className="text-orange-600 mt-1">
                          • 반복 유형: 매주<br/>
                          • 반복 요일: 월, 수, 금 선택<br/>
                          • 반복 종료: 종료일 지정 → 2025-03-31<br/>
                          • → 2025-03-31까지 매주 월,수,금 반복
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded border border-orange-200">
                        <strong className="text-orange-800">♾️ 무기한 반복 예시:</strong>
                        <div className="text-orange-600 mt-1">
                          • 반복 유형: 매월<br/>
                          • 반복 종료: 무기한<br/>
                          • → 수동으로 중단할 때까지 매월 계속 반복
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
            
            {/* 버튼 - 반응형 레이아웃 */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-2 border-t border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                <X className="w-4 h-4 mr-2" />
                취소
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
              >
                {loading ? (
                  <>⏳ 처리중...</>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    {task?.id ? "업무 수정" : "업무 생성"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 업무 전달 확인 모달 */}
      <TaskTransferConfirmation
        isOpen={showTransferConfirmation}
        onClose={() => setShowTransferConfirmation(false)}
        createdTask={createdTask}
        followUpTasks={followUpTasks}
        onConfirm={handleTransferConfirmation}
      />
    </>
  );
}

// 업무 전달 확인 모달 컴포넌트 (React.memo로 최적화)
const TaskTransferConfirmation = React.memo(function TaskTransferConfirmation({ 
  isOpen, 
  onClose, 
  createdTask, 
  followUpTasks, 
  onConfirm 
}: TaskTransferConfirmationProps) {
  if (!createdTask || followUpTasks.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Send className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="truncate">업무 전달 확인</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              업무가 성공적으로 생성되었고, 다음 담당자에게 확인요청이 전달됩니다.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 text-sm mb-1">생성된 업무</h4>
              <p className="text-blue-800 text-sm truncate">{createdTask.title}</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 text-sm">전달될 확인요청</h4>
              {followUpTasks.map((task, index) => (
                <div key={task.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-green-900 text-sm truncate">{task.title}</p>
                      <p className="text-green-700 text-xs mt-1">
                        담당자: {task.assignedUser?.name}
                      </p>
                      {task.followUpMemo && (
                        <p className="text-green-600 text-xs mt-1 italic">
                          메모: {task.followUpMemo}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300 flex-shrink-0">
                      확인요청
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              취소
            </Button>
            <Button 
              onClick={onConfirm}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
            >
              <Send className="w-4 h-4 mr-2" />
              확인 및 전달
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}); 