import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, Plus, Edit, Trash2, X } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TaskCalendarProps {
  onDateClick?: (date: Date) => void;
  className?: string;
}

interface DayTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  description?: string;
  assignee?: string;
}

interface DayTaskPopupProps {
  date: Date;
  tasks: DayTask[];
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: () => void;
}

// 날짜별 업무 팝업 컴포넌트
function DayTaskPopup({ date, tasks, isOpen, onClose, onTaskUpdate }: DayTaskPopupProps) {
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'scheduled'
  });

  if (!isOpen) return null;

  const handleAddTask = async () => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTask,
          dueDate: format(date, 'yyyy-MM-dd'),
          workDate: format(date, 'yyyy-MM-dd')
        }),
      });

      if (response.ok) {
        setNewTask({ title: '', description: '', priority: 'medium', status: 'scheduled' });
        setIsAdding(false);
        onTaskUpdate();
      }
    } catch (error) {
      console.error('업무 추가 실패:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('이 업무를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        onTaskUpdate();
      }
    } catch (error) {
      console.error('업무 삭제 실패:', error);
    }
  };

  const handleUpdateTask = async (taskId: number, updates: Partial<DayTask>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setIsEditing(null);
        onTaskUpdate();
      }
    } catch (error) {
      console.error('업무 수정 실패:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600';
      case 'in_progress': return 'text-amber-600';
      case 'completed': return 'text-emerald-600';
      case 'cancelled': return 'text-red-600';
      case 'postponed': return 'text-gray-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {format(date, 'M월 d일 (E)', { locale: ko })} 업무
              </h2>
              <p className="text-purple-100 text-sm mt-1">
                총 {tasks.length}개의 업무
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 내용 */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* 업무 추가 버튼 */}
          <div className="mb-4">
            <Button
              onClick={() => setIsAdding(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              새 업무 추가
            </Button>
          </div>

          {/* 새 업무 추가 폼 */}
          {isAdding && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="업무 제목"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <textarea
                  placeholder="업무 설명"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent h-20 resize-none"
                />
                <div className="flex gap-3">
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="low">낮음</option>
                    <option value="medium">보통</option>
                    <option value="high">높음</option>
                    <option value="urgent">긴급</option>
                  </select>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="scheduled">예정</option>
                    <option value="in_progress">진행</option>
                    <option value="completed">완료</option>
                    <option value="postponed">연기</option>
                    <option value="cancelled">취소</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddTask}
                    disabled={!newTask.title.trim()}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  >
                    추가
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAdding(false);
                      setNewTask({ title: '', description: '', priority: 'medium', status: 'scheduled' });
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    취소
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 업무 목록 */}
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>이 날짜에 등록된 업무가 없습니다.</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {isEditing === task.id ? (
                    // 편집 모드
                    <div className="space-y-3">
                      <input
                        type="text"
                        defaultValue={task.title}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        onBlur={(e) => handleUpdateTask(task.id, { title: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <select
                          defaultValue={task.priority}
                          onChange={(e) => handleUpdateTask(task.id, { priority: e.target.value })}
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="low">낮음</option>
                          <option value="medium">보통</option>
                          <option value="high">높음</option>
                          <option value="urgent">긴급</option>
                        </select>
                        <select
                          defaultValue={task.status}
                          onChange={(e) => handleUpdateTask(task.id, { status: e.target.value })}
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="scheduled">예정</option>
                          <option value="in_progress">진행</option>
                          <option value="completed">완료</option>
                          <option value="postponed">연기</option>
                          <option value="cancelled">취소</option>
                        </select>
                      </div>
                      <Button
                        onClick={() => setIsEditing(null)}
                        size="sm"
                        className="w-full"
                      >
                        완료
                      </Button>
                    </div>
                  ) : (
                    // 보기 모드
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 flex-1">{task.title}</h3>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(task.id)}
                            className="w-8 h-8 p-0 hover:bg-blue-100 text-blue-600"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                            className="w-8 h-8 p-0 hover:bg-red-100 text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'urgent' ? '긴급' : 
                           task.priority === 'high' ? '높음' : 
                           task.priority === 'medium' ? '보통' : '낮음'}
                        </span>
                        <span className={`font-medium ${getStatusColor(task.status)}`}>
                          ●
                        </span>
                        <span className="text-gray-600">
                          {task.status === 'scheduled' ? '예정' :
                           task.status === 'in_progress' ? '진행' :
                           task.status === 'completed' ? '완료' :
                           task.status === 'cancelled' ? '취소' : '연기'}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-2">{task.description}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskCalendar({ onDateClick, className }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [popupDate, setPopupDate] = useState<Date | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // 🎯 중앙집중식 데이터 관리 - useTasks 훅 사용
  const { allTasks: tasks, refetch } = useTasks();

  // 한국 공휴일 체크 (간단한 버전)
  const isKoreanHoliday = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 주요 공휴일들 (간단한 고정 공휴일만)
    const holidays = [
      { month: 1, day: 1 },   // 신정
      { month: 3, day: 1 },   // 삼일절
      { month: 5, day: 5 },   // 어린이날
      { month: 6, day: 6 },   // 현충일
      { month: 8, day: 15 },  // 광복절
      { month: 10, day: 3 },  // 개천절
      { month: 10, day: 9 },  // 한글날
      { month: 12, day: 25 }, // 크리스마스
    ];
    
    return holidays.some(holiday => holiday.month === month && holiday.day === day);
  };

  // 날짜별 업무 개수 계산 - workDate 우선 사용
  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      // workDate가 있으면 workDate 사용, 없으면 dueDate 사용
      const taskDateStr = task.workDate || task.dueDate;
      if (!taskDateStr) return false;
      
      const taskDate = new Date(taskDateStr);
      return isSameDay(taskDate, date);
    });
  };

  // 상태별 아이콘 (더 모던한 스타일)
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return '●';
      case 'in_progress': return '●';
      case 'completed': return '●';
      case 'cancelled': return '●';
      case 'postponed': return '●';
      default: return '●';
    }
  };

  // 상태별 색상 클래스
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-500';
      case 'in_progress': return 'text-amber-500';
      case 'completed': return 'text-emerald-500';
      case 'cancelled': return 'text-red-500';
      case 'postponed': return 'text-gray-500';
      default: return 'text-blue-500';
    }
  };

  // 우선순위별 개수 표시 (더 세련된 스타일)
  const getPriorityInfo = (tasksForDate: DayTask[]) => {
    const priorityCounts = {
      urgent: tasksForDate.filter(t => t.priority === 'urgent').length,
      high: tasksForDate.filter(t => t.priority === 'high').length,
      medium: tasksForDate.filter(t => t.priority === 'medium').length,
      low: tasksForDate.filter(t => t.priority === 'low').length,
    };
    
    // 가장 높은 우선순위만 표시
    if (priorityCounts.urgent > 0) return { 
      color: 'bg-gradient-to-r from-red-500 to-pink-500', 
      textColor: 'text-white',
      count: priorityCounts.urgent,
      label: '긴급'
    };
    if (priorityCounts.high > 0) return { 
      color: 'bg-gradient-to-r from-orange-500 to-amber-500', 
      textColor: 'text-white',
      count: priorityCounts.high,
      label: '높음'
    };
    if (priorityCounts.medium > 0) return { 
      color: 'bg-gradient-to-r from-yellow-400 to-yellow-500', 
      textColor: 'text-gray-800',
      count: priorityCounts.medium,
      label: '보통'
    };
    if (priorityCounts.low > 0) return { 
      color: 'bg-gradient-to-r from-green-400 to-emerald-500', 
      textColor: 'text-white',
      count: priorityCounts.low,
      label: '낮음'
    };
    
    return null;
  };

  // 날짜 스타일 클래스 (더 모던한 스타일)
  const getDateClasses = (date: Date) => {
    const dayOfWeek = getDay(date);
    const isToday = isSameDay(date, new Date());
    const isSelected = isSameDay(date, selectedDate);
    const isCurrentMonth = isSameMonth(date, currentDate);
    const isHoliday = isKoreanHoliday(date);
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    
    let classes = 'relative p-2 sm:p-3 aspect-square rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg group flex flex-col ';
    
    if (!isCurrentMonth) {
      classes += 'text-gray-300 bg-gray-50/50 backdrop-blur-sm ';
    } else {
      classes += 'bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100/50 ';
    }
    
    if (isToday) {
      classes += 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-300/50 shadow-lg ring-2 ring-blue-200/50 ';
    }
    
    if (isSelected) {
      classes += 'ring-2 ring-purple-400/60 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50 ';
    }
    
    // 요일별 색상 (더 부드러운 색상)
    if (isSunday || isHoliday) {
      classes += 'text-rose-600 ';
    } else if (isSaturday) {
      classes += 'text-sky-600 ';
    } else {
      classes += 'text-gray-700 ';
    }
    
    return classes;
  };

  // 월 변경
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // 달력에 표시할 날짜들
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - getDay(monthStart));
  const calendarEnd = new Date(monthEnd);
  calendarEnd.setDate(calendarEnd.getDate() + (6 - getDay(monthEnd)));
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const handleDateDoubleClick = (date: Date) => {
    setPopupDate(date);
    setIsPopupOpen(true);
  };

  const handlePopupClose = () => {
    setIsPopupOpen(false);
    setPopupDate(null);
  };

  const handleTaskUpdate = () => {
    refetch();
  };

  return (
    <>
      <Card className={`glass-card overflow-hidden bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-xl border-0 shadow-2xl flex flex-col ${className || ''}`}>
        <CardHeader className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 backdrop-blur-sm border-b border-gray-200/50 py-3 flex-shrink-0">
          {/* 연도/월 제목과 네비게이션을 1행에 배치 */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToPreviousMonth}
              className="w-8 h-8 p-0 rounded-full hover:bg-purple-100/50 hover:text-purple-600 transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </h2>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goToToday}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-md text-sm"
              >
                오늘
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goToNextMonth}
                className="w-8 h-8 p-0 rounded-full hover:bg-purple-100/50 hover:text-purple-600 transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-4">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div 
                  key={day} 
                  className={`p-4 text-center font-bold text-sm rounded-lg mx-1 ${
                    index === 0 ? 'text-rose-600 bg-rose-50/50' : 
                    index === 6 ? 'text-sky-600 bg-sky-50/50' : 
                    'text-gray-700 bg-gray-50/50'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* 달력 그리드 */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date) => {
                const tasksForDate = getTasksForDate(date);
                const priorityInfo = getPriorityInfo(tasksForDate);
                
                return (
                  <div
                    key={date.toISOString()}
                    className={getDateClasses(date)}
                    onClick={() => handleDateClick(date)}
                    onDoubleClick={() => handleDateDoubleClick(date)}
                    title="더블클릭하여 업무 관리"
                  >
                    {/* 날짜 숫자 */}
                    <div className="flex items-center justify-between mb-1 flex-shrink-0">
                      <span className="text-xs sm:text-sm font-bold group-hover:text-purple-600 transition-colors duration-200">
                        {format(date, 'd')}
                      </span>
                    </div>
                    
                    {/* 업무 표시 */}
                    {tasksForDate.length > 0 && (
                      <div className="flex-1 flex flex-col justify-center space-y-1">
                        {/* 우선순위별 개수 */}
                        {priorityInfo && (
                          <div className="flex items-center justify-center">
                            <div className={`px-1.5 py-0.5 rounded-full text-xs font-medium shadow-sm ${priorityInfo.color} ${priorityInfo.textColor}`}>
                              {priorityInfo.count}
                            </div>
                          </div>
                        )}
                        
                        {/* 상태별 미니 아이콘 */}
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {tasksForDate.slice(0, 3).map((task, index) => (
                            <span key={index} className={`text-xs ${getStatusColor(task.status)} drop-shadow-sm`}>
                              {getStatusIcon(task.status)}
                            </span>
                          ))}
                          {tasksForDate.length > 3 && (
                            <div className="px-1 py-0.5 bg-gray-200/80 text-gray-600 text-xs rounded-full font-medium">
                              +{tasksForDate.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* 호버 효과 */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/5 group-hover:to-blue-500/5 transition-all duration-300 pointer-events-none"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 날짜별 업무 팝업 */}
      {popupDate && (
        <DayTaskPopup
          date={popupDate}
          tasks={getTasksForDate(popupDate)}
          isOpen={isPopupOpen}
          onClose={handlePopupClose}
          onTaskUpdate={handleTaskUpdate}
        />
      )}
    </>
  );
} 