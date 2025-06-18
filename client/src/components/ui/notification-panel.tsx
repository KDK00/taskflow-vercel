import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { X, Check } from "lucide-react";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"], // 전체 프로젝트 통일 쿼리 키
    enabled: isOpen, // 패널이 열릴 때만 조회
    refetchInterval: false, // 자동 새로고침 비활성화
    staleTime: 120000, // 2분간 캐시 유지
    refetchOnWindowFocus: false // 창 포커스시 갱신 비활성화
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_assigned":
        return "📋";
      case "deadline_approaching":
        return "⏰";
      case "comment_added":
        return "💬";
      case "status_changed":
        return "📊";
      case "approval_request":
        return "✅";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "task_assigned":
        return "border-blue-200 bg-blue-50";
      case "deadline_approaching":
        return "border-red-200 bg-red-50";
      case "comment_added":
        return "border-green-200 bg-green-50";
      case "status_changed":
        return "border-purple-200 bg-purple-50";
      case "approval_request":
        return "border-orange-200 bg-orange-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <Card className="fixed top-16 right-4 w-80 glass-card border-0 shadow-xl z-50 max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">알림</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="text-xs text-purple-600 hover:text-purple-700"
            >
              <Check className="w-3 h-3 mr-1" />
              모두 읽음
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <div className="text-4xl mb-2">🔔</div>
                <p>새로운 알림이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`flex items-start space-x-3 p-4 border-l-4 hover:bg-gray-50 transition-colors ${
                      notification.isRead 
                        ? "border-gray-200 bg-gray-50 opacity-75" 
                        : getNotificationColor(notification.type)
                    }`}
                  >
                    <div className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">
                        {notification.title}
                      </p>
                      <p className="text-gray-600 text-xs mt-1 break-words">
                        {notification.message}
                      </p>
                      <p className="text-gray-400 text-xs mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        className="text-purple-600 hover:text-purple-700 text-xs"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
