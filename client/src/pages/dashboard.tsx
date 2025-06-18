import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useTasks } from "@/hooks/use-tasks";
import { Header } from "@/components/layout/header";
import { Sidebar, UpcomingDeadlines, RecentActivity } from "@/components/dashboard/sidebar";
import { TaskCalendar } from "@/components/dashboard/task-calendar";
import { WeeklyReport } from "@/components/dashboard/weekly-report";
import { TeamChat } from "@/components/dashboard/team-chat";

import { FloatingShapes } from "@/components/ui/floating-shapes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckSquare, 
  FileText, 
  Calendar, 
  MessageCircle, 
  Plus,
  Users,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Layout,
  Settings
} from "lucide-react";

import { TaskCreateModal } from "@/modules/task-management/components";
import { ConfirmationRequestCard } from "@/modules/summary-cards";
import { ScheduleExcelUpload } from "@/components/schedule-excel-upload";
import { TaskListTable } from "@/components/dashboard/task-list-table";
import { AccountManagement } from "@/components/admin/account-management";
import { StorageSettings } from "@/components/admin/storage-settings";
import { TodayScheduleCard } from "@/components/dashboard/today-schedule-card";
import { useLocation } from "wouter";

// 진행상태별 카드 섹션 컴포넌트
function TaskStatusCards({ onCreateTask, tasks }: { onCreateTask: () => void; tasks: any[] }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: followUpData = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks/follow-up"],
    select: (data: any) => data?.followUpTasks || []
  });

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeFollowUpTasks = Array.isArray(followUpData) ? followUpData : [];

  // 진행상태별 업무 분류
  const statusGroups = {
    all: {
      label: "전체",
      emoji: "📋",
      color: "bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200",
      borderColor: "border-gray-200",
      textColor: "text-gray-800",
      iconColor: "text-gray-600",
      titleBg: "bg-gray-600",
      tasks: safeTasks
    },
    scheduled: {
      label: "예정",
      emoji: "🔵",
      color: "bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      iconColor: "text-blue-600",
      titleBg: "bg-blue-600",
      tasks: safeTasks.filter(task => task.status === 'scheduled')
    },
    in_progress: {
      label: "진행",
      emoji: "🟡",
      color: "bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-800",
      iconColor: "text-yellow-600",
      titleBg: "bg-amber-600",
      tasks: safeTasks.filter(task => task.status === 'in_progress')
    },
    completed: {
      label: "완료",
      emoji: "🟢",
      color: "bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      iconColor: "text-green-600",
      titleBg: "bg-emerald-600",
      tasks: safeTasks.filter(task => task.status === 'completed')
    },
    postponed: {
      label: "연기",
      emoji: "⏸️",
      color: "bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200",
      borderColor: "border-orange-200",
      textColor: "text-orange-800",
      iconColor: "text-orange-600",
      titleBg: "bg-orange-600",
      tasks: safeTasks.filter(task => task.status === 'postponed')
    },

  };

  const handleCardClick = useCallback((status: string) => {
    // URL 파라미터로 상태 필터링 정보를 전달하여 task-management 페이지로 이동
    if (status === 'all') {
      setLocation('/task-management');
    } else {
    setLocation(`/task-management?status=${status}`);
    }
  }, [setLocation]);

  const handleConfirmFollowUp = useCallback(async (taskId: number) => {
    try {
      console.log('🔘 확인요청 처리 시작:', taskId);
      
      const response = await fetch(`/api/tasks/${taskId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // 승인 성공 알림
        alert('✅ 업무가 승인되었습니다!\n업무목록에 등록되었습니다.');
        
        // React Query 캐시 무효화로 UI 업데이트 (즉시 새로고침)
        await queryClient.invalidateQueries({ queryKey: ["followUp"] });
        await queryClient.invalidateQueries({ queryKey: ["tasks"] });
        
        // 추가로 강제 새로고침
        await queryClient.refetchQueries({ queryKey: ["followUp"] });
        
        console.log('✅ 후속업무 승인 완료:', result.task?.title);
        console.log('🔄 캐시 무효화 및 새로고침 완료');
      } else {
        throw new Error('승인 처리 실패');
      }
    } catch (error) {
      console.error('후속업무 확인 실패:', error);
      alert('❌ 승인 처리 중 오류가 발생했습니다.');
    }
  }, [queryClient]);

  const handleRejectFollowUp = useCallback(async (taskId: number, memo?: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: memo || '반려 처리됨' })
      });
      // React Query 캐시 무효화로 UI 업데이트
      queryClient.invalidateQueries({ queryKey: ["followUp"] });
    } catch (error) {
      console.error('후속업무 반려 실패:', error);
    }
  }, [queryClient]);

  // 미처리된 확인요청 업무만 필터링
  const pendingFollowUpTasks = safeFollowUpTasks.filter(task => task.status === 'pending');
  
  // 디버깅용 로그
  console.log('📊 대시보드 상태 카드 렌더링:', {
    totalFollowUpTasks: safeFollowUpTasks.length,
    pendingCount: pendingFollowUpTasks.length,
    showConfirmationCard: pendingFollowUpTasks.length > 0,
    allTaskStatuses: safeFollowUpTasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
  });

  return (
    <div className="space-y-4">
      {/* 확인요청 카드 (미처리된 후속업무가 있을 때만 표시) */}
      {pendingFollowUpTasks.length > 0 && (
        <div className="mb-4">
          <ConfirmationRequestCard
            followUpTasks={safeFollowUpTasks}
            onConfirm={handleConfirmFollowUp}
            onReject={handleRejectFollowUp}
          />
          </div>
      )}
      
      {/* 상태별 미니멀 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(statusGroups).map(([status, config]) => (
          <Card 
            key={status}
            className={`cursor-pointer transition-all duration-200 ${config.color} ${config.borderColor} border hover:shadow-md transform hover:scale-102 p-4`}
            onClick={() => handleCardClick(status)}
              >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`${config.titleBg} px-3 py-1 rounded-md inline-block`}>
                  <span className="text-white text-sm font-bold tracking-wide" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 1))' }}>
                    {config.label}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xl font-bold ${config.textColor}`}>
                  {config.tasks.length}
                </span>
                <ChevronRight className={`w-4 h-4 ${config.iconColor}`} />
              </div>
            </div>
            
                        {/* 업무 미리보기 또는 내용없음 표시 */}
            <div className="mt-2">
              {config.tasks.length > 0 ? (
                <div className="space-y-1">
                  {config.tasks.slice(0, 3).map((task, index) => (
                    <div 
                      key={task.id}
                      className={`text-xs ${config.textColor} opacity-70 truncate`}
                    >
                      • {task.title}
                    </div>
                  ))}
                  {config.tasks.length > 3 && (
                    <div className={`text-xs ${config.textColor} opacity-50`}>
                      +{config.tasks.length - 3}개 더
                    </div>
                  )}
                </div>
              ) : (
                <div className={`text-xs ${config.textColor} opacity-50 text-center py-1`}>
                  내용없음
                </div>
              )}
            </div>
    </Card>
        ))}
      </div>
    </div>
  );
}



export default function Dashboard() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const [currentView, setCurrentView] = useState<"employee" | "manager">(
    user?.role === "developer" || user?.role === "manager" ? "manager" : "employee"
  );
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");
  // 🎯 중앙집중식 데이터 관리 - useTasks 훅 사용
  const { allTasks: tasks } = useTasks();

  // 탭 변경 시 권한 체크
  const handleTabChange = (value: string) => {
    // 관리자설정 탭은 개발자와 운영자만 접근 가능
    if (value === 'admin-settings' && !(user?.role === 'developer' || user?.role === 'manager')) {
      console.warn('관리자설정 접근 거부:', user?.username, user?.role);
      return; // 탭 변경을 막음
    }
    setActiveTab(value);
  };

  // 🔄 뷰 변경 핸들러 (직원 ↔ 개발자/관리자 뷰 전환)
  const handleViewChange = (view: "employee" | "manager") => {
    console.log('🔄 뷰 전환:', currentView, '→', view);
    setCurrentView(view);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (taskId: number) => {
    console.log('🔧 업무 수정 요청:', taskId);
    const taskToEdit = tasks.find(task => task.id === taskId);
    console.log('🔍 찾은 업무:', taskToEdit);
    console.log('📋 전체 업무 목록:', tasks.length, '개');
    
    if (taskToEdit) {
      setEditingTask(taskId);
      setIsTaskModalOpen(true);
    } else {
      console.error('❌ 업무를 찾을 수 없습니다:', taskId);
    }
  };

  const handleCloseModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  // 🎯 뷰 모드별 필터링된 태스크 (직원은 자신의 업무만, 관리자는 전체)
  const filteredTasks = currentView === "employee" 
    ? tasks.filter(task => task.assignedTo === user?.id || task.assignedTo === user?.username)
    : tasks;

  // 🎨 뷰 모드별 스타일
  const viewModeIndicator = currentView === "employee" 
    ? "🧑‍💼 직원 뷰 (내 업무만 표시)" 
    : `👑 ${user?.role === 'developer' ? '개발자' : '관리자'} 뷰 (전체 업무 표시)`;

  return (
    <div className="min-h-screen gradient-bg relative">
      <FloatingShapes />
      
      <div className="relative z-10">
        <Header
          currentView={currentView}
          onViewChange={handleViewChange}
        />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* 🎯 뷰 모드 표시 배너 */}
          <div className="mb-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-300/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-100">
                  {viewModeIndicator}
                </span>
                <span className="text-xs text-blue-200/60">
                  ({filteredTasks.length}개 업무)
                </span>
              </div>
              <div className="text-xs text-blue-200/60">
                권한: {user?.role === 'developer' ? '개발자' : user?.role === 'manager' ? '관리자' : '직원'}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className={`grid w-full ${user?.role === 'developer' || user?.role === 'manager' ? 'grid-cols-5' : 'grid-cols-4'} glass-card p-2`}>
                <TabsTrigger 
                  value="tasks" 
                  className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>대시보드</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="task-list" 
                  className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  <Layout className="h-4 w-4" />
                  <span>업무목록</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="reports" 
                  className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  <FileText className="h-4 w-4" />
                  <span>보고서</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="chat" 
                  className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>PROJECT</span>
                  <Badge className="ml-2 bg-red-500 text-white text-xs">3</Badge>
                </TabsTrigger>
                {(user?.role === 'developer' || user?.role === 'manager') && (
                  <TabsTrigger 
                    value="admin-settings" 
                    className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    <span>관리자설정</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="tasks" className="mt-6">
                <div className="space-y-8">
                  <div className="w-full">
                    <TaskStatusCards onCreateTask={handleCreateTask} tasks={filteredTasks} />
                  </div>
                  
                  {/* 첫 번째 행: 오늘할일 + 달력 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="lg:col-span-1 h-[600px]">
                      <TodayScheduleCard className="h-full" />
                    </div>
                    
                    <div className="lg:col-span-1 h-[600px]">
                      <TaskCalendar className="h-full" />
                    </div>
                  </div>
                  
                  {/* 두 번째 행: 다가오는 마감일 + 최근활동 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <UpcomingDeadlines onEditTask={handleEditTask} tasks={filteredTasks} />
                    <RecentActivity />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="task-list" className="mt-6">
                <TaskListTable 
                  onCreateTask={handleCreateTask}
                  onEditTask={handleEditTask}
                  viewMode={currentView}
                />
              </TabsContent>

              <TabsContent value="reports" className="mt-6">
                <WeeklyReport userId={user?.id} />
              </TabsContent>

              <TabsContent value="chat" className="mt-6">
                <TeamChat />
              </TabsContent>

              {/* 관리자설정 탭 내용은 개발자와 운영자만 접근 가능 */}
              {(user?.role === 'developer' || user?.role === 'manager') && (
                <TabsContent value="admin-settings" className="mt-6">
                  <div className="space-y-6">
                    {/* 계정 관리 섹션 */}
                    <AccountManagement />
                    
                    {/* 데이터베이스 저장폴더 설정 섹션 */}
                    <StorageSettings viewMode={currentView} />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
      
      {isTaskModalOpen && (
        <TaskCreateModal
          isOpen={isTaskModalOpen}
          onClose={handleCloseModal}
          task={editingTask ? tasks.find(task => task.id === editingTask) : undefined}
        />
      )}
    </div>
  );
}