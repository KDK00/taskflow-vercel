import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ModuleConfig } from '../../core/types/module';
import { ModuleAPIClient } from '../../core/api/client';

export interface DashboardData {
  tasks: any[];
  stats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  followUpTasks: any[];
  notifications: any[];
  recentActivity: any[];
}

export const useDashboard = (config: ModuleConfig) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();
  
  // API 클라이언트 초기화
  const apiClient = new ModuleAPIClient(config);
  
  // 업무 목록 조회 - 필요할 때만 자동 새로고침
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'], // 전체 프로젝트 통일 쿼리 키
    queryFn: async () => {
      const response = await apiClient.get('/tasks');
      return response.data || [];
    },
    refetchInterval: config.features?.autoRefresh && tasks.length > 0 ? 30000 : false,
    staleTime: config.features?.cache ? 60000 : 0,
    enabled: true // 초기 로드는 항상 실행
  });
  
  // 사용자 통계 조회 - 업무가 있을 때만 자동 새로고침
  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'], // 전체 프로젝트 통일 쿼리 키
    queryFn: async () => {
      const response = await apiClient.get('/users/me/stats');
      return response.data || {};
    },
    refetchInterval: config.features?.autoRefresh && tasks.length > 0 ? 60000 : false,
    staleTime: config.features?.cache ? 120000 : 0,
    enabled: true
  });
  
  // 후속업무 조회 - 후속업무가 있을 때만 자동 새로고침
  const { data: followUpTasks = [], isLoading: followUpLoading } = useQuery({
    queryKey: ['followUp'], // 전체 프로젝트 통일 쿼리 키
    queryFn: async () => {
      const response = await apiClient.get('/tasks/follow-up');
      return response.data?.followUpTasks || [];
    },
    refetchInterval: config.features?.autoRefresh && followUpTasks.length > 0 ? 45000 : false,
    staleTime: config.features?.cache ? 90000 : 0,
    enabled: true
  });
  
  // 알림 조회 - 알림이 있을 때만 자동 새로고침
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications'], // 전체 프로젝트 통일 쿼리 키
    queryFn: async () => {
      const response = await apiClient.get('/notifications');
      return response.data || [];
    },
    refetchInterval: config.features?.autoRefresh && notifications.length > 0 ? 60000 : false,
    staleTime: config.features?.cache ? 120000 : 0,
    enabled: true
  });
  
  // 전체 로딩 상태
  const isLoading = tasksLoading || statsLoading || followUpLoading || notificationsLoading;
  
  // 상태별 업무 분류
  const getStatusGroups = useCallback(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    
    return {
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
      cancelled: {
        label: "취소",
        emoji: "🔴",
        color: "bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200",
        borderColor: "border-red-200",
        textColor: "text-red-800",
        iconColor: "text-red-600",
        titleBg: "bg-rose-600",
        tasks: safeTasks.filter(task => task.status === 'cancelled')
      }
    };
  }, [tasks]);
  
  // 후속업무 확인
  const handleConfirmFollowUp = useCallback(async (taskId: number) => {
    try {
      setLoading(true);
      
      // 서버에 확인 요청
      await apiClient.patch(`/tasks/${taskId}/confirm`);
      
      // 즉시 UI 업데이트 - 확인된 업무를 followUp 캐시에서 제거
      queryClient.setQueryData(['followUp'], (oldData: any) => {
        if (!oldData) return [];
        return oldData.filter((task: any) => task.id !== taskId);
      });
      
      // 캐시 무효화로 완전한 데이터 동기화
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['followUp'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] })
      ]);
      
      console.log('✅ 후속업무 확인 완료 - UI 즉시 업데이트:', taskId);
    } catch (err) {
      setError(err as Error);
      console.error('❌ 후속업무 확인 실패:', err);
      
      // 오류 발생 시 캐시 복원
      queryClient.invalidateQueries({ queryKey: ['followUp'] });
    } finally {
      setLoading(false);
    }
  }, [apiClient, queryClient]);
  
  // 후속업무 반려
  const handleRejectFollowUp = useCallback(async (taskId: number, reason?: string) => {
    try {
      setLoading(true);
      
      // 서버에 반려 요청
      await apiClient.patch(`/tasks/${taskId}/reject`, { reason: reason || '반려 처리됨' });
      
      // 즉시 UI 업데이트 - 반려된 업무를 followUp 캐시에서 제거
      queryClient.setQueryData(['followUp'], (oldData: any) => {
        if (!oldData) return [];
        return oldData.filter((task: any) => task.id !== taskId);
      });
      
      // 캐시 무효화로 완전한 데이터 동기화
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['followUp'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] })
      ]);
      
      console.log('✅ 후속업무 반려 완료 - UI 즉시 업데이트:', taskId);
    } catch (err) {
      setError(err as Error);
      console.error('❌ 후속업무 반려 실패:', err);
      
      // 오류 발생 시 캐시 복원
      queryClient.invalidateQueries({ queryKey: ['followUp'] });
    } finally {
      setLoading(false);
    }
  }, [apiClient, queryClient]);
  
  // 데이터 새로고침
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
        queryClient.invalidateQueries({ queryKey: ['followUp'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      ]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [queryClient]);
  
  // 미처리 후속업무 필터링
  const pendingFollowUpTasks = followUpTasks.filter(
    task => task.status === 'pending'
  );
  
  return {
    // 데이터
    data: {
      tasks,
      stats,
      followUpTasks,
      notifications,
      pendingFollowUpTasks
    },
    
    // 상태
    loading: isLoading || loading,
    error,
    
    // 계산된 값
    statusGroups: getStatusGroups(),
    
    // 액션
    handleConfirmFollowUp,
    handleRejectFollowUp,
    refreshData,
    
    // 유틸리티
    clearError: () => setError(null)
  };
};

export default useDashboard; 