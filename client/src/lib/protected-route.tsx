import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  // 로그인 기능 항상 활성화 - 모듈화된 로그인 시스템 적용
  const isDevelopmentMode = false; // 정상 로그인 플로우 활성화

  if (isDevelopmentMode) {
    // 개발 모드: 로그인 없이 바로 접근 허용
    return <Route path={path} component={Component} />;
  }

  // 로그인 기능 활성화 - 인증이 필요한 페이지 접근 제어
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen gradient-bg">
          <div className="glass-card rounded-2xl p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-center mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
