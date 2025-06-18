// 🛡️ Module Error Boundary - 각 모듈의 독립적 오류 처리

import React, { Component, ReactNode } from 'react';
import { ModuleError } from '../types';

interface Props {
  children: ReactNode;
  moduleName?: string;
  fallback?: ReactNode;
  onError?: (error: ModuleError) => void;
  showDetails?: boolean;
  retryable?: boolean;
}

interface State {
  hasError: boolean;
  error: ModuleError | null;
  retryCount: number;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const moduleError: ModuleError = {
      code: 'MODULE_ERROR',
      message: error.message,
      module: this.props.moduleName || 'unknown',
      timestamp: new Date(),
      details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount
      },
      recoverable: this.props.retryable !== false
    };

    this.setState({ error: moduleError });
    this.props.onError?.(moduleError);

    // 개발 환경에서 상세 로그
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Module Error: ${moduleError.module}`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Module Error:', moduleError);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 폴백이 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 오류 UI
      return (
        <ErrorFallback
          error={this.state.error}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          showDetails={this.props.showDetails}
          retryable={this.props.retryable}
        />
      );
    }

    return this.props.children;
  }
}

// 🎨 기본 오류 폴백 컴포넌트
interface ErrorFallbackProps {
  error: ModuleError | null;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onReset: () => void;
  showDetails?: boolean;
  retryable?: boolean;
}

function ErrorFallback({
  error,
  retryCount,
  maxRetries,
  onRetry,
  onReset,
  showDetails = false,
  retryable = true
}: ErrorFallbackProps) {
  const canRetry = retryable && retryCount < maxRetries;

  return (
    <div className="module-error-boundary p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-lg">⚠️</span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            모듈 오류가 발생했습니다
          </h3>
          
          <div className="text-sm text-red-700 mb-4">
            <p className="mb-1">
              <strong>모듈:</strong> {error?.module || '알 수 없음'}
            </p>
            <p className="mb-1">
              <strong>시간:</strong> {error?.timestamp?.toLocaleString()}
            </p>
            {retryCount > 0 && (
              <p className="mb-1">
                <strong>재시도:</strong> {retryCount}/{maxRetries}
              </p>
            )}
          </div>

          {showDetails && error && (
            <details className="mb-4">
              <summary className="cursor-pointer text-sm font-medium text-red-800 mb-2">
                오류 상세 정보
              </summary>
              <div className="bg-red-100 p-3 rounded text-xs text-red-800 font-mono">
                <p><strong>코드:</strong> {error.code}</p>
                <p><strong>메시지:</strong> {error.message}</p>
                {error.details && (
                  <pre className="mt-2 whitespace-pre-wrap">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                )}
              </div>
            </details>
          )}

          <div className="flex space-x-3">
            {canRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                🔄 다시 시도 ({maxRetries - retryCount}회 남음)
              </button>
            )}
            
            <button
              onClick={onReset}
              className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              🔄 초기화
            </button>
          </div>

          {!canRetry && retryable && (
            <p className="mt-3 text-sm text-red-600">
              최대 재시도 횟수에 도달했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// 🎯 간단한 오류 경계 HOC
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    moduleName?: string;
    fallback?: ReactNode;
    onError?: (error: ModuleError) => void;
  } = {}
) {
  return function WrappedComponent(props: P) {
    return (
      <ModuleErrorBoundary {...options}>
        <Component {...props} />
      </ModuleErrorBoundary>
    );
  };
}

// 🔧 훅 기반 오류 처리
export function useErrorHandler(moduleName: string) {
  const handleError = (error: Error | ModuleError) => {
    const moduleError: ModuleError = 'code' in error ? error : {
      code: 'MANUAL_ERROR',
      message: error.message,
      module: moduleName,
      timestamp: new Date(),
      recoverable: true
    };

    console.error(`Module Error [${moduleName}]:`, moduleError);
    
    // 전역 에러 핸들러가 있다면 호출
    if (window.moduleErrorHandler) {
      window.moduleErrorHandler(moduleError);
    }
  };

  return { handleError };
}

// 🌐 전역 에러 핸들러 타입 확장
declare global {
  interface Window {
    moduleErrorHandler?: (error: ModuleError) => void;
  }
} 