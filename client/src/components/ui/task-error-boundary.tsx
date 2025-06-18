import React, { Component, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  retryable?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class TaskErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // 에러 로깅
    console.group(`🚨 TaskFlow Error: ${this.props.componentName || 'Unknown'}`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();

    // 외부 에러 핸들러 호출
    this.props.onError?.(error, errorInfo);

    // 에러 리포팅 (실제 환경에서는 Sentry 등 사용)
    if (process.env.NODE_ENV === 'production') {
      // TODO: 에러 리포팅 서비스에 전송
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 폴백이 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <TaskErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          onGoHome={this.handleGoHome}
          showDetails={this.props.showDetails}
          retryable={this.props.retryable}
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

// 🎨 기본 에러 폴백 컴포넌트
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onReset: () => void;
  onGoHome: () => void;
  showDetails?: boolean;
  retryable?: boolean;
  componentName?: string;
}

function TaskErrorFallback({
  error,
  errorInfo,
  retryCount,
  maxRetries,
  onRetry,
  onReset,
  onGoHome,
  showDetails = false,
  retryable = true,
  componentName
}: ErrorFallbackProps) {
  const canRetry = retryable && retryCount < maxRetries;

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg border border-red-200 shadow-lg">
        <div className="p-6">
          {/* 에러 아이콘 */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          {/* 에러 제목 */}
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            문제가 발생했습니다
          </h3>

          {/* 에러 설명 */}
          <p className="text-sm text-gray-600 text-center mb-4">
            {componentName && `${componentName} 컴포넌트에서 `}
            예상치 못한 오류가 발생했습니다.
            {canRetry && " 다시 시도하거나 "}
            페이지를 새로고침해주세요.
          </p>

          {/* 재시도 정보 */}
          {retryCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                재시도 횟수: {retryCount}/{maxRetries}
              </p>
            </div>
          )}

          {/* 에러 상세 정보 (개발 환경 또는 showDetails가 true일 때) */}
          {(showDetails || process.env.NODE_ENV === 'development') && error && (
            <details className="mb-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                기술적 세부사항
              </summary>
              <div className="bg-gray-50 border rounded-md p-3 text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
                <p className="font-semibold mb-1">오류 메시지:</p>
                <p className="mb-2">{error.message}</p>
                {error.stack && (
                  <>
                    <p className="font-semibold mb-1">스택 트레이스:</p>
                    <pre className="whitespace-pre-wrap">{error.stack}</pre>
                  </>
                )}
              </div>
            </details>
          )}

          {/* 액션 버튼들 */}
          <div className="flex flex-col gap-2">
            {canRetry && (
              <Button
                onClick={onRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                다시 시도 ({maxRetries - retryCount}회 남음)
              </Button>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={onReset}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                초기화
              </Button>
              
              <Button
                onClick={onGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                홈으로
              </Button>
            </div>

            {!canRetry && retryable && (
              <p className="text-xs text-gray-500 text-center mt-2">
                최대 재시도 횟수에 도달했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 🎯 간단한 에러 경계 HOC
export function withTaskErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    componentName?: string;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    showDetails?: boolean;
    retryable?: boolean;
  } = {}
) {
  return function WrappedComponent(props: P) {
    return (
      <TaskErrorBoundary {...options}>
        <Component {...props} />
      </TaskErrorBoundary>
    );
  };
}

// 🔧 에러 상태 컴포넌트 (API 에러용)
interface ApiErrorProps {
  error: Error | string;
  onRetry?: () => void;
  onReset?: () => void;
  title?: string;
  description?: string;
  showRetry?: boolean;
}

export function ApiError({ 
  error, 
  onRetry, 
  onReset,
  title = "데이터를 불러올 수 없습니다",
  description,
  showRetry = true
}: ApiErrorProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>
      
      <p className="text-sm text-gray-600 text-center mb-4 max-w-md">
        {description || errorMessage}
      </p>
      
      {showRetry && (
        <div className="flex gap-2">
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </Button>
          )}
          {onReset && (
            <Button onClick={onReset} variant="outline" size="sm">
              초기화
            </Button>
          )}
        </div>
      )}
    </div>
  );
} 