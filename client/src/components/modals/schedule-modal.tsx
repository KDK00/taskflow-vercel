import { useState, useEffect } from "react";
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
import { CheckSquare, Users, Info, X, Repeat, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  task?: any; // 업무 수정용
}

// 업무 카테고리와 우선순위
const taskCategories = ["경영지원", "신규계약", "계약관리", "계약해지"];
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

export function ScheduleModal({ isOpen, onClose, selectedDate, task }: ScheduleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // 사용자 목록 조회
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/users", { credentials: "include" });
        if (!response.ok) throw new Error("사용자 목록 조회 실패");
        const data = await response.json();
        return Array.isArray(data) ? data : (data.users || []);
      } catch (error) {
        console.error("사용자 목록 조회 에러:", error);
        return user ? [user] : [];
      }
    },
  });

  // 폼 상태
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "", // 사용자 입력값만 사용
    endDate: "",
          category: "경영지원",
    priority: "medium",
    assignedTo: user?.id || 1,
    status: "scheduled",
    progress: 0,
    targetPlace: "",
    contractType: "경영일반",
    confirmed: false,
    // 반복일정 관련 필드 추가
    isRecurring: false,
    recurringType: "weekly",
    recurringInterval: 1,
    recurringDays: [] as string[],
    recurringEndDate: "",
    recurringCount: undefined as number | undefined,
    isIndefinite: true,
  });

  // 선택된 날짜 자동 설정 제거 - 사용자 입력값만 사용

  // 업무 수정 모드일 때 데이터 로드
  useEffect(() => {
    if (task) {
      const formatDate = (dateString: string) => {
        if (!dateString) return ""; // 기본값 제거
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      setFormData({
        title: task.title || "",
        description: task.description || "",
        category: task.category || "경영지원",
        priority: task.priority || "medium",
        assignedTo: task.assignedTo || user?.id || 1,
        startDate: formatDate(task.startDate),
        endDate: formatDate(task.dueDate),
        status: task.status || "scheduled",
        progress: task.progress || 0,
        targetPlace: task.targetPlace || "",
        contractType: task.contractType || "경영일반",
        confirmed: task.confirmed || false,
        // 반복일정 필드도 업데이트
        isRecurring: task.isRecurring || false,
        recurringType: task.recurringType || "weekly",
        recurringInterval: task.recurringInterval || 1,
        recurringDays: task.recurringDays ? JSON.parse(task.recurringDays) : [],
        recurringEndDate: task.recurringEndDate || "",
        recurringCount: task.recurringCount || undefined,
        isIndefinite: task.isIndefinite !== undefined ? task.isIndefinite : true,
      });
    }
  }, [task, user]);

  // 사용자 기본값 설정
  useEffect(() => {
    if (users.length > 0 && !formData.assignedTo) {
      setFormData(prev => ({
        ...prev,
        assignedTo: users[0].id
      }));
    }
  }, [users, formData.assignedTo]);

  // 업무 생성/수정 뮤테이션
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const isEditing = task?.id;
      const url = isEditing ? `/api/tasks/${task.id}` : "/api/tasks";
      const method = isEditing ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(taskData),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "업무 처리에 실패했습니다");
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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      // 전역 이벤트 발생 (주간보고서 실시간 업데이트용)
      if (task?.id) {
        window.dispatchEvent(new CustomEvent('taskUpdated', { detail: data.task }));
      } else {
        window.dispatchEvent(new CustomEvent('taskCreated', { detail: data.task }));
      }
      
      // 성공 메시지
      toast({
        title: task?.id ? "✅ 업무 수정 완료" : "✅ 업무 생성 완료",
        description: task?.id ? "업무가 성공적으로 수정되었습니다." : "새로운 업무가 성공적으로 생성되었습니다.",
      });
      
      // 모달 즉시 닫기
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: task?.id ? "❌ 업무 수정 실패" : "❌ 업무 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 기본 유효성 검사
    if (!formData.title.trim()) {
      toast({
        title: "❌ 입력 오류",
        description: "업무 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.assignedTo) {
      toast({
        title: "❌ 입력 오류",
        description: "담당자를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 계약해지 선택 시 확인 체크박스 검증
    if (formData.contractType === '계약해지' && !formData.confirmed) {
      toast({
        title: "❌ 확인 필요",
        description: "계약해지 시 '확인했습니다' 체크박스를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 사용자가 입력한 날짜를 그대로 사용 (변환 없이)
    console.log('📅 Schedule Modal에서 전송할 날짜 데이터:', {
      startDate: formData.startDate,
      endDate: formData.endDate,
      title: formData.title
    });

    const taskData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      assignedTo: formData.assignedTo,
      startDate: formData.startDate, // 사용자 입력값 그대로 전달
      dueDate: formData.endDate || formData.startDate, // 사용자 입력값 그대로 전달
      workDate: formData.startDate, // 사용자 입력값 그대로 전달
      status: formData.status,
      progress: formData.progress,
      targetPlace: formData.targetPlace,
      contractType: formData.contractType,
      confirmed: formData.confirmed,
      // 반복일정 데이터 추가
      isRecurring: formData.isRecurring,
      recurringType: formData.isRecurring ? formData.recurringType : null,
      recurringInterval: formData.isRecurring ? formData.recurringInterval : null,
      recurringDays: formData.isRecurring && formData.recurringDays.length > 0 ? JSON.stringify(formData.recurringDays) : null,
      recurringEndDate: formData.isRecurring && !formData.isIndefinite ? formData.recurringEndDate : null,
      recurringCount: formData.isRecurring && !formData.isIndefinite ? formData.recurringCount : null,
      isIndefinite: formData.isRecurring ? formData.isIndefinite : null,
    };

    createTaskMutation.mutate(taskData);
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      startDate: "", // 기본값 제거 - 사용자가 직접 입력하도록
      endDate: "",
      category: "경영지원",
      priority: "medium",
      assignedTo: user?.id || 1,
      status: "scheduled",
      progress: 0,
      targetPlace: "",
      contractType: "경영일반",
      confirmed: false,
      // 반복일정 필드도 초기화
      isRecurring: false,
      recurringType: "weekly",
      recurringInterval: 1,
      recurringDays: [],
      recurringEndDate: "",
      recurringCount: undefined,
      isIndefinite: true,
    });
    onClose();
  };

  // 반복일정 요일 토글 핸들러
  const handleRecurringDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter(d => d !== day)
        : [...prev.recurringDays, day]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CheckSquare className="w-5 h-5 mr-2 text-blue-600" />
            {task?.id ? "업무 수정" : "새업무추가"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">업무 제목 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="업무 제목을 입력하세요"
                className="mt-1"
              />
            </div>

            {/* 대상처 입력 */}
            <div>
              <Label htmlFor="targetPlace">대상처 입력</Label>
              <Input
                id="targetPlace"
                value={formData.targetPlace}
                onChange={(e) => setFormData(prev => ({ ...prev, targetPlace: e.target.value }))}
                placeholder="대상처를 입력하세요"
                className="mt-1"
              />
            </div>

            {/* 활동 구분 */}
            <div>
              <Label className="block mb-2">활동 구분</Label>
              <div className="mb-2 p-2 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-700">
                  <Info className="inline w-4 h-4 mr-1" />
                  필수체크항목이며, 활동 구분을 체크하세요
                </p>
              </div>
              
              {/* 경영일반 그룹 */}
              <div className="mb-4">
                <Label className="text-sm text-gray-600 mb-2 block">📊 경영일반</Label>
                <div className="flex gap-2">
                  {['경영일반'].map((type) => {
                    const isSelected = formData.contractType === type;
                    const buttonStyles = isSelected 
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600"
                      : "bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50";

                    return (
                      <Button
                        key={type}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`px-4 py-2 text-sm font-medium transition-all ${buttonStyles}`}
                        onClick={() => setFormData(prev => ({ ...prev, contractType: type, confirmed: false }))}
                      >
                        {type}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* 계약업무 그룹 */}
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">📋 계약업무</Label>
                <div className="flex gap-2">
                  {['신규계약', '계약관리', '계약해지'].map((type) => {
                  const isSelected = formData.contractType === type;
                  
                  // 버튼별 색상 설정
                  let buttonStyles = '';
                  if (type === '신규계약') {
                    buttonStyles = isSelected 
                      ? "bg-green-600 text-white hover:bg-green-700 border-green-600"
                      : "bg-white text-green-700 border-green-300 hover:bg-green-50";
                  } else if (type === '계약관리') {
                    buttonStyles = isSelected 
                      ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                      : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50";
                  } else { // 계약해지
                    buttonStyles = isSelected 
                      ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                      : "bg-white text-red-700 border-red-300 hover:bg-red-50";
                  }

                  return (
                    <Button
                      key={type}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`px-4 py-2 text-sm font-medium transition-all ${buttonStyles}`}
                      onClick={() => setFormData(prev => ({ ...prev, contractType: type, confirmed: false }))}
                    >
                      {type}
                    </Button>
                  );
                })}
                </div>
              </div>
              
              {/* 계약해지 선택 시 안내문과 확인 체크박스 */}
              {formData.contractType === '계약해지' && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">
                      "해지확인서"를 담당자에게 접수바랍니다
                    </AlertDescription>
                  </Alert>
                  <div className="mt-2 flex items-center space-x-2">
                    <Checkbox
                      id="confirmed"
                      checked={formData.confirmed}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, confirmed: !!checked }))}
                    />
                    <Label htmlFor="confirmed" className="text-sm text-red-700 font-medium">
                      확인했습니다
                    </Label>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="업무에 대한 설명을 입력하세요"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label>업무구분</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 업무 설정 */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-sm flex items-center">
              <CheckSquare className="w-4 h-4 mr-2" />
              업무 설정
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>우선순위</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className={`px-2 py-1 rounded text-xs ${priority.color}`}>
                          {priority.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>담당자</Label>
                <Select value={formData.assignedTo?.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: parseInt(value) }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          {user.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 날짜 설정 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">시작 날짜 *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">마감 날짜</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* 반복일정 설정 */}
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Repeat className="w-4 h-4 text-purple-600" />
                반복일정 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRecurring: checked }))}
                />
                <Label htmlFor="isRecurring">반복 일정 활성화</Label>
              </div>

              {formData.isRecurring && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                  {/* 반복 날짜 규정 안내 */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>📅 반복 날짜 규정:</strong><br/>
                      • <strong>매일/주간</strong>: 선택한 요일에 따라<br/>
                      • <strong>매월</strong>: 시작일 기준 (예: 15일 시작 → 매월 15일)<br/>
                      • <strong>매년</strong>: 시작 월/일 기준 (예: 6/15 시작 → 매년 6월 15일)
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>반복 유형</Label>
                      <Select
                        value={formData.recurringType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, recurringType: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {recurringTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>
                        반복 간격 
                        <span className="text-xs text-gray-500 ml-2">
                          (몇 번째마다 반복할지)
                        </span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.recurringInterval}
                        onChange={(e) => setFormData(prev => ({ ...prev, recurringInterval: parseInt(e.target.value) || 1 }))}
                        className="mt-1"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  {(formData.recurringType === "weekly" || formData.recurringType === "custom") && (
                    <div>
                      <Label>반복 요일</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {weekDays.map(day => (
                          <Badge
                            key={day.value}
                            variant={formData.recurringDays.includes(day.value) ? "default" : "outline"}
                            className={`cursor-pointer ${day.style || ''}`}
                            onClick={() => handleRecurringDayToggle(day.value)}
                          >
                            {day.short}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 무기한 옵션 */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isIndefinite"
                        checked={formData.isIndefinite}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isIndefinite: !!checked }))}
                      />
                      <Label htmlFor="isIndefinite" className="text-sm font-medium">
                        무기한 반복 (종료일 없음)
                      </Label>
                    </div>

                    {!formData.isIndefinite && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>반복 종료 날짜</Label>
                          <Input
                            type="date"
                            value={formData.recurringEndDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>반복 횟수</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.recurringCount || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, recurringCount: e.target.value ? parseInt(e.target.value) : undefined }))}
                            placeholder="제한 없음"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 버튼 */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={createTaskMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createTaskMutation.isPending ? (
                <>로딩중...</>
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
  );
} 