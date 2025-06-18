import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import { DashboardStats } from "@/types";
import { useTasks } from "@/hooks/use-tasks";

interface SummaryCardsProps {
  userRole: "employee" | "manager" | "developer";
  onFilterChange?: (filter: string) => void;
  activeFilter?: string;
}

export function SummaryCards({ userRole, onFilterChange, activeFilter }: SummaryCardsProps) {
  // 🚀 중앙집중식 업무목록 사용 (실시간 업데이트)
  const { 
    allTasks, 
    isLoading, 
    error, 
    invalidateAndRefetch 
  } = useTasks();

  // 🔥 실시간 업데이트를 위한 전역 이벤트 리스너
  useEffect(() => {
    const handleTaskUpdate = () => {
      // 중앙집중식 업무목록 즉시 새로고침
      invalidateAndRefetch();
      console.log('🔄 요약카드 실시간 업데이트');
    };

    // 전역 이벤트 리스너 등록
    window.addEventListener('taskUpdated', handleTaskUpdate);
    window.addEventListener('taskCreated', handleTaskUpdate);
    window.addEventListener('taskDeleted', handleTaskUpdate);
    window.addEventListener('taskStatusChanged', handleTaskUpdate);
    window.addEventListener('tasksBulkUpdated', handleTaskUpdate);
    window.addEventListener('tasksBulkDeleted', handleTaskUpdate);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
      window.removeEventListener('taskCreated', handleTaskUpdate);
      window.removeEventListener('taskDeleted', handleTaskUpdate);
      window.removeEventListener('taskStatusChanged', handleTaskUpdate);
      window.removeEventListener('tasksBulkUpdated', handleTaskUpdate);
      window.removeEventListener('tasksBulkDeleted', handleTaskUpdate);
    };
  }, [invalidateAndRefetch]);

  // 📊 실시간 통계 계산 (중앙집중식 데이터 기반)
  const stats = React.useMemo(() => {
    if (!allTasks || allTasks.length === 0) {
      return {
        totalTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        scheduledTasks: 0,
        postponedTasks: 0,
        cancelledTasks: 0
      };
    }

    const totalTasks = allTasks.length;
    const inProgressTasks = allTasks.filter(task => task.status === 'in_progress').length;
    const completedTasks = allTasks.filter(task => task.status === 'completed').length;
    const scheduledTasks = allTasks.filter(task => task.status === 'scheduled').length;
    const postponedTasks = allTasks.filter(task => task.status === 'postponed').length;
    const cancelledTasks = allTasks.filter(task => task.status === 'cancelled').length;
    const overdueTasks = postponedTasks + cancelledTasks; // 연기+취소를 문제있는 업무로 간주

    console.log(`📊 실시간 통계: 전체 ${totalTasks}, 진행중 ${inProgressTasks}, 완료 ${completedTasks}, 문제 ${overdueTasks}`);

    return {
      totalTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      scheduledTasks,
      postponedTasks,
      cancelledTasks
    };
  }, [allTasks]);

  const handleCardClick = (filter: string) => {
    if (onFilterChange) {
      onFilterChange(filter);
  }
  };

  const cards = [
    {
      title: "전체업무",
      value: stats.totalTasks,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-600",
      titleBg: "bg-blue-600",
      numberColor: "text-gray-900",
      change: `예정 ${stats.scheduledTasks}개`,
      changeLabel: "등록된 업무",
      filter: "all",
    },
    {
      title: "진행중",
      value: stats.inProgressTasks,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-600",
      titleBg: "bg-amber-600",
      numberColor: "text-gray-900",
      progress: stats.totalTasks ? Math.round((stats.inProgressTasks / stats.totalTasks) * 100) : 0,
      progressLabel: "진행률",
      filter: "in_progress",
    },
    {
      title: "완료",
      value: stats.completedTasks,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-600",
      titleBg: "bg-emerald-600",
      numberColor: "text-gray-900",
      change: `${stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% 달성`,
      changeLabel: "완료율",
      filter: "completed",
    },
    {
      title: "문제업무",
      value: stats.overdueTasks,
      iconColor: "text-rose-600",
      iconBg: "bg-rose-600",
      titleBg: "bg-rose-600",
      numberColor: "text-gray-900",
      alert: stats.overdueTasks > 0,
      change: `연기 ${stats.postponedTasks}, 취소 ${stats.cancelledTasks}`,
      changeLabel: "주의 필요",
      filter: "problem",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {cards.map((card, index) => (
        <Card 
          key={index} 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 ${
            activeFilter === card.filter ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-200'
          }`}
          onClick={() => handleCardClick(card.filter)}
        >
          <CardContent className="p-3 sm:p-4 lg:p-6">
            {/* 헤더 영역 - 반응형 레이아웃 */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              {/* 제목 */}
              <div className={`${card.titleBg} text-white px-2 py-1 rounded-md shadow-lg drop-shadow-lg flex-shrink-0`}>
                <h3 className="text-xs sm:text-sm font-bold whitespace-nowrap">
                  {card.title}
                </h3>
              </div>
              
              {/* 아이콘 - 반응형 크기 */}
              <div className={`${card.iconBg} p-2 sm:p-2.5 lg:p-3 rounded-full shadow-lg flex-shrink-0`}>
                {index === 0 && <Target className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" strokeWidth={2.5} />}
                {index === 1 && <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" strokeWidth={2.5} />}
                {index === 2 && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" strokeWidth={2.5} />}
                {index === 3 && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" strokeWidth={2.5} />}
              </div>
            </div>
            
            {/* 숫자 표시 - 반응형 폰트 */}
            <div className="mb-3 sm:mb-4">
              <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${card.numberColor} leading-none`}>
                {card.value.toLocaleString()}
              </p>
            </div>

            {/* 하단 정보 - 반응형 레이아웃 */}
            <div className="min-h-[40px] sm:min-h-[48px] flex flex-col justify-center">
              {card.progress !== undefined ? (
                <div className="space-y-2">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                      style={{ width: `${card.progress}%` }}
                    />
                  </div>
                  <span className="text-gray-500 text-xs sm:text-sm font-medium block">
                    {card.progress}% {card.progressLabel}
                  </span>
                </div>
              ) : card.change ? (
                <div className="space-y-1">
                  <div className="text-gray-600 text-xs sm:text-sm font-medium">
                    {card.change}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {card.changeLabel}
                  </div>
                </div>
              ) : card.alert ? (
                <div className="flex items-center">
                  <span className="text-rose-600 text-xs sm:text-sm font-medium">
                    주의 필요
                  </span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
