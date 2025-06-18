import React, { useState } from 'react';
import { ModuleProps } from '../core/types/module';
import { dashboardConfig } from './config';
import { useDashboard } from './hooks/useDashboard';
import { StatusCards } from './components/StatusCards';
import { ConfirmationRequestCard } from '@/modules/summary-cards';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TaskCalendar } from '@/components/dashboard/task-calendar';
import { WeeklyReport } from '@/components/dashboard/weekly-report';
import { TeamChat } from '@/components/dashboard/team-chat';
import { FloatingShapes } from '@/components/ui/floating-shapes';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw } from 'lucide-react';
import { TaskCreateModal } from '@/modules/task-management/components';
import { ScheduleExcelUpload } from '@/components/schedule-excel-upload';

const Dashboard: React.FC<ModuleProps> = ({ 
  config = {}, 
  className = '',
  style = {},
  onError,
  onLoad 
}) => {
  // 설정 병합
  const mergedConfig = { ...dashboardConfig, ...config };
  
  // 대시보드 데이터 및 로직
  const { 
    data, 
    loading, 
    error, 
    statusGroups, 
    handleConfirmFollowUp, 
    handleRejectFollowUp,
    refreshData,
    clearError
  } = useDashboard(mergedConfig);
  
  // UI 상태
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [showScheduleUpload, setShowScheduleUpload] = useState(false);

  // 에러 핸들링
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // 로드 완료 이벤트
  React.useEffect(() => {
    if (!loading && onLoad) {
      onLoad();
    }
  }, [loading, onLoad]);

  // 에러 상태 렌더링
  if (error) {
    return (
      <div className={`dashboard-error ${className}`} style={style}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              대시보드 로딩 오류
            </h2>
            <p className="text-gray-600 mb-6">{error.message}</p>
            <div className="space-x-4">
              <Button onClick={clearError} variant="outline">
                오류 해제
              </Button>
              <Button onClick={refreshData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                다시 시도
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 상태 렌더링
  if (loading) {
    return (
      <div className={`dashboard-loading ${className}`} style={style}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">대시보드 로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 업무 생성 핸들러
  const handleCreateTask = () => {
    setEditingTaskId(null);
    setShowTaskModal(true);
  };

  // 업무 수정 핸들러
  const handleEditTask = (taskId: number) => {
    setEditingTaskId(taskId);
    setShowTaskModal(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setShowTaskModal(false);
    setEditingTaskId(null);
  };



  return (
    <div className={`dashboard-module ${className}`} style={style}>
      <div className="min-h-screen bg-gray-50">
        <FloatingShapes />
        
        {/* 헤더 */}
        <Header />
        
        <div className="flex">
          {/* 사이드바 */}
          <Sidebar />
          
          {/* 메인 콘텐츠 */}
          <main className="flex-1 p-6 ml-64">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* 페이지 헤더 */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
                  <p className="text-gray-600 mt-1">업무 현황을 한눈에 확인하세요</p>
                </div>
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowScheduleUpload(true)}
                  >
                    일정 업로드
                  </Button>
                  <Button onClick={handleCreateTask}>
                    <Plus className="w-4 h-4 mr-2" />
                    업무 생성
                  </Button>
                  <Button variant="outline" onClick={refreshData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    새로고침
                  </Button>
                </div>
              </div>

              {/* 확인요청 카드 */}
              {data.pendingFollowUpTasks.length > 0 && (
                <div className="mb-6">
                  <ConfirmationRequestCard
                    followUpTasks={data.followUpTasks}
                    onConfirm={handleConfirmFollowUp}
                    onReject={handleRejectFollowUp}
                  />
                </div>
              )}
              
              {/* 상태별 업무 카드 */}
              <StatusCards 
                statusGroups={statusGroups}
                showPreview={mergedConfig.customConfig?.statusCards?.showPreview}
                maxPreviewItems={mergedConfig.customConfig?.statusCards?.maxPreviewItems}
              />

              {/* 탭 섹션 */}
              <Tabs defaultValue="calendar" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="calendar">📅 캘린더</TabsTrigger>
                  <TabsTrigger value="reports">📊 주간보고서</TabsTrigger>
                  <TabsTrigger value="chat">💬 팀 채팅</TabsTrigger>
                </TabsList>
                
                <TabsContent value="calendar" className="space-y-6">
                  <TaskCalendar />
                </TabsContent>
                
                <TabsContent value="reports" className="space-y-6">
                  <WeeklyReport />
                </TabsContent>
                
                <TabsContent value="chat" className="space-y-6">
                  <TeamChat />
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>

        {/* 업무 생성/수정 모달 */}
        {showTaskModal && (
          <TaskCreateModal
            isOpen={showTaskModal}
            onClose={handleCloseModal}
            editingTaskId={editingTaskId}
          />
        )}

        {/* 일정 업로드 모달 */}
        {showScheduleUpload && (
          <ScheduleExcelUpload
            isOpen={showScheduleUpload}
            onClose={() => setShowScheduleUpload(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard; 