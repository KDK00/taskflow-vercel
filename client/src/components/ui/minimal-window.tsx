import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Maximize2, Minus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTasks } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface MinimalWindowProps {
  onRestore: () => void;
  onClose: () => void;
}

export function MinimalWindow({ onRestore, onClose }: MinimalWindowProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 🎯 중앙집중식 데이터 관리 - useTasks 훅 사용
  const { allTasks: tasks, isLoading } = useTasks();

  // 업무 수정 Mutation
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  // 상태 변경 함수
  const handleStatusChange = (taskId: number, currentStatus: string) => {
    const statusOptions = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    const currentIndex = statusOptions.indexOf(currentStatus);
    const nextStatus = statusOptions[(currentIndex + 1) % statusOptions.length];
    
    updateTaskMutation.mutate({
      id: taskId,
      status: nextStatus
    });
  };

  // 상태 설정
  const getStatusConfig = (status: string) => {
    const configs = {
      scheduled: { label: '예정', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      in_progress: { label: '진행', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      completed: { label: '완료', color: 'bg-green-100 text-green-800 border-green-200' },
      cancelled: { label: '취소', color: 'bg-red-100 text-red-800 border-red-200' }
    };
    return configs[status as keyof typeof configs] || configs.scheduled;
  };

  // 오늘의 업무만 필터링
  const today = new Date();
  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.dueDate || task.createdAt);
    return taskDate.toDateString() === today.toDateString();
  });

  if (isMinimized) {
    // 최소화된 상태 - 반응형 개선
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg cursor-pointer 
                   min-w-[140px] max-w-[200px] sm:min-w-[160px] sm:max-w-[250px] h-[40px] sm:h-[44px]"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2 px-3 py-2 h-full">
          <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
          <span className="text-xs sm:text-sm font-medium truncate flex-1">
            업무관리 ({todayTasks.length})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
                    w-[350px] h-[450px] min-w-[350px] min-h-[450px]
                    max-w-[95vw] max-h-[90vh] bg-white border border-gray-300 rounded-lg shadow-2xl flex flex-col">
      
      {/* 윈도우 타이틀바 - 레이아웃 완전 수정 */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-2 rounded-t-lg 
                      h-[44px] flex-shrink-0 text-white overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {/* macOS 스타일 버튼들 */}
          <div className="flex gap-1.5 flex-shrink-0">
            <div className="w-3 h-3 bg-red-500 rounded-full cursor-pointer hover:bg-red-400 transition-colors border border-red-600" onClick={onClose}></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full cursor-pointer hover:bg-yellow-400 transition-colors border border-yellow-600" onClick={() => setIsMinimized(true)}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full cursor-pointer hover:bg-green-400 transition-colors border border-green-600" onClick={onRestore}></div>
          </div>
          <span className="text-xs font-medium truncate min-w-0">
            📋 업무관리
          </span>
        </div>
        
        {/* 윈도우 컨트롤 버튼들 - 고정 크기 */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="w-5 h-5 p-0 hover:bg-white/20 text-white flex-shrink-0 min-w-[20px]"
            title="최소화"
          >
            <Minus className="w-2.5 h-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestore}
            className="w-5 h-5 p-0 hover:bg-white/20 text-white flex-shrink-0 min-w-[20px]"
            title="전체 화면으로 복원"
          >
            <Maximize2 className="w-2.5 h-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-5 h-5 p-0 hover:bg-red-500/80 text-white flex-shrink-0 min-w-[20px]"
            title="닫기"
          >
            <X className="w-2.5 h-2.5" />
          </Button>
        </div>
      </div>

      {/* 윈도우 내용 - 반응형 스크롤 */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-sm">⏳ 로딩 중...</div>
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="mb-2 text-3xl">📅</div>
              <div className="text-sm font-medium">오늘 할 일이 없습니다</div>
              <div className="text-xs mt-1 text-gray-400">새로운 업무를 추가해보세요</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {todayTasks.map((task) => {
              const statusConfig = getStatusConfig(task.status);
              return (
                <Card key={task.id} className="border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-2">
                      {/* 제목과 상태 - 반응형 레이아웃 */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <h4 className="font-medium text-sm sm:text-base text-gray-900 leading-tight flex-1 min-w-0">
                          {task.title}
                        </h4>
                        <Badge
                          className={`${statusConfig.color} cursor-pointer text-xs px-2 py-1 border flex-shrink-0 self-start sm:self-auto 
                                     hover:opacity-80 transition-opacity`}
                          onClick={() => handleStatusChange(task.id, task.status)}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {/* 진행율 */}
                      {task.progress !== undefined && task.progress > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">진행율</span>
                            <span className="text-xs text-gray-600">{task.progress}%</span>
                          </div>
                          <Progress value={task.progress || 0} className="h-1.5 sm:h-2" />
                        </div>
                      )}

                      {/* 마감일 */}
                      {task.dueDate && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span>📅</span>
                          <span className="truncate">
                            {format(new Date(task.dueDate), 'M월 d일 (E)', { locale: ko })}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 상태바 - 반응형 */}
      <div className="bg-gray-50 px-2 sm:px-4 py-2 rounded-b-lg border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="truncate">총 {todayTasks.length}개 업무</span>
          <span className="text-xs sm:text-xs font-mono flex-shrink-0 ml-2">
            {format(new Date(), 'MM/dd HH:mm')}
          </span>
        </div>
      </div>
    </div>
  );
}
