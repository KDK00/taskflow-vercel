import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Edit2, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTasks } from '@/hooks/use-tasks';
import { TaskCreateModal } from '@/modules/task-management/components';

interface TodayScheduleCardProps {
  className?: string;
}

export function TodayScheduleCard({ className = '' }: TodayScheduleCardProps) {
  const { allTasks, isLoading, error, invalidateAndRefetch } = useTasks();
  const { toast } = useToast();
  const [pendingChanges, setPendingChanges] = useState<{[key: number]: {progress?: number, status?: string, startTime?: string}}>({});
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  
  // 업무수정 모달 관련 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  
  // 오늘할일 필터링 (테스트를 위해 최근 10개 업무 표시)
  const todayTasks = React.useMemo(() => {
    if (!allTasks || allTasks.length === 0) return [];
    
    console.log('🔍 전체 업무 수:', allTasks.length);
    
    // 테스트를 위해 최근 10개 업무를 표시 (날짜 상관없이)
    const recentTasks = allTasks
      .slice(0, 10) // 최근 10개만
      .sort((a, b) => {
        const timeA = a.startTime || '09:00';
        const timeB = b.startTime || '09:00';
        return timeA.localeCompare(timeB);
      });
    
    console.log('🎯 표시할 업무들:', recentTasks.map(t => ({ 
      id: t.id, 
      title: t.title, 
      workDate: t.workDate,
      startTime: t.startTime 
    })));
    
    return recentTasks;
  }, [allTasks]);

  // 전역 이벤트 리스너 등록
  useEffect(() => {
    const handleTaskUpdate = () => {
      invalidateAndRefetch();
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);
    window.addEventListener('taskCreated', handleTaskUpdate);
    window.addEventListener('taskDeleted', handleTaskUpdate);
    window.addEventListener('taskStatusChanged', handleTaskUpdate);
    window.addEventListener('tasksBulkUpdated', handleTaskUpdate);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
      window.removeEventListener('taskCreated', handleTaskUpdate);
      window.removeEventListener('taskDeleted', handleTaskUpdate);
      window.removeEventListener('taskStatusChanged', handleTaskUpdate);
      window.removeEventListener('tasksBulkUpdated', handleTaskUpdate);
    };
  }, [invalidateAndRefetch]);

  // 진행률에 따른 상태 자동변환
  const getStatusFromProgress = (progress: number): string => {
    if (progress === 0) return 'scheduled';
    if (progress >= 1 && progress <= 99) return 'in_progress';
    if (progress === 100) return 'completed';
    return 'scheduled';
  };

  // 진행률 변경
  const handleProgressChange = (taskId: number, currentProgress: number) => {
    const progressLevels = [0, 25, 50, 75, 100];
    const currentIndex = progressLevels.indexOf(currentProgress);
    const nextIndex = (currentIndex + 1) % progressLevels.length;
    const newProgress = progressLevels[nextIndex];
    
    const newStatus = getStatusFromProgress(newProgress);
    
    setPendingChanges(prev => ({
      ...prev,
      [taskId]: { 
        ...prev[taskId],
        progress: newProgress, 
        status: newStatus 
      }
    }));
    
    toast({
      title: "📊 진행률 변경 대기중",
      description: `진행률: ${newProgress}% (${newStatus === 'completed' ? '완료' : newStatus === 'in_progress' ? '진행중' : '예정'})`,
      duration: 2000,
    });
  };

  // 시간 변경
  const handleTimeChange = (taskId: number, newTime: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [taskId]: { 
        ...prev[taskId],
        startTime: newTime 
      }
    }));
    
    toast({
      title: "⏰ 시간 변경 대기중",
      description: `새 시간: ${newTime}`,
      duration: 2000,
    });
  };

  // 업무 삭제
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('정말로 이 업무를 삭제하시겠습니까?')) return;
    
    try {
      console.log('🔍 삭제 시도:', { taskId });
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        invalidateAndRefetch();
        window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId } }));
        
        toast({
          title: "🗑️ 업무 삭제 완료",
          description: "업무가 성공적으로 삭제되었습니다.",
          duration: 2000,
        });
      } else {
        const errorText = await response.text();
        console.error('❌ 삭제 실패 응답:', { taskId, status: response.status, errorText });
        throw new Error(`업무 ${taskId} 삭제 실패: ${response.status}`);
      }
    } catch (error) {
      console.error('업무 삭제 실패:', error);
      toast({
        title: "❌ 삭제 실패",
        description: "업무 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // 업무 수정 모달 열기 (업무목록전체와 동일한 방식)
  const handleEditTask = (taskId: number) => {
    const taskToEdit = todayTasks.find(t => t.id === taskId);
    if (taskToEdit) {
      console.log('📝 업무수정 모달 열기:', { taskId, task: taskToEdit });
      setEditingTask(taskId);
      setIsEditModalOpen(true);
    } else {
      toast({
        title: "❌ 오류",
        description: "수정할 업무를 찾을 수 없습니다.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // 업무수정 모달 닫기
  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingTask(null);
  };

  // 업무수정 완료 후 처리
  const handleTaskUpdated = () => {
    invalidateAndRefetch();
    handleEditModalClose();
    
    toast({
      title: "✅ 업무 수정 완료",
      description: "업무가 성공적으로 수정되었습니다.",
      duration: 2000,
    });
  };

  // 변경사항 저장
  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    
    try {
      let savedCount = 0;
      
      // pending 변경사항들을 순차적으로 저장
      for (const [taskId, changes] of Object.entries(pendingChanges)) {
        if (changes.progress !== undefined || changes.status !== undefined || changes.startTime !== undefined) {
          console.log('📤 저장 시도:', { taskId, taskIdType: typeof taskId, changes });
          
          // 업무 데이터 준비 - undefined 값 제거
          const updateData: any = {};
          
          if (changes.progress !== undefined) {
            updateData.progress = changes.progress;
            // 진행률에 따른 상태 자동 업데이트
            updateData.status = getStatusFromProgress(changes.progress);
          }
          
          if (changes.status !== undefined) {
            updateData.status = changes.status;
          }
          
          if (changes.startTime !== undefined) {
            updateData.startTime = changes.startTime;
          }
          
          console.log('📤 서버 전송 데이터:', { taskId, updateData });
          
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            credentials: 'include', // 세션 쿠키 포함
            body: JSON.stringify(updateData)
          });
          
          console.log('📡 서버 응답 상태:', response.status, response.statusText);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 저장 실패 응답:', { 
              taskId, 
              status: response.status, 
              statusText: response.statusText,
              errorText 
            });
            throw new Error(`업무 ${taskId} 저장 실패: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log('✅ 저장 성공:', { taskId, result });
          savedCount++;
        }
      }
      
      if (savedCount > 0) {
        // pending 상태 초기화
        setPendingChanges({});
        
        // 🚀 즉시 데이터 새로고침
        invalidateAndRefetch();
        
        // 🔥 전역 이벤트 발생 (업무목록전체 자동새로고침 방지 플래그 추가)
        window.dispatchEvent(new CustomEvent('tasksBulkUpdated', { 
          detail: { 
            count: savedCount,
            source: 'today-schedule-card',  // 출처 표시
            preventAutoRefresh: true        // 자동 새로고침 방지 플래그
          } 
        }));
        
        toast({
          title: "✅ 변경사항 저장 완료",
          description: `${savedCount}개 업무의 변경사항이 저장되었습니다.`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('저장 실패:', error);
      toast({
        title: "❌ 저장 실패",
        description: error instanceof Error ? error.message : "변경사항 저장 중 오류가 발생했습니다.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  if (isLoading) {
    return (
      <Card className={`${className} flex flex-col`}>
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            {/* 왼쪽: 아이콘과 제목 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">오늘할일</h3>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </p>
              </div>
            </div>
            
            {/* 오른쪽: 로딩 중 표시 */}
            <div className="text-right">
              <div className="text-lg font-bold text-gray-400">
                --% <span className="text-sm font-normal text-gray-400">(--/--)</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p>업무 목록을 불러오고 있습니다...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} flex flex-col`}>
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            {/* 왼쪽: 아이콘과 제목 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">오늘할일</h3>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </p>
              </div>
            </div>
            
            {/* 오른쪽: 에러 표시 */}
            <div className="text-right">
              <div className="text-lg font-bold text-red-400">
                오류 <span className="text-sm font-normal text-red-400">(로드실패)</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>업무 목록을 불러오는데 실패했습니다.</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => invalidateAndRefetch()}
            >
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} flex flex-col`}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          {/* 왼쪽: 아이콘과 제목 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">오늘할일</h3>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              </p>
            </div>
          </div>
          
          {/* 오른쪽: 전체 진행률과 저장 버튼 */}
          <div className="flex items-center gap-3">
            {/* 전체 진행률 표시 */}
            <div className="text-right">
              <div className="text-lg font-bold text-orange-500">
                {Math.round(todayTasks.length > 0 ? 
                  todayTasks.reduce((sum, task) => {
                    const taskProgress = pendingChanges[task.id]?.progress ?? task.progress ?? 0;
                    return sum + taskProgress;
                  }, 0) / todayTasks.length : 0
                )}% 
                <span className="text-sm font-normal text-gray-500">
                  ({todayTasks.filter(task => {
                    const taskProgress = pendingChanges[task.id]?.progress ?? task.progress ?? 0;
                    return taskProgress === 100;
                  }).length}/{todayTasks.length})
                </span>
              </div>
            </div>
            
            {/* 수정저장 버튼 */}
            {Object.keys(pendingChanges).length > 0 && (
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm"
              >
                <Save className="h-4 w-4" />
                수정저장
              </button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto space-y-2 pr-2">
        {todayTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>오늘 예정된 업무가 없습니다.</p>
          </div>
        ) : (
          todayTasks.map((task: any) => {
            // pending 변경사항이 있으면 적용
            const displayTask = {
              ...task,
              ...pendingChanges[task.id]
            };
            
            // 시간 처리: startTime 또는 기본값 09:00
            const taskTime = pendingChanges[task.id]?.startTime || task.startTime || '09:00';
            
            return (
              <div 
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                  (displayTask.progress || 0) === 100
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-gray-200 hover:border-blue-300'
                }`}
              >
                {/* 진행률 원형 아이콘 */}
                <div 
                  className="relative cursor-pointer group flex-shrink-0"
                  onClick={() => handleProgressChange(task.id, displayTask.progress || 0)}
                  title="클릭하여 진행률 변경 (25% 단위)"
                >
                  <div className="w-12 h-12 relative">
                    {/* 원형 배경 */}
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-gray-200"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="18"
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
                        strokeDasharray={`${((displayTask.progress || 0) / 100) * 113} 113`}
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

                {/* 업무 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* 시간 박스 */}
                    <div 
                      className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleEditTask(task.id)}
                      title="클릭하여 업무수정"
                    >
                      {taskTime}
                    </div>
                    
                    {/* 제목 */}
                    <div className={`font-medium text-sm flex-1 ${(displayTask.progress || 0) === 100 ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.title}
                    </div>
                    
                    {/* 우선순위 배지 - 제목 오른쪽에 위치 */}
                    {task.priority && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-1.5 py-0.5 h-5 ${
                          task.priority === 'urgent' ? 'border-red-300 text-red-600 bg-red-50' :
                          task.priority === 'high' ? 'border-orange-300 text-orange-600 bg-orange-50' :
                          task.priority === 'medium' ? 'border-yellow-300 text-yellow-600 bg-yellow-50' :
                          'border-green-300 text-green-600 bg-green-50'
                        }`}
                      >
                        {task.priority === 'urgent' ? '긴급' :
                         task.priority === 'high' ? '높음' :
                         task.priority === 'medium' ? '보통' : '낮음'}
                      </Badge>
                    )}
                  </div>
                  
                  {/* 설명 */}
                  {task.description && (
                    <div className={`text-xs mb-2 ${(displayTask.progress || 0) === 100 ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                      {task.description}
                    </div>
                  )}
                </div>
                
                {/* 액션 버튼 */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                    onClick={() => handleEditTask(task.id)}
                    title="업무수정"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => handleDeleteTask(task.id)}
                    title="업무 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
        </div>
      </CardContent>
      
      {/* 업무수정 모달 (업무목록전체와 동일한 방식) */}
      <TaskCreateModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onTaskCreated={handleTaskUpdated}
        task={editingTask ? todayTasks.find(task => task.id === editingTask) : undefined}
      />
    </Card>
  );
} 