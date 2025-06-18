import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, MessageCircle, Calendar, Activity } from "lucide-react";
import { DailyTaskWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface SidebarProps {
  onCreateTask: () => void;
  onEditTask?: (taskId: number) => void;
  tasks?: any[];
}

interface UpcomingDeadlinesProps {
  onEditTask?: (taskId: number) => void;
  tasks?: any[];
}

interface RecentActivityProps {
  // 필요한 경우 props 추가
}

// 다가오는 마감일 컴포넌트
export function UpcomingDeadlines({ onEditTask, tasks = [] }: UpcomingDeadlinesProps) {
  // Get upcoming deadlines (next 7 days) - 최대 10개
  const upcomingDeadlines = tasks
    .filter(task => {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= sevenDaysFromNow && task.status !== "completed";
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10);

  const getDeadlineColor = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDue <= 24) return "border-red-200 bg-red-50";
    if (hoursUntilDue <= 72) return "border-orange-200 bg-orange-50";
    return "border-yellow-200 bg-yellow-50";
  };

  const getDeadlineText = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDue <= 24) return "오늘 마감";
    if (hoursUntilDue <= 48) return "내일 마감";
    if (hoursUntilDue <= 72) return "3일 후";
    return `${Math.ceil(hoursUntilDue / 24)}일 후`;
  };

  const getDeadlineTextColor = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDue <= 24) return "text-red-600";
    if (hoursUntilDue <= 72) return "text-orange-600";
    return "text-yellow-600";
  };

  // 상태 구성 (업무목록과 동일 - 원형 아이콘)
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { emoji: '●', emojiColor: 'text-green-600', text: '완료' };
      case 'in_progress':
        return { emoji: '●', emojiColor: 'text-yellow-500', text: '진행' };
      case 'postponed':
        return { emoji: '●', emojiColor: 'text-gray-500', text: '연기' };
      case 'cancelled':
        return { emoji: '●', emojiColor: 'text-red-600', text: '취소' };
      default:
        return { emoji: '●', emojiColor: 'text-blue-600', text: '예정' };
    }
  };

  // 우선순위 구성 (업무목록과 동일 - 음영박스+글자)
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { color: 'bg-red-100 text-red-800', text: '긴급' };
      case 'high':
        return { color: 'bg-orange-100 text-orange-800', text: '높음' };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800', text: '보통' };
      case 'low':
        return { color: 'bg-green-100 text-green-800', text: '낮음' };
      default:
        return { color: 'bg-gray-100 text-gray-800', text: '보통' };
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              다가오는 마감일
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingDeadlines.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">📅</div>
            <p className="text-gray-500 text-sm">다가오는 마감일이 없습니다</p>
          </div>
        ) : (
          /* 3개 기본 표시 + 스크롤로 최대 10개 */
          <div className="max-h-[240px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {upcomingDeadlines.map((task, index) => (
              <div 
                key={task.id}
                className={`flex items-center p-2 border rounded-lg ${getDeadlineColor(task.dueDate)} hover:shadow-sm transition-all cursor-pointer hover:bg-opacity-80`}
                onDoubleClick={() => onEditTask?.(task.id)}
                title="더블클릭하여 수정"
              >
                {/* 상태 및 우선순위 */}
                <div className="flex flex-col space-y-1 mr-2 min-w-[60px]">
                  {/* 상태: 원형 아이콘 */}
                  <div className="flex items-center space-x-1 text-xs">
                    <span className={`${getStatusConfig(task.status).emojiColor}`}>
                      {getStatusConfig(task.status).emoji}
                    </span>
                    <span className="font-medium">{getStatusConfig(task.status).text}</span>
                  </div>
                  {/* 우선순위: 음영박스 */}
                  <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityConfig(task.priority).color}`}>
                    {getPriorityConfig(task.priority).text}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* 제목과 내용을 한 줄로 */}
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900 text-sm truncate flex-shrink-0 max-w-[120px]">
                    {task.title}
                  </p>
                    {task.description && (
                      <span className="text-xs text-gray-500 truncate opacity-70">
                        • {task.description}
                      </span>
                    )}
                  </div>
                  
                  {/* 마감일 정보 */}
                  <p className={`text-xs ${getDeadlineTextColor(task.dueDate)} mt-1`}>
                    {getDeadlineText(task.dueDate)}
                  </p>
                </div>
                
                {/* 마감일 표시점 */}
                <div className={`w-2 h-2 rounded-full ml-2 ${getDeadlineTextColor(task.dueDate).replace('text-', 'bg-')}`} />
              </div>
            ))}
            
            {/* 4개 이상일 때 스크롤 안내 */}
            {upcomingDeadlines.length > 3 && (
              <div className="text-center py-2 text-xs text-gray-400 border-t border-gray-200">
                총 {upcomingDeadlines.length}개 • 스크롤하여 더보기
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 최근활동 컴포넌트
export function RecentActivity({}: RecentActivityProps) {
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    select: (data: any) => data?.notifications || data || [],
    refetchInterval: false, // 자동 새로고침 비활성화
    staleTime: 300000, // 5분간 캐시 유지
  });

  // Get recent activity from notifications
  const recentActivity = notifications
    .slice(0, 3)
    .map((notification: any) => ({
      ...notification,
      timeAgo: formatDistanceToNow(new Date(notification.createdAt), {
        addSuffix: true,
        locale: ko,
      }),
    }));

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task_assigned": return "📋";
      case "comment_added": return "💬";
      case "status_changed": return "📊";
      case "approval_request": return "✅";
      default: return "📢";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "task_assigned": return "bg-blue-100";
      case "comment_added": return "bg-green-100";
      case "status_changed": return "bg-purple-100";
      case "approval_request": return "bg-orange-100";
      default: return "bg-gray-100";
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              최근활동
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {recentActivity.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">📱</div>
            <p className="text-gray-500 text-sm">최근 활동이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                  <span className="text-xs">{getActivityIcon(activity.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 원래 Sidebar 컴포넌트 (기존 호환성 유지)
export function Sidebar({ onCreateTask, onEditTask, tasks = [] }: SidebarProps) {
  return (
    <div className="space-y-6">
      <UpcomingDeadlines onEditTask={onEditTask} tasks={tasks} />
      <RecentActivity />
    </div>
  );
}
