import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useMemo } from "react";

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  workDate: string;
  dueDate?: string;
  category: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

// 중앙집중식 업무목록 관리 훅
export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 메인 업무목록 조회 (최적화된 설정)
  const { data: allTasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ["tasks", "all"],
    queryFn: async () => {
      console.log("🔄 업무목록 API 호출 - 중앙집중식 useTasks");
      const response = await fetch("/api/tasks", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("업무목록 조회 실패");
      }
      const result = await response.json();
      console.log(`✅ 업무목록 조회 성공: ${result.tasks?.length || 0}개`);
      return result.tasks || [];
    },
    // 🎯 성능 최적화 설정
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    refetchInterval: false, // ❌ 자동 새로고침 비활성화
    refetchOnWindowFocus: false, // ❌ 창 포커스 시 새로고침 비활성화
    refetchOnReconnect: true, // ✅ 네트워크 재연결 시에만 새로고침
    enabled: !!user, // 로그인된 경우에만 실행
  });

  // 필터링된 업무목록 반환 함수
  const getFilteredTasks = useMemo(() => {
    return (filters: TaskFilters = {}) => {
      if (!allTasks || allTasks.length === 0) return [];

      return allTasks.filter((task: Task) => {
        // 상태 필터
        if (filters.status && task.status !== filters.status) {
          return false;
        }

        // 우선순위 필터
        if (filters.priority && task.priority !== filters.priority) {
          return false;
        }

        // 카테고리 필터
        if (filters.category && task.category !== filters.category) {
          return false;
        }

        // 담당자 필터
        if (filters.assignedTo && task.assignedTo !== filters.assignedTo) {
          return false;
        }

        // 날짜 범위 필터
        if (filters.startDate || filters.endDate) {
          const taskDate = new Date(task.workDate);
          
          if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            if (taskDate < startDate) return false;
          }
          
          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            if (taskDate > endDate) return false;
          }
        }

        // 검색어 필터
        if (filters.searchTerm) {
          const searchTerm = filters.searchTerm.toLowerCase();
          const titleMatch = task.title.toLowerCase().includes(searchTerm);
          const descriptionMatch = task.description?.toLowerCase().includes(searchTerm) || false;
          const categoryMatch = task.category.toLowerCase().includes(searchTerm);
          
          if (!titleMatch && !descriptionMatch && !categoryMatch) {
            return false;
          }
        }

        return true;
      });
    };
  }, [allTasks]);

  // 오늘 업무 조회
  const getTodayTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return getFilteredTasks({ startDate: today, endDate: today });
  }, [getFilteredTasks]);

  // 주간 업무 조회 (특정 주간)
  const getWeeklyTasks = useMemo(() => {
    return (startDate: string, endDate: string) => {
      return getFilteredTasks({ startDate, endDate });
    };
  }, [getFilteredTasks]);

  // 상태별 업무 통계
  const getTaskStats = useMemo(() => {
    if (!allTasks || allTasks.length === 0) {
      return {
        total: 0,
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        postponed: 0,
        cancelled: 0,
      };
    }

    return allTasks.reduce((stats: any, task: Task) => {
      stats.total++;
      stats[task.status] = (stats[task.status] || 0) + 1;
      return stats;
    }, {
      total: 0,
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      postponed: 0,
      cancelled: 0,
    });
  }, [allTasks]);

  // 캐시 무효화 및 새로고침
  const invalidateAndRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    refetch();
  };

  // 🔌 독립 모듈 연동 함수들
  const syncWithExternalModule = (moduleData: Task[]) => {
    console.log(`🔄 외부 모듈 데이터 동기화: ${moduleData.length}개 업무`);
    queryClient.setQueryData(["tasks", "all"], moduleData);
  };

  const notifyExternalUpdate = (updatedTask: Task) => {
    console.log(`📢 외부 모듈에 업무 변경 알림: ${updatedTask.title}`);
    // 전체 캐시 무효화하여 모든 컴포넌트에 변경사항 전파
    invalidateAndRefetch();
  };

  const getExternalModuleProps = () => ({
    // 외부 모듈이 사용할 수 있는 함수들
    onTaskUpdate: notifyExternalUpdate,
    onDataSync: syncWithExternalModule,
    invalidateCache: invalidateAndRefetch,
    currentTasks: allTasks,
  });

  // 🎯 향상된 상태 관리
  const isInitialLoading = isLoading && !allTasks.length;
  const isRefreshing = isLoading && allTasks.length > 0;
  const isEmpty = !isLoading && allTasks.length === 0;
  const hasError = !!error;

  // 🔄 에러 복구 함수
  const retryWithBackoff = async (retryCount = 0) => {
    const maxRetries = 3;
    const delay = Math.pow(2, retryCount) * 1000; // 지수 백오프
    
    if (retryCount < maxRetries) {
      setTimeout(() => {
        console.log(`🔄 업무목록 재시도 (${retryCount + 1}/${maxRetries})`);
        refetch();
      }, delay);
    }
  };

      return {
    // 데이터
    allTasks,
    todayTasks: getTodayTasks,
    taskStats: getTaskStats,
    
    // 🎯 향상된 상태
    isLoading,
    isInitialLoading,
    isRefreshing,
    isEmpty,
    hasError,
    error,
    
    // 함수
    getFilteredTasks,
    getWeeklyTasks,
    invalidateAndRefetch,
    refetch,
    retryWithBackoff,
    
    // 🔌 외부 모듈 연동
    syncWithExternalModule,
    notifyExternalUpdate,
    getExternalModuleProps,
  };
}

// 특정 업무 조회 훅
export function useTask(taskId: number) {
  const { allTasks } = useTasks();
  
  return useMemo(() => {
    return allTasks.find((task: Task) => task.id === taskId);
  }, [allTasks, taskId]);
} 