import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, Send, FileText, TrendingUp, Clock, CheckCircle, Printer, Save, Eye, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Edit2, Trash2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ko } from "date-fns/locale";
import { useTasks } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import { TaskCreateModal } from "@/modules/task-management/components/task-create-modal";
import { Checkbox } from '@/components/ui/checkbox';

// 업무목록 전체와 동일한 날짜 포맷 함수
const formatDateForTable = (dateStr: string, task?: any) => {
  if (!dateStr) return { dateOnly: '-', dayOnly: '', scheduledTime: '-', isSaturday: false, isSunday: false };
  try {
    const date = new Date(dateStr);
    // 1행: 25/06/13(금) 형태 - 날짜와 요일 분리
    const dateOnly = format(date, 'yy/MM/dd', { locale: ko });
    const dayOnly = format(date, '(EEE)', { locale: ko });
    
    // 2행: 설정시간 (업무에 설정된 시작시간, 없으면 '-')
    let scheduledTime = '-';
    if (task?.startTime) {
      scheduledTime = task.startTime;
    }
    
    const day = date.getDay(); // 0: Sunday, 6: Saturday
    const isSaturday = day === 6;
    const isSunday = day === 0;
    return { dateOnly, dayOnly, scheduledTime, isSaturday, isSunday };
  } catch {
    return { dateOnly: 'N/A', dayOnly: '', scheduledTime: '-', isSaturday: false, isSunday: false };
  }
};

interface WeeklyReportProps {
  userId?: number;
}

// 미리보기 컴포넌트
function ReportPreview({ 
  weekStart, 
  weekEnd, 
  weeklyStats, 
  completionRate, 
  reportContent, 
  nextWeekPlans, 
  weeklyTasks,
  reportType,
  monthStart,
  monthEnd
}: {
  weekStart: Date;
  weekEnd: Date;
  weeklyStats: any;
  completionRate: number;
  reportContent: string;
  nextWeekPlans: string;
  weeklyTasks: any[];
  reportType: 'weekly' | 'monthly';
  monthStart?: Date;
  monthEnd?: Date;
}) {
  const handlePrint = () => {
    // 인쇄 전 준비 - 스크롤 및 레이아웃 최적화
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTransform = document.body.style.transform;
    
    document.body.style.overflow = 'visible';
    document.body.style.position = 'static';
    document.body.style.transform = 'none';
    
    // 인쇄 스타일이 적용될 시간을 충분히 확보
    setTimeout(() => {
      // 인쇄 대화상자 열기
      window.print();
      
      // 인쇄 완료 후 원래 스타일 복원
      setTimeout(() => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.transform = originalTransform;
      }, 1000);
    }, 800); // 렌더링 시간 증가
  };

  return (
    <div className="report-preview bg-white p-6 max-w-4xl mx-auto print:shadow-none print:max-w-none" style={{ fontSize: '11px' }}>
      {/* 보고서 헤더 - 제목과 결제칸을 같은 행에 */}
      <div className="report-header mb-6">
        {/* 제목과 결제칸을 같은 행에 배치 */}
        <div className="flex justify-between items-start mb-4">
          {/* 제목 부분 */}
          <div className="flex-1">
            <h1 className="report-title text-xl font-bold text-gray-900 mb-1">
              {reportType === 'weekly' ? '주간' : '월간'} 업무 실적 보고서 
              <span className="text-lg font-normal">
                ({reportType === 'weekly' 
                  ? `${format(weekStart, "yyyy년 M월 d일", { locale: ko })} ~ ${format(weekEnd, "M월 d일", { locale: ko })}`
                  : `${format(monthStart!, "yyyy년 M월", { locale: ko })}`
                })
              </span>
            </h1>
            
            {/* 작성자 정보 */}
            <div className="text-sm text-gray-700 mb-3">
              작성자: admin, 개발팀
      </div>

            {/* 상황 요약 - 왼쪽 정렬 */}
            <div className="flex items-center space-x-6 text-xs">
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>총 {weeklyStats.total}개</span>
            </div>
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>완료 {weeklyStats.completed}개</span>
            </div>
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                <span>진행 {weeklyStats.inProgress}개</span>
            </div>
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                <span>완료율 {completionRate}%</span>
            </div>
        </div>
      </div>

          {/* 결제칸 (3칸) - 오른쪽 배치 */}
          <table className="border border-gray-400" style={{ fontSize: '10px' }}>
            <thead>
              <tr>
                <th className="border border-gray-400 px-3 py-1 bg-gray-50 text-center font-medium" style={{ width: '80px' }}>작성자</th>
                <th className="border border-gray-400 px-3 py-1 bg-gray-50 text-center font-medium" style={{ width: '80px' }}>관리자</th>
                <th className="border border-gray-400 px-3 py-1 bg-gray-50 text-center font-medium" style={{ width: '80px' }}>대표</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: '60px' }}>
                <td className="border border-gray-400 px-3 py-1 text-center"></td>
                <td className="border border-gray-400 px-3 py-1 text-center"></td>
                <td className="border border-gray-400 px-3 py-1 text-center"></td>
              </tr>
            </tbody>
          </table>
      </div>

        {/* 작성일자 */}
        <div className="text-right text-xs text-gray-600 -mb-4">
          작성일자: {format(new Date(), "yyyy년 M월 d일", { locale: ko })}, {format(new Date(), "HH:mm", { locale: ko })}
        </div>
      </div>

      {/* 1. 주간업무보고서 섹션 */}
      <div className="report-section mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
          1. {reportType === 'weekly' ? '주간' : '월간'}업무보고서 ({reportType === 'weekly' 
            ? `${format(weekStart, "M월 d일", { locale: ko })} ~ ${format(weekEnd, "M월 d일", { locale: ko })}`
            : `${format(monthStart!, "yyyy년 M월", { locale: ko })}`
          })
        </h2>
        
        {weeklyTasks.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            해당 기간에 업무가 없습니다.
          </div>
        ) : reportType === 'monthly' ? (
          // 월간보고서: 주차별로 그룹화하여 표시
          (() => {
            // 주차별 그룹화 로직
            const weeklyGroups: { [key: string]: any[] } = {};
            
            weeklyTasks.forEach(task => {
              const taskDate = new Date(task.workDate || task.dueDate || task.createdAt);
              const weekStart = new Date(taskDate);
              weekStart.setDate(taskDate.getDate() - taskDate.getDay() + 1); // 월요일로 설정
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6); // 일요일로 설정
              
              const weekKey = format(weekStart, "yyyy-MM-dd");
              const weekLabel = `${format(weekStart, "M월 d일", { locale: ko })} ~ ${format(weekEnd, "M월 d일", { locale: ko })}`;
              
              if (!weeklyGroups[weekKey]) {
                weeklyGroups[weekKey] = [];
              }
              weeklyGroups[weekKey].push({ ...task, weekLabel });
            });
            
            // 주차별로 정렬
            const sortedWeeks = Object.keys(weeklyGroups).sort();
            
            return sortedWeeks.map((weekKey, weekIndex) => {
              const weekTasks = weeklyGroups[weekKey];
              const weekLabel = weekTasks[0].weekLabel;
              
              return (
                <div key={weekKey} className="mb-6">
                  <h3 className="text-md font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                    📅 {weekIndex + 1}주차: {weekLabel}
                  </h3>
                  
                  <table className="w-full border-collapse border border-gray-400 mb-4" style={{ fontSize: '10px' }}>
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '80px' }}>시작날짜</th>
                        <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '70px' }}>업무구분</th>
                        <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '80px' }}>대상처</th>
                        <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '100px' }}>업무제목</th>
                        <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '250px' }}>설명</th>
                        <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '60px' }}>상태</th>
                        <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '60px' }}>진행률</th>
                </tr>
              </thead>
                    <tbody>
                      {weekTasks.map((task: any) => {
                        const dateInfo = formatDateForTable(task.workDate, task);
                        const getStatusLabel = (status: string) => {
                          switch (status) {
                            case 'scheduled': return '예정';
                            case 'in_progress': return '진행';
                            case 'completed': return '완료';
                            case 'postponed': return '연기';
                            case 'cancelled': return '취소';
                            default: return status;
                          }
                        };

                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case 'scheduled': return 'text-blue-600';
                            case 'in_progress': return 'text-yellow-500';
                            case 'completed': return 'text-green-600';
                            case 'postponed': return 'text-gray-500';
                            case 'cancelled': return 'text-red-600';
                            default: return 'text-gray-500';
                          }
                        };

                        const getCategoryStyle = (category: string) => {
                          switch (category) {
                            case '계약해지': return 'font-bold text-red-600';
                            case '신규계약': return 'font-bold text-blue-600';
                            default: return 'text-gray-800';
                          }
                        };
                        
                        return (
                  <tr key={task.id}>
                            <td className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                              {dateInfo.dateOnly}
                              <span className={dateInfo.isSunday ? 'text-red-500' : dateInfo.isSaturday ? 'text-blue-500' : 'text-gray-800'}>
                                {dateInfo.dayOnly}
                              </span>
                    </td>
                            <td className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                              <span className={getCategoryStyle(task.category || '일반')}>
                                {task.category || '일반'}
                              </span>
                            </td>
                            <td className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                              {task.targetPlace || '-'}
                            </td>
                            <td className="border border-gray-400 px-2 py-2 text-left" style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>
                      {task.title}
                    </td>
                            <td className="border border-gray-400 px-2 py-2 text-left" style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>
                              {task.description || '-'}
                    </td>
                            <td className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${getStatusColor(task.status).replace('text-', 'bg-')}`}></span>
                                <span>{getStatusLabel(task.status)}</span>
                              </div>
                    </td>
                            <td className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                      {task.progress}%
                    </td>
                  </tr>
                        );
                      })}
              </tbody>
            </table>
          </div>
              );
            });
          })()
        ) : (
          // 주간보고서: 기존 방식
          <table className="w-full border-collapse border border-gray-400" style={{ fontSize: '10px' }}>
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '80px' }}>시작날짜</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '70px' }}>업무구분</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '80px' }}>대상처</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '100px' }}>업무제목</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '250px' }}>설명</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '60px' }}>상태</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-medium" style={{ width: '60px' }}>진행률</th>
                </tr>
              </thead>
            <tbody>
              {weeklyTasks.map((task: any, index: number) => {
                const dateInfo = formatDateForTable(task.workDate, task);
                const getStatusLabel = (status: string) => {
                  switch (status) {
                    case 'scheduled': return '예정';
                    case 'in_progress': return '진행';
                    case 'completed': return '완료';
                    case 'postponed': return '연기';
                    case 'cancelled': return '취소';
                    default: return status;
                  }
                };

                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'scheduled': return 'text-blue-600';
                    case 'in_progress': return 'text-yellow-500';
                    case 'completed': return 'text-green-600';
                    case 'postponed': return 'text-gray-500';
                    case 'cancelled': return 'text-red-600';
                    default: return 'text-gray-500';
                  }
                };

                const getCategoryStyle = (category: string) => {
                  switch (category) {
                    case '계약해지': return 'font-bold text-red-600';
                    case '신규계약': return 'font-bold text-blue-600';
                    default: return 'text-gray-800';
                  }
                };
                
                return (
                  <tr key={task.id}>
                    {/* 시작날짜 - 고정, 줄바꿈X, 요일 색상 적용 */}
                    <td className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                      {dateInfo.dateOnly}
                      <span className={dateInfo.isSunday ? 'text-red-500' : dateInfo.isSaturday ? 'text-blue-500' : 'text-gray-800'}>
                        {dateInfo.dayOnly}
                      </span>
                    </td>
                    
                    {/* 업무구분 - 고정, 줄바꿈X, 색상 구분 */}
                    <td className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                      <span className={getCategoryStyle(task.category || '일반')}>
                        {task.category || '일반'}
                      </span>
                    </td>
                    
                    {/* 대상처 - 고정, 줄바꿈X */}
                    <td className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                      {task.targetPlace || '-'}
                    </td>
                    
                    {/* 업무제목 - 너비줄이고 줄바꿈O */}
                    <td className="border border-gray-400 px-2 py-2 text-left" style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>
                      {task.title}
                    </td>
                    
                    {/* 설명 - 줄바꿈O */}
                    <td className="border border-gray-400 px-2 py-2 text-left" style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>
                      {task.description || '-'}
                    </td>
                    
                    {/* 상태 - 고정, 줄바꿈X, 아이콘 포함 */}
                    <td className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(task.status).replace('text-', 'bg-')}`}></span>
                        <span>{getStatusLabel(task.status)}</span>
                      </div>
                    </td>
                    
                    {/* 진행률 - 고정, 줄바꿈X */}
                    <td className="border border-gray-400 px-2 py-2 text-center whitespace-nowrap">
                      {task.progress}%
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
        )}
      </div>

      {/* 2. 차주업무계획 섹션 */}
      <div className="report-section mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
          2. 차주업무계획 ({format(new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000), "M월 d일", { locale: ko })} ~ {format(new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000), "M월 d일", { locale: ko })})
        </h2>
        
        {nextWeekPlans ? (
          <div className="bg-gray-50 p-4 rounded border border-gray-300" style={{ fontSize: '10px', lineHeight: '1.4' }}>
            <div className="whitespace-pre-wrap">{nextWeekPlans}</div>
        </div>
        ) : (
          <div className="text-center text-gray-500 py-4 border border-gray-300 rounded bg-gray-50">
            차주 업무 계획이 작성되지 않았습니다.
          </div>
        )}
      </div>

      {/* 프린트 버튼 (미리보기에서만 보임) */}
      <div className="print:hidden mt-6 text-center">
        <Button onClick={handlePrint} className="btn-primary">
          <Printer className="w-4 h-4 mr-2" />
          인쇄하기
        </Button>
      </div>
    </div>
  );
}

export function WeeklyReport({ userId }: WeeklyReportProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [reportContent, setReportContent] = useState("");
  const [nextWeekPlans, setNextWeekPlans] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // 기본값: 과거일자가 위
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // 업무 수정/삭제 관련 상태
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  // 🔥 선택삭제와 수정저장 기능 상태 추가
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [pendingChanges, setPendingChanges] = useState<{[key: number]: Partial<any>}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<{[key: number]: boolean}>({});
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // 중앙집중식 업무목록 사용
  const { getWeeklyTasks, isLoading, invalidateAndRefetch } = useTasks();

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  // 월간 보고서를 위한 날짜 계산
  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

  // 업무 데이터 조회 (주간/월간에 따라 다른 기간)
  const startDate = reportType === 'weekly' ? weekStart : monthStart;
  const endDate = reportType === 'weekly' ? weekEnd : monthEnd;
  
  const rawWeeklyTasks = getWeeklyTasks(
    format(startDate, "yyyy-MM-dd"), 
    format(endDate, "yyyy-MM-dd")
  ).filter((task: any) => !userId || task.assignedTo === userId);

  // 정렬 함수
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc'); // 새로운 필드 클릭 시 과거부터 정렬
    }
  };

  // 정렬된 업무 목록
  const weeklyTasks = [...rawWeeklyTasks].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortField) {
      case 'date':
        aValue = new Date(a.workDate || a.dueDate || a.createdAt).getTime();
        bValue = new Date(b.workDate || b.dueDate || b.createdAt).getTime();
        break;
      case 'title':
        aValue = a.title?.toLowerCase() || '';
        bValue = b.title?.toLowerCase() || '';
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        break;
      case 'progress':
        aValue = a.progress || 0;
        bValue = b.progress || 0;
        break;
      default:
        return 0;
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  // 업무 목록 변경 감지를 위한 전역 이벤트 리스너
  useEffect(() => {
    const handleTaskUpdate = () => {
      // 중앙집중식 업무목록 새로고침
      invalidateAndRefetch();
    };

    // 전역 이벤트 리스너 등록 (업무 변경 시 발생)
    window.addEventListener('taskUpdated', handleTaskUpdate);
    window.addEventListener('taskCreated', handleTaskUpdate);
    window.addEventListener('taskDeleted', handleTaskUpdate);
    window.addEventListener('taskStatusChanged', handleTaskUpdate);
    window.addEventListener('tasksBulkDeleted', handleTaskUpdate);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
      window.removeEventListener('taskCreated', handleTaskUpdate);
      window.removeEventListener('taskDeleted', handleTaskUpdate);
      window.removeEventListener('taskStatusChanged', handleTaskUpdate);
      window.removeEventListener('tasksBulkDeleted', handleTaskUpdate);
    };
  }, [invalidateAndRefetch]);

  // 정렬 아이콘 표시 함수
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-purple-600" /> : 
      <ArrowDown className="w-4 h-4 text-purple-600" />;
  };

  // 월간 보고서를 위한 주차별 데이터 분할
  const getWeeklyGroups = (tasks: any[]) => {
    if (reportType === 'weekly') return [{ week: 1, tasks }];
    
    const weeks = [
      { week: 1, start: 1, end: 7, tasks: [] as any[] },
      { week: 2, start: 8, end: 14, tasks: [] as any[] },
      { week: 3, start: 15, end: 21, tasks: [] as any[] },
      { week: 4, start: 22, end: 31, tasks: [] as any[] }
    ];
    
    tasks.forEach(task => {
      const taskDate = new Date(task.workDate || task.dueDate || task.createdAt);
      const day = taskDate.getDate();
      
      const weekGroup = weeks.find(w => day >= w.start && day <= w.end);
      if (weekGroup) {
        weekGroup.tasks.push(task);
      }
    });
    
    return weeks;
  };

  const weeklyGroups = getWeeklyGroups(weeklyTasks);

  // 통계 계산 (주간/월간 공통)
  const weeklyStats = {
    total: weeklyTasks.length,
    completed: weeklyTasks.filter((t: any) => t.status === "completed").length,
    inProgress: weeklyTasks.filter((t: any) => t.status === "progress").length,
    pending: weeklyTasks.filter((t: any) => t.status === "pending").length,
    overdue: weeklyTasks.filter((t: any) => t.status === "overdue").length,
  };

  const completionRate = weeklyStats.total > 0 ? Math.round((weeklyStats.completed / weeklyStats.total) * 100) : 0;

  const handlePrevWeek = () => {
    setSelectedWeek(subWeeks(selectedWeek, 1));
  };

  const handleNextWeek = () => {
    setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const handleSaveReport = () => {
    console.log("주간보고서 저장:", {
      week: format(weekStart, "yyyy-MM-dd"),
      content: reportContent,
      nextWeekPlans,
      stats: weeklyStats,
    });
    alert("주간보고서가 저장되었습니다!");
  };

  // 업무 수정/삭제 핸들러 함수들
  const handleEditTask = (taskId: number) => {
    const taskToEdit = weeklyTasks.find(task => task.id === taskId);
    if (taskToEdit) {
      setEditingTask(taskId);
      setIsTaskModalOpen(true);
    } else {
      toast({
        title: "오류",
        description: "수정할 업무를 찾을 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTask = async (taskId: number, taskTitle: string) => {
    if (!confirm(`"${taskTitle}" 업무를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('업무 삭제 실패');
      }

      toast({
        title: "업무 삭제 완료",
        description: `"${taskTitle}" 업무가 삭제되었습니다.`,
      });

      // 업무 목록 새로고침
      invalidateAndRefetch();
      
      // 전역 이벤트 발생 (모든 업무목록 동기화)
      window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId } }));
      window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { id: taskId, action: 'delete' } }));
    } catch (error) {
      console.error('업무 삭제 오류:', error);
      toast({
        title: "삭제 실패",
        description: "업무 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 🔥 pending 변경사항 저장 함수
  const savePendingChange = (taskId: number, field: string, newValue: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: newValue
      }
    }));
    
    setHasUnsavedChanges(prev => ({
      ...prev,
      [taskId]: true
    }));
  };

  // 🔥 모든 변경사항 저장 함수
  const handleSaveAllChanges = async () => {
    const taskIdsWithChanges = Object.keys(pendingChanges).map(id => parseInt(id));
    
    if (taskIdsWithChanges.length === 0) {
      toast({
        title: "💡 저장할 변경사항 없음",
        description: "수정된 항목이 없습니다.",
      });
      return;
    }

    try {
      let successCount = 0;

      // 모든 변경사항을 순차적으로 저장
      for (const taskId of taskIdsWithChanges) {
        const changes = pendingChanges[taskId];
        if (!changes) continue;
      
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(changes)
        });

        if (response.ok) {
          successCount++;
          // 각 업무 변경 시 전역 이벤트 발생 (모든 업무목록 동기화)
          window.dispatchEvent(new CustomEvent('taskUpdated', { 
            detail: { id: taskId, changes, action: 'update' } 
          }));
        }
      }

      // 성공적으로 저장된 후 모든 상태 초기화
      setPendingChanges({});
      setHasUnsavedChanges({});

      // 즉시 캐시 무효화 및 리페치 (즉시 반영)
      invalidateAndRefetch();
      
      // 일괄 저장 완료 이벤트 발생
      window.dispatchEvent(new CustomEvent('tasksBulkUpdated', { 
        detail: { taskIds: taskIdsWithChanges, successCount } 
      }));
      
      toast({
        title: "✅ 일괄 저장 완료",
        description: `${successCount}개 업무가 저장되었습니다.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ 일괄 저장 실패",
        description: error.message || "저장 중 오류가 발생했습니다.",
      });
    }
  };

  // 상태 변경 함수 수정 - pending 방식으로 변경
  const handleStatusChange = async (taskId: number, newStatus: string) => {
    // 자동 진행률 조정
    let autoProgress;
    if (newStatus === 'scheduled') {
      autoProgress = 0;
    } else if (newStatus === 'in_progress') {
      autoProgress = 25;
    } else if (newStatus === 'completed') {
      autoProgress = 100;
    } else if (newStatus === 'postponed' || newStatus === 'cancelled') {
      autoProgress = 0;
    }
    
    savePendingChange(taskId, 'status', newStatus);
    if (autoProgress !== undefined) {
      savePendingChange(taskId, 'progress', autoProgress);
    }
  };

  // 우선순위 변경 함수 수정 - pending 방식으로 변경
  const handlePriorityChange = async (taskId: number, currentPriority: string) => {
    const priorityOptions = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorityOptions.indexOf(currentPriority);
    const nextPriority = priorityOptions[(currentIndex + 1) % priorityOptions.length];
    
    savePendingChange(taskId, 'priority', nextPriority);
  };

  // 진행률 변경 함수 수정 - pending 방식으로 변경
  const handleProgressChange = async (taskId: number, currentProgress: number) => {
    const progressOptions = [0, 25, 50, 75, 100];
    const currentIndex = progressOptions.indexOf(currentProgress);
    const nextProgress = progressOptions[(currentIndex + 1) % progressOptions.length];
    
    savePendingChange(taskId, 'progress', nextProgress);
  };

  // 일괄 삭제 함수 추가
  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) {
      toast({
        variant: "destructive",
        title: "선택된 업무 없음",
        description: "삭제할 업무를 선택해주세요.",
      });
      return;
    }

    if (!confirm(`선택된 ${selectedTaskIds.length}개의 업무를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const response = await fetch('/api/tasks/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ taskIds: selectedTaskIds })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '일괄 삭제에 실패했습니다.');
      }
      
      setSelectedTaskIds([]);
      invalidateAndRefetch();
      
      // 전역 이벤트 발생 (모든 업무목록 동기화)
      window.dispatchEvent(new CustomEvent('tasksBulkDeleted', { 
        detail: { taskIds: selectedTaskIds, count: result.deletedCount } 
      }));
      
      // 결과에 따른 토스트 메시지
      if (result.deletedCount > 0) {
        toast({
          title: "✅ 일괄 삭제 완료",
          description: result.message,
        });
      } else {
        toast({
          title: "⚠️ 삭제 결과",
          description: result.message,
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error('❌ 일괄 삭제 오류:', error);
      toast({
        variant: "destructive",
        title: "❌ 일괄 삭제 실패",
        description: error.message || "일괄 삭제 중 오류가 발생했습니다.",
      });
    }
  };

  // 체크박스 처리
  const handleTaskSelect = (taskId: number, checked: boolean) => {
    setSelectedTaskIds(prev => 
      checked 
        ? [...prev, taskId]
        : prev.filter(id => id !== taskId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTaskIds(checked ? weeklyTasks.map(task => task.id) : []);
  };

  // 전체 미저장 변경사항 개수 계산
  const totalUnsavedChanges = Object.keys(pendingChanges).length;

  // 상태 설정 함수 (업무목록 전체와 동일)
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { emoji: '●', emojiColor: 'text-green-600', color: 'bg-green-100 text-green-800 hover:bg-green-200', text: '완료' };
      case 'in_progress':
        return { emoji: '●', emojiColor: 'text-yellow-500', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', text: '진행' };
      case 'postponed':
        return { emoji: '●', emojiColor: 'text-gray-500', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', text: '연기' };
      case 'cancelled':
        return { emoji: '●', emojiColor: 'text-red-600', color: 'bg-red-100 text-red-800 hover:bg-red-200', text: '취소' };
      default:
        return { emoji: '●', emojiColor: 'text-blue-600', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200', text: '예정' };
    }
  };

  // 우선순위 설정 함수 (업무목록 전체와 동일)
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { color: 'bg-red-100 text-red-800 hover:bg-red-200', text: '긴급' };
      case 'high':
        return { color: 'bg-orange-100 text-orange-800 hover:bg-orange-200', text: '높음' };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', text: '보통' };
      case 'low':
        return { color: 'bg-green-100 text-green-800 hover:bg-green-200', text: '낮음' };
      default:
        return { color: 'bg-gray-100 text-gray-800 hover:bg-gray-200', text: '보통' };
    }
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleExportReport = () => {
    try {
      // 보고서 데이터 생성 - 더 상세한 정보 포함
    const reportData = `
=====================================
${reportType === 'weekly' ? '주간' : '월간'} 업무 보고서
=====================================
기간: ${reportType === 'weekly' 
  ? `${format(weekStart, "yyyy년 M월 d일", { locale: ko })} ~ ${format(weekEnd, "M월 d일", { locale: ko })}`
  : `${format(monthStart, "yyyy년 M월", { locale: ko })}`
}
생성일: ${format(new Date(), "yyyy년 M월 d일 HH:mm", { locale: ko })}

■ ${reportType === 'weekly' ? '주간' : '월간'} 업무 실적 요약
=====================================
- 총 업무: ${weeklyStats.total}개
- 완료: ${weeklyStats.completed}개 (완료율: ${completionRate}%)
- 진행중: ${weeklyStats.inProgress}개
- 대기: ${weeklyStats.pending}개
- 지연: ${weeklyStats.overdue}개

■ 주요 성과 및 완료 업무
=====================================
${reportContent || "작성된 내용이 없습니다."}

■ ${reportType === 'weekly' ? '차주' : '다음달'} 업무 계획
=====================================
${nextWeekPlans || "작성된 내용이 없습니다."}

■ 상세 업무 내역
=====================================
${weeklyTasks.length === 0 ? "해당 기간에 업무가 없습니다." : 
  weeklyTasks.map((task: any, index: number) => {
    const taskDate = task.workDate ? format(new Date(task.workDate), "MM/dd (EEE)", { locale: ko }) : "날짜 미지정";
    const statusText = task.status === "completed" ? "완료" : 
                      task.status === "in_progress" ? "진행중" : 
                      task.status === "scheduled" ? "예정" :
                      task.status === "pending" ? "대기" : 
                      task.status === "postponed" ? "연기" :
                      task.status === "cancelled" ? "취소" : "미정";
    const priorityText = task.priority === "urgent" ? "긴급" :
                        task.priority === "high" ? "높음" :
                        task.priority === "medium" ? "보통" : "낮음";
    
    return `${index + 1}. [${taskDate}] ${task.title}
   - 상태: ${statusText}
   - 우선순위: ${priorityText}
   - 담당자: ${task.assignedTo || "미지정"}
   - 진행률: ${task.progress || 0}%
   - 카테고리: ${task.category || "미분류"}
   ${task.description ? `- 설명: ${task.description}` : ""}
   ${task.followUpAssignee ? `- 후속담당자: ${task.followUpAssignee}` : ""}`;
  }).join("\n\n")
}

=====================================
보고서 생성 완료
=====================================
    `.trim();

      // 파일명 생성
      const fileName = `${reportType === 'weekly' ? '주간' : '월간'}보고서_${
        reportType === 'weekly' 
          ? format(weekStart, "yyyy-MM-dd", { locale: ko })
          : format(monthStart, "yyyy-MM", { locale: ko })
      }_${format(new Date(), "yyyyMMdd_HHmm")}.txt`;

      // 파일 다운로드
    const blob = new Blob([reportData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
      a.download = fileName;
      a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

      // 성공 메시지
      alert(`${reportType === 'weekly' ? '주간' : '월간'}보고서가 성공적으로 내보내기되었습니다!\n파일명: ${fileName}`);
      
    } catch (error) {
      console.error('보고서 내보내기 중 오류 발생:', error);
      alert('보고서 내보내기 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        <span className="ml-3 text-gray-600">주간 데이터 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 보고서 선택 헤더 */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-xl font-bold">
              <div className="flex items-center space-x-4">
                {/* 모던한 토글 스위치 */}
                <div className="relative bg-gray-100 rounded-full p-1 flex items-center space-x-1 shadow-inner">
                  {/* 슬라이딩 배경 */}
                  <div 
                    className={`absolute top-1 bottom-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-300 ease-in-out shadow-lg ${
                      reportType === 'weekly' 
                        ? 'left-1 w-16' 
                        : 'left-[68px] w-16'
                    }`}
                  />
                  
                  {/* 주간 버튼 */}
                  <button
                    onClick={() => setReportType('weekly')}
                    className={`relative z-10 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out ${
                      reportType === 'weekly'
                        ? 'text-white transform scale-105'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    주간
                  </button>
                  
                  {/* 월간 버튼 */}
                  <button
                    onClick={() => setReportType('monthly')}
                    className={`relative z-10 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out ${
                      reportType === 'monthly'
                        ? 'text-white transform scale-105'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    월간
                  </button>
                </div>
                

              </div>
            </CardTitle>
            <div className="flex items-center space-x-4">
              {reportType === 'weekly' ? (
                <>
              <Button variant="outline" onClick={handlePrevWeek} size="sm" className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="font-semibold text-gray-900">
                  {format(weekStart, "yyyy년 M월 d일", { locale: ko })} ~ {format(weekEnd, "M월 d일", { locale: ko })}
                </p>
                <p className="text-sm text-gray-600">
                  {format(weekStart, "yyyy년 w번째 주", { locale: ko })}
                </p>
              </div>
              <Button variant="outline" onClick={handleNextWeek} size="sm" className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handlePrevMonth} size="sm" className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">
                      {format(monthStart, "yyyy년 M월", { locale: ko })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(monthStart, "M월 1일", { locale: ko })} ~ {format(monthEnd, "M월 d일", { locale: ko })}
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleNextMonth} size="sm" className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 주간 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="cursor-pointer transition-all duration-200 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border-gray-200 border hover:shadow-md transform hover:scale-102 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-gray-600 px-3 py-1 rounded-md inline-block">
                <span className="text-white text-sm font-bold tracking-wide" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 1))' }}>
                  전체
                </span>
            </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-800">
                {weeklyStats.total}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-800 opacity-70">
              내용없음
            </div>
          </div>
        </Card>

        <Card className="cursor-pointer transition-all duration-200 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-green-200 border hover:shadow-md transform hover:scale-102 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-emerald-600 px-3 py-1 rounded-md inline-block">
                <span className="text-white text-sm font-bold tracking-wide" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 1))' }}>
                  완료
                </span>
            </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-green-800">
                {weeklyStats.completed}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xs text-green-800 opacity-70">
              내용없음
            </div>
          </div>
        </Card>

        <Card className="cursor-pointer transition-all duration-200 bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-yellow-200 border hover:shadow-md transform hover:scale-102 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-amber-600 px-3 py-1 rounded-md inline-block">
                <span className="text-white text-sm font-bold tracking-wide" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 1))' }}>
                  진행
                </span>
            </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-yellow-800">
                {weeklyStats.inProgress}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xs text-yellow-800 opacity-70">
              내용없음
            </div>
          </div>
        </Card>

        <Card className="cursor-pointer transition-all duration-200 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-orange-200 border hover:shadow-md transform hover:scale-102 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-orange-600 px-3 py-1 rounded-md inline-block">
                <span className="text-white text-sm font-bold tracking-wide" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 1))' }}>
                  연기
                </span>
            </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-orange-800">
                {weeklyStats.pending}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xs text-orange-800 opacity-70">
              내용없음
            </div>
          </div>
        </Card>

        <Card className="cursor-pointer transition-all duration-200 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-purple-200 border hover:shadow-md transform hover:scale-102 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-purple-600 px-3 py-1 rounded-md inline-block">
                <span className="text-white text-sm font-bold tracking-wide" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 1))' }}>
                  완료율
                </span>
            </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-purple-800">
                {completionRate}%
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xs text-purple-800 opacity-70">
              내용없음
            </div>
          </div>
        </Card>
      </div>

      {/* 업무 목록 */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{reportType === 'weekly' ? '주간' : '월간'} 업무 내역</CardTitle>
            
            {/* 일괄 작업 버튼 */}
            {(selectedTaskIds.length > 0 || totalUnsavedChanges > 0) && (
              <div className="flex items-center gap-3">
                {selectedTaskIds.length > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="destructive"
                    size="sm"
                    className="h-8 px-3 text-xs font-medium"
                  >
                    {selectedTaskIds.length} 선택삭제
                  </Button>
                )}
                
                {totalUnsavedChanges > 0 && (
                  <Button
                    onClick={handleSaveAllChanges}
                    variant="default"
                    size="sm"
                    className="h-8 px-3 text-xs font-medium bg-green-600 hover:bg-green-700"
                  >
                    {totalUnsavedChanges} 수정저장
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {weeklyTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>이번 {reportType === 'weekly' ? '주' : '월'}에 할당된 업무가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {weeklyGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-4">
                  {reportType === 'monthly' && (
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {group.week}주차 ({group.start}일 ~ {group.end}일)
                      </h3>
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <span className="text-sm text-gray-500">
                        {group.tasks.length}개 업무
                      </span>
                  </div>
                  )}
                  
                  {group.tasks.length === 0 && reportType === 'monthly' ? (
                    <div className="text-center py-4 text-gray-400">
                      <p>{group.week}주차에 할당된 업무가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="w-12 min-w-[48px]">
                              <Checkbox
                                checked={selectedTaskIds.length === (reportType === 'weekly' ? weeklyTasks : group.tasks).length && (reportType === 'weekly' ? weeklyTasks : group.tasks).length > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead className="min-w-[120px]">일자</TableHead>
                            <TableHead className="min-w-[120px]">업무 제목</TableHead>
                            <TableHead className="min-w-[70px]">상태</TableHead>
                            <TableHead className="min-w-[75px]">우선순위</TableHead>
                            <TableHead className="min-w-[100px]">진행률</TableHead>
                            <TableHead className="min-w-[140px]">업무연계</TableHead>
                            <TableHead className="w-32 min-w-[128px]">수정/작업</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(reportType === 'weekly' ? weeklyTasks : group.tasks).map((task: any) => {
                    const { dateOnly, dayOnly, scheduledTime, isSaturday, isSunday } = formatDateForTable(task.workDate || task.dueDate || task.createdAt, task);
                    
                    // 🔥 pending 변경사항이 있으면 그 값을 표시, 없으면 원래 값 표시
                    const displayTask = {
                      ...task,
                      ...pendingChanges[task.id]
                    };
                    
                    // 🔥 변경사항이 있는 행은 빨간색으로 강조
                    const hasChanges = hasUnsavedChanges[task.id];
                    
                    const statusConfig = getStatusConfig(displayTask.status);
                    const priorityConfig = getPriorityConfig(displayTask.priority);
                    
                    return (
                      <TableRow 
                        key={task.id} 
                        className={`${hasChanges ? 'bg-red-50 border-l-4 border-l-red-400' : 'bg-white'} hover:bg-gray-50 cursor-pointer`}
                        onDoubleClick={() => handleEditTask(task.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedTaskIds.includes(task.id)}
                            onCheckedChange={(checked) => handleTaskSelect(task.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center p-2">
                          <div className="text-sm font-bold text-gray-800">
                            {dateOnly}<span className={isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-gray-800'}>{dayOnly}</span>
                          </div>
                          <div className="text-sm text-gray-900">
                            {scheduledTime}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div className="cursor-pointer hover:text-blue-600 transition-colors">
                              <span className="font-bold text-gray-800 bg-gray-300 px-2 py-1 rounded mr-2">
                                {displayTask.targetPlace || '미지정'}
                              </span>
                              <span className="font-semibold">
                                {displayTask.title.startsWith('[확인요청]') ? '🔴 ' : ''}{displayTask.title}
                              </span>
                            </div>
                            {displayTask.description && (
                              <div className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                                {displayTask.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* 상태 Select 드롭다운 (업무목록 전체와 동일) */}
                          <Select value={displayTask.status} onValueChange={(value) => handleStatusChange(task.id, value)}>
                            <SelectTrigger className={`h-6 px-2 text-xs ${getStatusConfig(displayTask.status).color} border-0 bg-transparent hover:bg-opacity-80 whitespace-nowrap flex-shrink-0 w-auto min-w-[70px] [&>svg]:hidden`}>
                              <div className="flex items-center gap-1">
                                <span className={`text-lg ${getStatusConfig(displayTask.status).emojiColor}`}>{getStatusConfig(displayTask.status).emoji}</span>
                                <span>{getStatusConfig(displayTask.status).text}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg text-blue-600">●</span>
                                  예정
                                </div>
                              </SelectItem>
                              <SelectItem value="in_progress">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg text-yellow-500">●</span>
                                  진행
                                </div>
                              </SelectItem>
                              <SelectItem value="completed">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg text-green-600">●</span>
                                  완료
                                </div>
                              </SelectItem>
                              <SelectItem value="postponed">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg text-gray-500">●</span>
                                  연기
                                </div>
                              </SelectItem>
                              <SelectItem value="cancelled">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg text-red-600">●</span>
                                  취소
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {/* 우선순위 Button 클릭 (업무목록 전체와 동일) */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 px-2 text-xs ${priorityConfig.color} transition-colors cursor-pointer`}
                            onClick={() => handlePriorityChange(task.id, displayTask.priority)}
                            title="클릭하여 우선순위 변경"
                          >
                            {priorityConfig.text}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {/* 진행률 Button 클릭 (업무목록 전체와 동일) */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs font-medium text-gray-700 hover:bg-gray-100 whitespace-nowrap flex-shrink-0"
                              onClick={() => handleProgressChange(task.id, displayTask.progress || 0)}
                              title="클릭하여 진행률 변경 (25% 단위)"
                            >
                              {displayTask.progress || 0}%
                            </Button>
                            <div className="w-16">
                              <Progress value={displayTask.progress || 0} className="h-2" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col items-start space-y-1">
                            {displayTask.assignedTo && displayTask.followUpAssignee && displayTask.followUpAssignee !== displayTask.assignedTo ? (
                              <>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {displayTask.assignedTo}
                                </span>
                                <span className="text-gray-400 text-xs">↓</span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {displayTask.followUpAssignee}
                                </span>
                              </>
                            ) : displayTask.assignedTo ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {displayTask.assignedTo}
                              </span>
                            ) : displayTask.followUpAssignee ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {displayTask.followUpAssignee}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTask(task.id);
                              }}
                              className="h-6 w-6 p-0 hover:bg-blue-100"
                            >
                              <Edit2 className="h-3 w-3 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id, task.title);
                              }}
                              className="h-6 w-6 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                          })}
                        </TableBody>
                      </Table>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 보고서 작성 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">1</span>
              <span>주간업무보고서 - 주요 성과 및 완료 업무</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={`이번 ${reportType === 'weekly' ? '주' : '월'} 주요 성과, 완료한 업무, 특별한 이슈나 성과를 작성해주세요...`}
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">2</span>
              <span>차주업무계획 - {reportType === 'weekly' ? '차주' : '다음달'} 업무 계획</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={`${reportType === 'weekly' ? '다음 주' : '다음 달'} 업무 계획, 목표, 중점사항을 작성해주세요...`}
              value={nextWeekPlans}
              onChange={(e) => setNextWeekPlans(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </CardContent>
        </Card>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-end space-x-4">
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              미리보기
            </Button>
          </DialogTrigger>
          <DialogContent className="print:!p-0 print:!m-0 print:!border-none print:!shadow-none print:!bg-white print:!max-w-none print:!max-h-none print:!w-full print:!h-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="print:hidden">
              <DialogTitle>{reportType === 'weekly' ? '주간' : '월간'}보고서 미리보기</DialogTitle>
            </DialogHeader>
            <div className="print:!fixed print:!top-0 print:!left-0 print:!w-full print:!h-full print:!bg-white print:!z-50">
              <ReportPreview
                weekStart={weekStart}
                weekEnd={weekEnd}
                weeklyStats={weeklyStats}
                completionRate={completionRate}
                reportContent={reportContent}
                nextWeekPlans={nextWeekPlans}
                weeklyTasks={weeklyTasks}
                reportType={reportType}
                monthStart={monthStart}
                monthEnd={monthEnd}
              />
            </div>
          </DialogContent>
        </Dialog>
        
        <Button variant="outline" onClick={handleExportReport}>
          <Download className="w-4 h-4 mr-2" />
          내보내기
        </Button>
        <Button onClick={handleSaveReport} className="btn-primary">
          <Send className="w-4 h-4 mr-2" />
          보고서 저장
        </Button>
      </div>

      {/* 업무 수정 모달 */}
      <TaskCreateModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        editingTaskId={editingTask}
        onTaskCreated={() => {
          invalidateAndRefetch();
          handleCloseTaskModal();
        }}
        onTaskUpdated={() => {
          invalidateAndRefetch();
          handleCloseTaskModal();
        }}
      />
    </div>
  );
} 