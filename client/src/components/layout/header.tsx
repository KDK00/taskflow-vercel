import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTasks } from "@/hooks/use-tasks";
import { Button } from "@/components/ui/button";
import { NotificationPanel } from "@/components/ui/notification-panel";
import { TaskCreateModal } from "@/modules/task-management/components/task-create-modal";
import { Bell, User, BarChart3, FileText, Layout, Menu, X, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

interface HeaderProps {
  currentView: "employee" | "manager";
  onViewChange: (view: "employee" | "manager") => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  const { user, logout } = useAuth();
  const { allTasks: tasks } = useTasks();
  const [location] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);

  // 역할 전환 권한 확인 (내부적으로 결정)
  const canSwitchRole = user?.role === "manager" || user?.role === "developer";

  // 현재 시간 업데이트 (1초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 읽지 않은 알림 개수 조회
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });
      return response.ok ? response.json() : [];
    },
    refetchInterval: false // 자동 새로고침 비활성화
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const handleLogout = () => {
    logout();
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const isActive = (path: string) => location === path;

  return (
    <>
      <header className="glass-header sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl bg-gradient-to-r from-gray-900/15 via-gray-800/12 to-gray-900/15">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo - 반응형 최적화 */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink-0">
              <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity duration-200 flex-shrink-0">
                <img 
                  src="/nara-logo.png" 
                  alt="NARA Corporation" 
                  className="h-7 sm:h-8 lg:h-10 w-auto filter brightness-110 flex-shrink-0"
                />
                <h1 className="text-white font-semibold text-sm sm:text-base lg:text-lg xl:text-xl truncate" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.15)' }}>
                  <span className="hidden sm:inline">NARA 업무관리</span>
                  <span className="sm:hidden">NARA</span>
                </h1>
              </Link>
              
              {/* 글래스모피즘 효과의 추가 아이콘 */}
              <Button
                onClick={handleCreateTask}
                className="relative group h-6 w-6 sm:h-7 sm:w-7 p-0 rounded-full border-0 overflow-hidden flex-shrink-0 transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255,255,255,0.2)'
                }}
              >
                {/* 좌에서 우로 빛나는 효과 - 항상 실행 */}
                <div 
                  className="absolute inset-0 opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shine 2s ease-in-out infinite'
                  }}
                />
                
                {/* 회전하는 테두리 효과 */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(transparent, rgba(255,255,255,0.3), transparent, rgba(255,255,255,0.2), transparent)',
                    animation: 'rotate 3s linear infinite'
                  }}
                />
                
                {/* 내부 글로우 효과 */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)'
                  }}
                />
                
                {/* Plus 아이콘 */}
                <Plus 
                  className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:text-blue-100 transition-colors duration-300 relative z-10" 
                  strokeWidth={3}
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                />
              </Button>
            </div>
            
            {/* Desktop Navigation - 더 넓은 화면에서만 표시 */}
            <nav className="hidden xl:flex items-center space-x-4 2xl:space-x-6">
              <Link href="/dashboard" className={`transition-colors duration-200 text-sm 2xl:text-base whitespace-nowrap ${
                isActive("/dashboard") ? "text-white" : "text-white/70 hover:text-white"
              }`} style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                대시보드
              </Link>
              <Link href="/reports" className={`transition-colors duration-200 text-sm 2xl:text-base whitespace-nowrap ${
                isActive("/reports") ? "text-white" : "text-white/70 hover:text-white"
              }`} style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                보고서
              </Link>
              <Link href="/advanced-analytics" className={`transition-colors duration-200 text-sm 2xl:text-base whitespace-nowrap ${
                isActive("/advanced-analytics") ? "text-white" : "text-white/70 hover:text-white"
              }`} style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                고급분석
              </Link>
            </nav>
            
            {/* Right Side Controls - 반응형 최적화 */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
              {/* Mobile Menu Button - 더 작은 화면에서 표시 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="xl:hidden text-white/70 hover:text-white hover:bg-white/10 p-2 flex-shrink-0"
              >
                {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>

              {/* 아이폰 스타일 시간 표시 - 반응형 */}
              <div className="hidden sm:flex items-center justify-center px-4 py-2 flex-shrink-0">
                <div 
                  className="font-bold tracking-wide select-none"
                  style={{ 
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
                    fontSize: '18px',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    color: 'rgba(255, 255, 255, 0.99)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {currentTime.toLocaleTimeString('ko-KR', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
              
              {/* Notification Bell - 반응형 */}
              <div className="relative flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 relative"
                >
                  <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
                
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 z-50">
                    <NotificationPanel 
                      notifications={notifications}
                      onClose={() => setShowNotifications(false)}
                    />
                  </div>
                )}
              </div>
              
              {/* Role Switch - 항상 표시 (권한에 따라 활성화) */}
              <div className="hidden sm:flex items-center space-x-1 bg-white/10 rounded-lg p-1 flex-shrink-0">
                <Button
                  variant={currentView === "employee" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => canSwitchRole && onViewChange("employee")}
                  disabled={!canSwitchRole}
                  className={`text-xs px-2 py-1 h-7 ${
                      currentView === "employee"
                      ? "bg-white text-gray-900 hover:bg-gray-100" 
                      : canSwitchRole 
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-white/40 cursor-not-allowed"
                    }`}
                >
                  직원
                </Button>
                <Button
                  variant={currentView === "manager" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => canSwitchRole && onViewChange("manager")}
                  disabled={!canSwitchRole}
                  className={`text-xs px-2 py-1 h-7 ${
                      currentView === "manager"
                      ? "bg-white text-gray-900 hover:bg-gray-100" 
                      : canSwitchRole 
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-white/40 cursor-not-allowed"
                    }`}
                >
                  {user?.role === "developer" ? "개발자" : "관리자"}
                </Button>
              </div>

              {/* User Menu - 반응형 */}
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-2 sm:px-3 py-1 sm:py-2 flex-shrink-0">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-white/70 flex-shrink-0" />
                <div className="hidden sm:block min-w-0">
                  <p className="text-white text-xs sm:text-sm font-medium truncate" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                    {user?.name || "사용자"}
                  </p>
                  <p className="text-white/60 text-xs truncate" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                    {user?.role === "developer" ? "개발자" : 
                     user?.role === "manager" ? "관리자" : "직원"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-1 sm:p-2 flex-shrink-0"
                  title="로그아웃"
                >
                  <span className="text-xs">🚪</span>
                </Button>
              </div>
            </div>
            </div>
          </div>

        {/* Mobile Menu - 반응형 드롭다운 */}
          {showMobileMenu && (
          <div className="xl:hidden bg-black/20 backdrop-blur-lg border-t border-white/10">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
              <nav className="space-y-2">
                <Link 
                  href="/dashboard" 
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                isActive("/dashboard") 
                      ? "bg-white/20 text-white" 
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="w-4 h-4 flex-shrink-0" />
                    <span>대시보드</span>
                  </div>
              </Link>
                <Link 
                  href="/reports" 
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                isActive("/reports") 
                      ? "bg-white/20 text-white" 
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span>보고서</span>
                  </div>
              </Link>
                <Link 
                  href="/advanced-analytics" 
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                isActive("/advanced-analytics") 
                      ? "bg-white/20 text-white" 
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="w-4 h-4 flex-shrink-0" />
                    <span>고급분석</span>
                  </div>
              </Link>
              
                {/* 모바일에서 역할 전환 - 항상 표시 */}
                <div className="sm:hidden px-3 py-2">
                  <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-2">
                    <span className="text-white/70 text-sm flex-shrink-0">보기 모드:</span>
                    <div className="flex space-x-1 flex-1">
                      <Button
                        variant={currentView === "employee" ? "default" : "ghost"}
                        size="sm"
                      onClick={() => {
                          if (canSwitchRole) {
                        onViewChange("employee");
                        setShowMobileMenu(false);
                          }
                      }}
                        disabled={!canSwitchRole}
                        className={`text-xs px-3 py-1 h-7 flex-1 ${
                          currentView === "employee" 
                            ? "bg-white text-gray-900 hover:bg-gray-100" 
                            : canSwitchRole 
                              ? "text-white/70 hover:text-white hover:bg-white/10"
                              : "text-white/40 cursor-not-allowed"
                        }`}
                      >
                        직원
                      </Button>
                      <Button
                        variant={currentView === "manager" ? "default" : "ghost"}
                        size="sm"
                      onClick={() => {
                          if (canSwitchRole) {
                        onViewChange("manager");
                        setShowMobileMenu(false);
                          }
                        }}
                        disabled={!canSwitchRole}
                        className={`text-xs px-3 py-1 h-7 flex-1 ${
                          currentView === "manager" 
                            ? "bg-white text-gray-900 hover:bg-gray-100" 
                            : canSwitchRole 
                              ? "text-white/70 hover:text-white hover:bg-white/10"
                              : "text-white/40 cursor-not-allowed"
                        }`}
                    >
                        {user?.role === "developer" ? "개발자" : "관리자"}
                      </Button>
                    </div>
                  </div>
                </div>
              </nav>
            </div>
            </div>
          )}
      </header>
      
      {/* Task Create Modal */}
      {isTaskModalOpen && (
        <TaskCreateModal
          isOpen={isTaskModalOpen}
          onClose={handleCloseModal}
          task={editingTask ? tasks.find(task => task.id === editingTask) : undefined}
        />
      )}
    </>
  );
}
