import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import TaskListAll from "@/pages/task-list-all";
import AdvancedAnalyticsPage from "@/pages/advanced-analytics";
import Reports from "@/pages/reports";
import { useEffect } from "react";
import { toast } from "sonner";

interface SecurityConfig {
  f12Restriction: boolean;
  rightClickRestriction: boolean;
  devToolsDetection: boolean;
  consoleWarning: boolean;
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/tasks" component={TaskListAll} />
      <ProtectedRoute path="/task-management" component={TaskListAll} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/advanced-analytics" component={AdvancedAnalyticsPage} />

      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SecurityMonitor() {
  const { user } = useAuth();
  
  // 시스템 보안 설정 조회
  const { data: securityConfig } = useQuery<SecurityConfig>({
    queryKey: ['security-config'],
    queryFn: async () => {
      const response = await fetch('/api/admin/security-config', {
        credentials: 'include'
      });
      if (!response.ok) {
        // 로그인하지 않은 경우 기본값 반환
        return {
          f12Restriction: false,
          rightClickRestriction: false,
          devToolsDetection: false,
          consoleWarning: true
        };
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    retry: false
  });
  
  useEffect(() => {
    // 개발자 계정의 경우 보안 모니터링 비활성화
    if (user?.role === 'developer') {
      console.log('🔧 개발자 계정 - 보안 모니터링 비활성화');
      return;
    }
    
    // 보안 설정이 로드되지 않았거나 모든 제한이 비활성화된 경우 리턴
    if (!securityConfig || (!securityConfig.f12Restriction && !securityConfig.rightClickRestriction && !securityConfig.devToolsDetection)) {
      console.log('🔧 보안 제한 비활성화 - 모니터링 건너뜀');
      return;
    }

    const reportSecurityViolation = async (type: string, details: string) => {
      try {
        await fetch('/api/admin/security-violation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ type, details })
        });
        
        toast.error(`보안 위반 감지: ${details}`, {
          description: '이 행동이 관리자에게 기록되었습니다.',
          duration: 5000,
        });
      } catch (error) {
        console.error('보안 위반 보고 실패:', error);
      }
    };

    // F12 키 감지 (설정에 따라)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!securityConfig?.f12Restriction) return;
      
      // F12 키
      if (event.key === 'F12') {
        event.preventDefault();
        reportSecurityViolation('keyboard', 'F12 키 사용 시도');
        return false;
      }
      
      // Ctrl+Shift+I (개발자 도구)
      if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault();
        reportSecurityViolation('keyboard', 'Ctrl+Shift+I 키 사용 시도');
        return false;
      }
      
      // Ctrl+U (소스 보기)
      if (event.ctrlKey && event.key === 'u') {
        event.preventDefault();
        reportSecurityViolation('keyboard', 'Ctrl+U 키 사용 시도');
        return false;
      }
      
      // Ctrl+Shift+C (요소 검사)
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        reportSecurityViolation('keyboard', 'Ctrl+Shift+C 키 사용 시도');
        return false;
      }
    };

    // 우클릭 방지 (설정에 따라)
    const handleContextMenu = (event: MouseEvent) => {
      if (!securityConfig?.rightClickRestriction) return;
      
      event.preventDefault();
      reportSecurityViolation('mouse', '우클릭 시도');
      return false;
    };

    // 개발자 도구 열림 감지 (간접적)
    let devtools = {
      open: false,
      orientation: null
    };
    
    const threshold = 160;
    const detectDevTools = () => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          reportSecurityViolation('devtools', '개발자 도구 열림 감지');
        }
      } else {
        devtools.open = false;
      }
    };

    // 이벤트 리스너 등록
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    
    // 개발자 도구 감지 (설정에 따라)
    let devToolsInterval: NodeJS.Timeout | null = null;
    if (securityConfig?.devToolsDetection && import.meta.env.PROD) {
      devToolsInterval = setInterval(detectDevTools, 500);
    }

    // 콘솔 경고 메시지 (설정에 따라)
    if (securityConfig?.consoleWarning) {
    console.clear();
    console.log('%c⚠️ 경고!', 'color: red; font-size: 20px; font-weight: bold;');
    console.log('%c이 브라우저 기능은 개발자를 위한 것입니다. 악의적인 사용자가 TaskFlow 시스템에 해를 끼치기 위해 이 기능을 사용하도록 유도할 수 있습니다. 모든 개발자 도구 사용이 기록됩니다.', 'color: red; font-size: 12px;');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      if (devToolsInterval) {
        clearInterval(devToolsInterval);
      }
    };
  }, [user, securityConfig]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <SecurityMonitor />
          <Toaster />
          <SonnerToaster 
            position="top-right" 
            richColors 
            closeButton 
            theme="dark" 
          />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
