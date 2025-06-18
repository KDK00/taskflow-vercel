import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { Header } from "@/components/layout/header";
import { FloatingShapes } from "@/components/ui/floating-shapes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Calendar, 
  TrendingUp,
  Clock,
  BarChart3,
  PieChart,
  Users,
  CheckCircle,
  AlertTriangle,
  Download,
  Printer,
  Share2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Table,
  Target,
  ArrowRight,
  Timer,
  AlertCircle
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, isSameDay, differenceInHours, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import type { DailyTaskWithDetails } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";

interface DailyTaskWithDetails {
  id: number;
  title: string;
  description?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  assignedTo: string;
  followUpAssignee?: string;
  progress?: number;
  workDate?: string;
  createdAt: string;
  estimatedHours?: number;
  actualHours?: number;
  startedAt?: string;
  completedAt?: string;
  targetPlace?: string;
}

interface TaskFlowItem {
  from: string;
  to: string;
  taskTitle: string;
  taskId: number;
  assignedDate: string;
  status: string;
}

interface ReportMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  postponedTasks: number;
  cancelledTasks: number;
  scheduledTasks: number;
  completionRate: number;
  averageProgress: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  efficiencyRate: number;
  categoryBreakdown: { [key: string]: number };
  priorityBreakdown: { [key: string]: number };
  priorityCompletionRates: { [key: string]: number };
  categoryProductivity: { [key: string]: number };
  dailyProductivity: { [key: string]: number };
  timeToStart: { average: number; breakdown: { [key: string]: number } };
  timeToComplete: { average: number; breakdown: { [key: string]: number } };
  focusHours: { [key: string]: number };
  taskFlow: TaskFlowItem[];
  tasksInPeriod: DailyTaskWithDetails[];
}

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportData, setReportData] = useState<ReportMetrics | null>(null);
  const [currentView, setCurrentView] = useState<"employee" | "manager">(
    user?.role === "developer" || user?.role === "manager" ? "manager" : "employee"
  );
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // WebSocket 연결 (실시간 업데이트)
  const { lastMessage } = useWebSocket();

  // 업무 데이터 조회 (실시간 연동)
  const { 
    data: tasks = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery<DailyTaskWithDetails[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('업무 목록 조회에 실패했습니다.');
      }
      
      const data = await response.json();
      return data?.tasks || [];
    },
    retry: 3,
    refetchInterval: 10000,
    staleTime: 5000
  });

  // WebSocket 메시지 처리
  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const data = JSON.parse(lastMessage.data);
        console.log('📨 WebSocket 메시지 수신 (보고서):', data.type);
        
        if (data.type === 'TASK_UPDATE' || 
            data.type === 'task_created' || 
            data.type === 'task_updated' || 
            data.type === 'task_deleted') {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      } catch (error) {
        console.error('WebSocket 메시지 파싱 오류:', error);
      }
    }
  }, [lastMessage, queryClient, toast]);

  // 보고서 데이터 계산
  const reportAnalytics = useMemo((): ReportMetrics | null => {
    if (!tasks.length) return null;

    // 선택된 기간에 해당하는 업무 필터링
    const tasksInPeriod = tasks.filter(task => {
      const taskDate = new Date(task.workDate || task.createdAt);
      const selectedStart = startOfDay(selectedDate);
      
      switch (reportType) {
        case 'daily':
          return isSameDay(taskDate, selectedStart);
        case 'weekly':
          const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
          return taskDate >= weekStart && taskDate <= weekEnd;
        case 'monthly':
          const monthStart = startOfMonth(selectedDate);
          const monthEnd = endOfMonth(selectedDate);
          return taskDate >= monthStart && taskDate <= monthEnd;
        case 'yearly':
          const yearStart = startOfYear(selectedDate);
          const yearEnd = endOfYear(selectedDate);
          return taskDate >= yearStart && taskDate <= yearEnd;
        default:
          return false;
      }
    });

    const totalTasks = tasksInPeriod.length;
    if (totalTasks === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        postponedTasks: 0,
        cancelledTasks: 0,
        scheduledTasks: 0,
        completionRate: 0,
        averageProgress: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        efficiencyRate: 0,
        categoryBreakdown: {},
        priorityBreakdown: {},
        priorityCompletionRates: {},
        categoryProductivity: {},
        dailyProductivity: {},
        timeToStart: { average: 0, breakdown: {} },
        timeToComplete: { average: 0, breakdown: {} },
        focusHours: {},
        taskFlow: [],
        tasksInPeriod: []
      };
    }

    // 상태별 통계
    const completedTasks = tasksInPeriod.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasksInPeriod.filter(t => t.status === 'in_progress').length;
    const postponedTasks = tasksInPeriod.filter(t => t.status === 'postponed').length;
    const cancelledTasks = tasksInPeriod.filter(t => t.status === 'cancelled').length;
    const scheduledTasks = tasksInPeriod.filter(t => t.status === 'scheduled').length;

    // 완료율 계산
    const completionRate = Math.round((completedTasks / totalTasks) * 100);

    // 평균 진행률 계산
    const totalProgress = tasksInPeriod.reduce((sum, task) => sum + (task.progress || 0), 0);
    const averageProgress = Math.round(totalProgress / totalTasks);

    // 시간 통계
    const totalEstimatedHours = tasksInPeriod.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const totalActualHours = tasksInPeriod.reduce((sum, task) => sum + (task.actualHours || 0), 0);
    const efficiencyRate = totalEstimatedHours > 0 ? Math.round((totalActualHours / totalEstimatedHours) * 100) : 0;

    // 카테고리별 분포
    const categoryBreakdown = tasksInPeriod.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // 우선순위별 분포
    const priorityBreakdown = tasksInPeriod.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // 우선순위별 완료율
    const priorityCompletionRates = Object.keys(priorityBreakdown).reduce((acc, priority) => {
      const totalPriorityTasks = tasksInPeriod.filter(t => t.priority === priority).length;
      const completedPriorityTasks = tasksInPeriod.filter(t => t.priority === priority && t.status === 'completed').length;
      acc[priority] = totalPriorityTasks > 0 ? Math.round((completedPriorityTasks / totalPriorityTasks) * 100) : 0;
      return acc;
    }, {} as { [key: string]: number });

    // 카테고리별 생산성 (완료된 업무/전체 업무)
    const categoryProductivity = Object.keys(categoryBreakdown).reduce((acc, category) => {
      const totalCategoryTasks = tasksInPeriod.filter(t => t.category === category).length;
      const completedCategoryTasks = tasksInPeriod.filter(t => t.category === category && t.status === 'completed').length;
      acc[category] = totalCategoryTasks > 0 ? Math.round((completedCategoryTasks / totalCategoryTasks) * 100) : 0;
      return acc;
    }, {} as { [key: string]: number });

    // 업무 예정→진행 시간 분석
    const timeToStartData = tasksInPeriod
      .filter(task => task.startedAt && task.createdAt)
      .map(task => {
        const created = new Date(task.createdAt);
        const started = new Date(task.startedAt!);
        return {
          task,
          hours: differenceInHours(started, created)
        };
      });

    const averageTimeToStart = timeToStartData.length > 0 
      ? Math.round(timeToStartData.reduce((sum, item) => sum + item.hours, 0) / timeToStartData.length)
      : 0;

    // 업무 진행→완료 시간 분석
    const timeToCompleteData = tasksInPeriod
      .filter(task => task.completedAt && task.startedAt)
      .map(task => {
        const started = new Date(task.startedAt!);
        const completed = new Date(task.completedAt!);
        return {
          task,
          hours: differenceInHours(completed, started)
        };
      });

    const averageTimeToComplete = timeToCompleteData.length > 0
      ? Math.round(timeToCompleteData.reduce((sum, item) => sum + item.hours, 0) / timeToCompleteData.length)
      : 0;

    // 업무집중시간 (시간대별 완료 업무 수)
    const focusHours = tasksInPeriod
      .filter(task => task.completedAt)
      .reduce((acc, task) => {
        const hour = new Date(task.completedAt!).getHours();
        const hourRange = `${hour}:00-${hour + 1}:00`;
        acc[hourRange] = (acc[hourRange] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

    // 업무 FLOW 추적 (후속담당자 지정된 업무)
    const taskFlow: TaskFlowItem[] = tasksInPeriod
      .filter(task => task.followUpAssignee)
      .map(task => ({
        from: task.assignedTo,
        to: task.followUpAssignee!,
        taskTitle: task.title,
        taskId: task.id,
        assignedDate: task.workDate || task.createdAt,
        status: task.status
      }));

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      postponedTasks,
      cancelledTasks,
      scheduledTasks,
      completionRate,
      averageProgress,
      totalEstimatedHours,
      totalActualHours,
      efficiencyRate,
      categoryBreakdown,
      priorityBreakdown,
      priorityCompletionRates,
      categoryProductivity,
      dailyProductivity: {},
      timeToStart: { 
        average: averageTimeToStart, 
        breakdown: timeToStartData.reduce((acc, item) => {
          acc[item.task.category] = (acc[item.task.category] || 0) + item.hours;
          return acc;
        }, {} as { [key: string]: number })
      },
      timeToComplete: { 
        average: averageTimeToComplete,
        breakdown: timeToCompleteData.reduce((acc, item) => {
          acc[item.task.category] = (acc[item.task.category] || 0) + item.hours;
          return acc;
        }, {} as { [key: string]: number })
      },
      focusHours,
      taskFlow,
      tasksInPeriod
    };
  }, [tasks, selectedDate, reportType]);

  // 기간 표시 포맷팅
  const formatPeriodDisplay = () => {
    switch (reportType) {
      case 'daily':
        return format(selectedDate, 'yyyy년 MM월 dd일 (EEE)', { locale: ko });
      case 'weekly':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'MM월 dd일', { locale: ko })} ~ ${format(weekEnd, 'MM월 dd일', { locale: ko })}`;
      case 'monthly':
        return format(selectedDate, 'yyyy년 MM월', { locale: ko });
      case 'yearly':
        return format(selectedDate, 'yyyy년', { locale: ko });
      default:
        return '';
    }
  };

  // 기간 이동
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const increment = direction === 'next' ? 1 : -1;
    
    switch (reportType) {
      case 'daily':
        setSelectedDate(addDays(selectedDate, increment));
        break;
      case 'weekly':
        setSelectedDate(addWeeks(selectedDate, increment));
        break;
      case 'monthly':
        setSelectedDate(addMonths(selectedDate, increment));
        break;
      case 'yearly':
        setSelectedDate(addYears(selectedDate, increment));
        break;
    }
  };

  // 보고서 타입 라벨
  const getReportTypeLabel = () => {
    switch (reportType) {
      case 'daily': return '일간보고서';
      case 'weekly': return '주간보고서';
      case 'monthly': return '월간보고서';
      case 'yearly': return '연간보고서';
      default: return '보고서';
    }
  };

  // 상태별 아이콘 표시 함수
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'scheduled': return { icon: '🔵', text: '예정' };
      case 'in_progress': return { icon: '🟡', text: '진행' };
      case 'completed': return { icon: '🟢', text: '완료' };
      case 'cancelled': return { icon: '🔴', text: '취소' };
      case 'postponed': return { icon: '⏸️', text: '연기' };
      default: return { icon: '⚪', text: '미정' };
    }
  };

  // Print and PDF functions
  const handlePrintPreview = () => {
    // 인쇄 미리보기 모드 활성화
    setShowPrintPreview(true);
    
    // DOM 렌더링 완료 대기 후 인쇄 대화상자 열기
    setTimeout(() => {
      window.print();
    }, 800); // 렌더링 시간 충분히 확보
    
    // 인쇄 완료 후 미리보기 모드 해제
    setTimeout(() => {
      setShowPrintPreview(false);
    }, 2000); // 인쇄 완료 대기 시간 증가
  };

  const handleSavePDF = async () => {
    try {
      // 사용자 안내 메시지
      const userConfirm = window.confirm(
        '보고서를 PDF로 저장하시겠습니까?\n\n' +
        '확인을 클릭하면 인쇄 대화상자가 열립니다.\n' +
        '대상을 "PDF로 저장"으로 선택하여 저장해주세요.'
      );
      
      if (!userConfirm) {
        return;
      }

      // PDF 저장을 위한 미리보기 모드 활성화
    setShowPrintPreview(true);
      
      // DOM 렌더링 완료 대기
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 파일명 생성
      const fileName = `${getReportTypeLabel()}_${formatPeriodDisplay().replace(/[^\w\s가-힣]/g, '_')}_${format(new Date(), 'yyyyMMdd')}`;
      
      // 브라우저 제목 임시 변경 (PDF 파일명에 반영됨)
      const originalTitle = document.title;
      document.title = fileName;
      
      // PDF 저장용 인쇄 대화상자 열기
      window.print();
      
      // 제목 복원 및 미리보기 모드 해제
      setTimeout(() => {
        document.title = originalTitle;
      setShowPrintPreview(false);
      }, 2000);
      
    } catch (error) {
      console.error('PDF 저장 중 오류 발생:', error);
      alert('PDF 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
      setShowPrintPreview(false);
    }
  };

  // Compact summary cards for A4 printing
  const renderCompactSummaryCards = () => {
    if (!reportAnalytics) return null;

    return (
              <div className="grid grid-cols-4 gap-2 mb-4 print:mb-3">
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-center">
            <div className="text-gray-700 font-bold text-lg">{reportAnalytics.scheduledTasks}</div>
            <div className="text-gray-600 text-xs font-medium">🔵 예정</div>
          </div>
          <div className="bg-gray-100 border border-gray-400 rounded-lg p-3 text-center">
            <div className="text-gray-800 font-bold text-lg">{reportAnalytics.inProgressTasks}</div>
            <div className="text-gray-700 text-xs font-medium">🟡 진행</div>
          </div>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-center">
            <div className="text-gray-700 font-bold text-lg">{reportAnalytics.completedTasks}</div>
            <div className="text-gray-600 text-xs font-medium">🟢 완료</div>
          </div>
          <div className="bg-gray-100 border border-gray-400 rounded-lg p-3 text-center">
            <div className="text-gray-800 font-bold text-lg">{reportAnalytics.cancelledTasks}</div>
            <div className="text-gray-700 text-xs font-medium">🔴 취소</div>
          </div>
        </div>
    );
  };

  // Compact metrics for A4 printing (색상 변경: 회색 계열)
  const renderCompactMetrics = () => {
    if (!reportAnalytics) return null;

    return (
      <div className="grid grid-cols-2 gap-4 mb-4 print:mb-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="text-gray-800 font-semibold text-sm mb-2">📈 성과 지표</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-700">완료율</span>
              <span className="font-semibold">{reportAnalytics.completionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">평균 진행률</span>
              <span className="font-semibold">{reportAnalytics.averageProgress}%</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="text-gray-800 font-semibold text-sm mb-2">📊 카테고리별 분포</h4>
          <div className="space-y-1 text-xs">
            {Object.entries(reportAnalytics.categoryBreakdown).slice(0, 3).map(([category, count]) => (
              <div key={category} className="flex justify-between">
                <span className="text-gray-700">{category}</span>
                <span className="font-semibold">{count}개</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Compact task table for A4 printing (색상 변경: 회색 계열)
  const renderCompactTaskTable = (tasks: DailyTaskWithDetails[], title: string) => {
    const hasNoTasks = !tasks.length;

    return (
      <div className="mb-4 print:mb-3 page-break-inside-avoid">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-gray-800 font-semibold text-sm flex items-center gap-2">
            <span>{title}</span>
            {hasNoTasks && (
              <span className="text-gray-500 text-xs font-normal ml-2">
                - 해당기간의 업무가 없습니다
              </span>
            )}
          </h4>
          {!hasNoTasks && (
            <span className="text-xs text-gray-600">({tasks.length}개)</span>
          )}
        </div>
        
        {!hasNoTasks && (
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[120px]">일자</th>
                  <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[120px]">업무 제목</th>
                  <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[80px]">상태</th>
                  <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[90px]">우선순위</th>
                  <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[90px]">담당자</th>
                  <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[100px]">진행률</th>
                </tr>
              </thead>
              <tbody>
                {tasks.sort((a, b) => new Date(a.workDate || a.createdAt).getTime() - new Date(b.workDate || b.createdAt).getTime()).map((task, index) => {
                  const statusInfo = getStatusDisplay(task.status);
                  const taskDate = new Date(task.workDate || task.createdAt);
                  const dateOnly = format(taskDate, 'MM/dd', { locale: ko });
                  const dayOnly = format(taskDate, '(EEE)', { locale: ko });
                  const scheduledTime = format(taskDate, 'HH:mm');
                  const isSaturday = taskDate.getDay() === 6;
                  const isSunday = taskDate.getDay() === 0;
                  
                  return (
                    <tr key={task.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                                       <td className="p-2 border-b border-gray-100 text-center">
                                   <div className="text-sm font-bold text-gray-800">
                                     {dateOnly}<span className={isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-gray-800'}>{dayOnly}</span>
                                   </div>
                                   <div className="text-sm text-gray-900">
                                     {scheduledTime}
                                   </div>
                      </td>
                      <td className="p-2 border-b border-gray-100 font-medium">
                        <div>
                          <div>
                            <span className="font-bold text-gray-800 bg-gray-300 px-2 py-1 rounded mr-2">
                              {task.targetPlace || '미지정'}
                        </span>
                            <span className="font-semibold">
                              {task.title.startsWith('[확인요청]') ? '🔴 ' : ''}{task.title}
                            </span>
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 border-b border-gray-100">
                        <div className="flex items-center gap-1">
                          <span className={`text-lg ${
                            task.status === 'completed' ? 'text-green-600' :
                            task.status === 'in_progress' ? 'text-yellow-500' :
                            task.status === 'scheduled' ? 'text-blue-600' :
                            task.status === 'postponed' ? 'text-gray-500' :
                            task.status === 'cancelled' ? 'text-red-600' : 'text-gray-400'
                          }`}>●</span>
                          <span className="text-xs">{statusInfo.text}</span>
                        </div>
                      </td>
                      <td className="p-2 border-b border-gray-100">
                        <span className={`px-2 py-1 rounded text-xs ${
                          task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.priority === 'urgent' ? '긴급' :
                           task.priority === 'high' ? '높음' :
                           task.priority === 'medium' ? '보통' : '낮음'}
                        </span>
                      </td>
                      <td className="p-2 border-b border-gray-100">{task.assignedTo}</td>
                      <td className="p-2 border-b border-gray-100">
                        <div className="flex items-center gap-1">
                          <div className="w-12 bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-gray-600 h-1 rounded-full" 
                              style={{ width: `${task.progress || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{task.progress || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderDetailedReportCompact = () => {
    if (!reportAnalytics || !reportAnalytics.tasksInPeriod.length) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-600 text-sm">선택된 기간에 해당하는 업무가 없습니다.</p>
        </div>
      );
    }

    switch (reportType) {
      case "daily":
        return renderCompactTaskTable(reportAnalytics.tasksInPeriod, `${formatPeriodDisplay()} 업무 목록`);
      
      case "weekly":
        // 주간보고서: 날짜 중간제목 없이 모든 업무를 하나의 테이블로 표시
        return renderCompactTaskTable(reportAnalytics.tasksInPeriod, `${formatPeriodDisplay()} 업무 목록`);
      
      case "monthly":
        const weeks = eachWeekOfInterval({
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate)
        }, { weekStartsOn: 1 });
        
        return (
          <div className="space-y-1">
            {weeks.map((weekStart, index) => {
              const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
              const weekTasks = reportAnalytics.tasksInPeriod.filter(task => {
                const taskDate = new Date(task.workDate || task.createdAt);
                return taskDate >= weekStart && taskDate <= weekEnd;
              });
              
              // 주차별 음영 구분 (홀수 주차는 흰색, 짝수 주차는 회색 배경)
              const isEvenWeek = (index + 1) % 2 === 0;
              
              return (
                <div 
                  key={weekStart.toISOString()} 
                  className={`${isEvenWeek ? 'bg-gray-50' : 'bg-white'} p-3 rounded-lg border border-gray-200`}
                >
                  <div className="mb-2">
                    <h4 className="text-gray-800 font-semibold text-sm flex items-center gap-2">
                      <span>{index + 1}주차 ({format(weekStart, 'MM/dd', { locale: ko })} ~ {format(weekEnd, 'MM/dd', { locale: ko })})</span>
                      {weekTasks.length === 0 && (
                        <span className="text-gray-500 text-xs font-normal ml-2">
                          - 해당기간의 업무가 없습니다
                        </span>
                      )}
                      {weekTasks.length > 0 && (
                        <span className="text-xs text-gray-600">({weekTasks.length}개)</span>
                      )}
                    </h4>
                  </div>
                  
                  {weekTasks.length > 0 && (
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[120px]">일자</th>
                            <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[120px]">업무 제목</th>
                            <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[80px]">상태</th>
                            <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[90px]">우선순위</th>
                            <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[90px]">담당자</th>
                            <th className="text-left p-2 font-semibold text-gray-800 border-b min-w-[100px]">진행률</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weekTasks.sort((a, b) => new Date(a.workDate || a.createdAt).getTime() - new Date(b.workDate || b.createdAt).getTime()).map((task, taskIndex) => {
                            const statusInfo = getStatusDisplay(task.status);
                            const taskDate = new Date(task.workDate || task.createdAt);
                            const dateOnly = format(taskDate, 'MM/dd', { locale: ko });
                            const dayOnly = format(taskDate, '(EEE)', { locale: ko });
                            const scheduledTime = format(taskDate, 'HH:mm');
                            const isSaturday = taskDate.getDay() === 6;
                            const isSunday = taskDate.getDay() === 0;
                            
                            return (
                              <tr key={task.id} className={taskIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="p-2 border-b border-gray-100 text-center">
                                  <div className="text-sm font-bold text-gray-800">
                                    {dateOnly}<span className={isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-gray-800'}>{dayOnly}</span>
                                  </div>
                                  <div className="text-sm text-gray-900">
                                    {scheduledTime}
                                  </div>
                                </td>
                                <td className="p-2 border-b border-gray-100 font-medium">
                                  <div>
                                    <div>
                                      <span className="font-bold text-gray-800 bg-gray-300 px-2 py-1 rounded mr-2">
                                        {task.targetPlace || '미지정'}
                                      </span>
                                      <span className="font-semibold">
                                        {task.title.startsWith('[확인요청]') ? '🔴 ' : ''}{task.title}
                                      </span>
                                    </div>
                                    {task.description && (
                                      <div className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                                        {task.description}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2 border-b border-gray-100">
                                  <div className="flex items-center gap-1">
                                    <span className={`text-lg ${
                                      task.status === 'completed' ? 'text-green-600' :
                                      task.status === 'in_progress' ? 'text-yellow-500' :
                                      task.status === 'scheduled' ? 'text-blue-600' :
                                      task.status === 'postponed' ? 'text-gray-500' :
                                      task.status === 'cancelled' ? 'text-red-600' : 'text-gray-400'
                                    }`}>●</span>
                                    <span className="text-xs">{statusInfo.text}</span>
                                  </div>
                                </td>
                                <td className="p-2 border-b border-gray-100">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {task.priority === 'urgent' ? '긴급' :
                                     task.priority === 'high' ? '높음' :
                                     task.priority === 'medium' ? '보통' : '낮음'}
                                  </span>
                                </td>
                                <td className="p-2 border-b border-gray-100">{task.assignedTo}</td>
                                <td className="p-2 border-b border-gray-100">
                                  <div className="flex items-center gap-1">
                                    <div className="w-12 bg-gray-200 rounded-full h-1">
                                      <div 
                                        className="bg-gray-600 h-1 rounded-full" 
                                        style={{ width: `${task.progress || 0}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs">{task.progress || 0}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      
      case "yearly":
        const months = eachMonthOfInterval({
          start: startOfYear(selectedDate),
          end: endOfYear(selectedDate)
        });
        
        return (
          <div className="space-y-3">
            {months.map(month => {
              const monthTasks = reportAnalytics.tasksInPeriod.filter(task => {
                const taskDate = new Date(task.workDate || task.createdAt);
                return taskDate >= startOfMonth(month) && taskDate <= endOfMonth(month);
              });
              return renderCompactTaskTable(
                monthTasks, 
                `${format(month, 'MM월', { locale: ko })}`
              );
            })}
          </div>
        );
      
      default:
        return renderCompactTaskTable(reportAnalytics.tasksInPeriod, "업무 목록");
    }
  };

  // 기본분석내용 렌더링
  const renderDetailedAnalysis = () => {
    if (!reportAnalytics) return null;

    return (
      <div className="space-y-4 mb-6">
        {/* 진행시간 분석 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-gray-800 font-semibold text-sm mb-3 flex items-center gap-2">
            <Timer className="w-4 h-4" />
            진행시간 분석
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">업무 예정→진행 평균시간</span>
                <span className="font-semibold">{reportAnalytics.timeToStart.average}시간</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">업무 진행→완료 평균시간</span>
                <span className="font-semibold">{reportAnalytics.timeToComplete.average}시간</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">업무완료율</span>
                <span className="font-semibold">{reportAnalytics.completionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">평균 진행률</span>
                <span className="font-semibold">{reportAnalytics.averageProgress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 우선순위별 완료율 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-gray-800 font-semibold text-sm mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            우선순위별 업무완료율
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(reportAnalytics.priorityCompletionRates).map(([priority, rate]) => (
              <div key={priority} className="flex justify-between">
                <span className="text-gray-600">
                  {priority === 'urgent' ? '긴급' :
                   priority === 'high' ? '높음' :
                   priority === 'medium' ? '보통' : '낮음'}
                </span>
                <span className="font-semibold">{rate}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 카테고리별 생산성 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-gray-800 font-semibold text-sm mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            카테고리별 생산성
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(reportAnalytics.categoryProductivity).slice(0, 6).map(([category, productivity]) => (
              <div key={category} className="flex justify-between">
                <span className="text-gray-600">{category}</span>
                <span className="font-semibold">{productivity}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 업무집중시간 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-gray-800 font-semibold text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            업무집중시간 (완료 기준)
          </h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {Object.entries(reportAnalytics.focusHours)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([timeRange, count]) => (
              <div key={timeRange} className="flex justify-between">
                <span className="text-gray-600">{timeRange}</span>
                <span className="font-semibold">{count}건</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 업무FLOW 항목 렌더링
  const renderTaskFlow = () => {
    if (!reportAnalytics || !reportAnalytics.taskFlow.length) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <h4 className="text-gray-800 font-semibold text-sm mb-2 flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            업무FLOW - 업무추적 (후속담당자 지정)
            <span className="text-gray-500 text-xs font-normal ml-2">
              - 해당기간의 후속업무가 없습니다
            </span>
          </h4>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <h4 className="text-gray-800 font-semibold text-sm mb-3 flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          업무FLOW - 업무추적 (후속담당자 지정)
          <span className="text-xs text-gray-600 ml-2">({reportAnalytics.taskFlow.length}건)</span>
        </h4>
        <div className="space-y-2">
          {reportAnalytics.taskFlow.map((flow, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded p-2 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-700">{flow.from}</span>
                <ArrowRight className="w-3 h-3 text-gray-500" />
                <span className="font-semibold text-gray-700">{flow.to}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  flow.status === 'completed' ? 'bg-green-100 text-green-800' :
                  flow.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                  flow.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {flow.status === 'completed' ? '완료' :
                   flow.status === 'in_progress' ? '진행중' :
                   flow.status === 'scheduled' ? '예정' : '기타'}
                </span>
              </div>
              <div className="text-gray-600">{flow.taskTitle}</div>
              <div className="text-gray-500 text-xs mt-1">
                지정일: {format(new Date(flow.assignedDate), 'MM/dd', { locale: ko })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 인쇄 모드일 때는 완전히 다른 렌더링
  if (showPrintPreview) {
  return (
      <div className="print-mode">
        <div className="print-header mb-6">
          <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-800">📊 {getReportTypeLabel()}</h1>
            <p className="text-gray-600 mt-1">{formatPeriodDisplay()} | 업무 실적 보고서</p>
            <p className="text-sm text-gray-500 mt-1">출력일: {format(new Date(), 'yyyy년 MM월 dd일', { locale: ko })}</p>
          </div>
        </div>

        {!isLoading && reportAnalytics && (
          <div className="space-y-4">
            {/* Page 1: Compact Summary Analysis */}
            <div className="bg-white p-4 rounded-lg border page-break-inside-avoid">
              <div className="mb-3">
                <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2 mb-3">
                  <Eye className="w-5 h-5" />
                  Page 1: 요약 분석
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {getReportTypeLabel()} 업무 성과 및 핵심 지표
                </p>
                
                {/* Compact Summary Cards */}
                {renderCompactSummaryCards()}
                
                {/* Compact Metrics */}
                {renderCompactMetrics()}
              </div>
            </div>

            {/* Page 2+: Detailed Task Tables */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="mb-3">
                <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2 mb-3">
                  <Table className="w-5 h-5" />
                  Page 2+: 상세 업무 목록
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {reportType === 'daily' ? '해당일의 업무내용 전체' :
                   reportType === 'weekly' ? '각 일별 업무내용 전체' :
                   reportType === 'monthly' ? '각 주별 업무내용' :
                   '각 월별 업무내용'} 표 형태 나열
                </p>
                
                {renderDetailedReportCompact()}
              </div>
            </div>

            {/* Page 3+: Comprehensive Analysis */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="mb-3">
                <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5" />
                  Page 3+: 종합 분석
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  기본분석내용 - 시간분석, 완료율, 우선순위별 분석, 카테고리별 생산성, 업무집중시간
                </p>
                
                {renderDetailedAnalysis()}
              </div>
            </div>

            {/* Page 4+: Task Flow Analysis */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="mb-3">
                <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2 mb-3">
                  <ArrowRight className="w-5 h-5" />
                  Page 4+: 업무FLOW 분석
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  업무FLOW 항목 - 후속담당자 지정 업무 추적 및 분석
                </p>
                
                {renderTaskFlow()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg relative">
      <FloatingShapes />
      
      <div className="relative z-10">
          <Header
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="mt-4">
            {/* Page Header */}
              <div className="mb-6">
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-700 rounded-lg">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-gray-800">업무보고서</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">업무 실적 및 수치별 보고서 (12개 업무 기준)</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-white/50"
                          onClick={handlePrintPreview}
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          미리보기
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-white/50"
                          onClick={handleSavePDF}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PDF저장
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>

            {/* Report Type Tabs */}
            <Tabs value={reportType} onValueChange={setReportType} className="w-full">
                <TabsList className="grid w-full grid-cols-4 glass-card p-2">
                  <TabsTrigger 
                    value="daily" 
                    className="flex items-center space-x-2 data-[state=active]:bg-gray-600 data-[state=active]:text-white"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>일간보고서</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="weekly" 
                    className="flex items-center space-x-2 data-[state=active]:bg-gray-600 data-[state=active]:text-white"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>주간보고서</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="monthly" 
                    className="flex items-center space-x-2 data-[state=active]:bg-gray-600 data-[state=active]:text-white"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>월간보고서</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="yearly" 
                    className="flex items-center space-x-2 data-[state=active]:bg-gray-600 data-[state=active]:text-white"
                  >
                    <Target className="w-4 h-4" />
                    <span>연간보고서</span>
                  </TabsTrigger>
                </TabsList>

              {/* Period Navigation */}
                <div className="mt-6">
                  <Card className="glass-card">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigatePeriod('prev')}
                            className="bg-white/70 border-gray-200 text-gray-800 hover:bg-gray-50"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="font-medium text-gray-900 min-w-[200px] text-center px-4 py-2 bg-white/70 rounded-md">
                            {formatPeriodDisplay()}
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigatePeriod('next')}
                            className="bg-white/70 border-gray-200 text-gray-800 hover:bg-gray-50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>

                        {reportAnalytics && (
                          <div className="flex items-center gap-4 ml-auto">
                            <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                              총 {reportAnalytics.totalTasks}개 업무
                            </Badge>
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              완료율 {reportAnalytics.completionRate}%
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

              {/* Loading State */}
              {isLoading && (
                <Card className="glass-card mt-6">
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">업무 데이터를 로딩 중...</p>
                  </CardContent>
                </Card>
              )}

              {/* Report Content */}
              {!isLoading && reportAnalytics && (
                <div className="mt-6 space-y-6">
                  {/* Page 1: Compact Summary Analysis */}
                  <div className="glass-card page-break-inside-avoid">
                    <div className="p-6">
                      <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2 mb-3">
                        <Eye className="w-5 h-5" />
                        Page 1: 요약 분석
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {getReportTypeLabel()} 업무 성과 및 핵심 지표
                      </p>
                      
                      {/* Compact Summary Cards */}
                      {renderCompactSummaryCards()}
                      
                      {/* Compact Metrics */}
                      {renderCompactMetrics()}
                    </div>
                  </div>

                  {/* Page 2+: Detailed Task Tables */}
                  <div className="glass-card">
                    <div className="p-6">
                      <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2 mb-3">
                        <Table className="w-5 h-5" />
                        Page 2+: 상세 업무 목록
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {reportType === 'daily' ? '해당일의 업무내용 전체' :
                         reportType === 'weekly' ? '각 일별 업무내용 전체' :
                         reportType === 'monthly' ? '각 주별 업무내용' :
                         '각 월별 업무내용'} 표 형태 나열
                      </p>
                      
                      {renderDetailedReportCompact()}
                    </div>
                  </div>

                  {/* Page 3+: Comprehensive Analysis */}
                  <div className="glass-card">
                    <div className="p-6">
                      <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2 mb-3">
                        <BarChart3 className="w-5 h-5" />
                        Page 3+: 종합 분석
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        기본분석내용 - 시간분석, 완료율, 우선순위별 분석, 카테고리별 생산성, 업무집중시간
                      </p>
                      
                      {renderDetailedAnalysis()}
                    </div>
                  </div>

                  {/* Page 4+: Task Flow Analysis */}
                  <div className="glass-card">
                    <div className="p-6">
                      <h3 className="text-gray-800 font-semibold text-lg flex items-center gap-2 mb-3">
                        <ArrowRight className="w-5 h-5" />
                        Page 4+: 업무FLOW 분석
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        업무FLOW 항목 - 후속담당자 지정 업무 추적 및 분석
                      </p>
                      
                      {renderTaskFlow()}
                    </div>
                  </div>
                </div>
              )}

              {/* No Data State */}
              {!isLoading && (!tasks.length || !reportAnalytics) && (
                <Card className="glass-card mt-6">
                  <CardContent className="p-8 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">분석할 데이터가 없습니다</h3>
                    <p className="text-gray-600 mb-4">
                      {!tasks.length 
                        ? "등록된 업무가 없습니다. 업무를 먼저 등록해주세요."
                        : "선택된 기간에 해당하는 업무가 없습니다. 다른 기간을 선택해보세요."
                      }
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/task-management'}
                      className="bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      업무 관리로 이동
                    </Button>
                  </CardContent>
                </Card>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
} 