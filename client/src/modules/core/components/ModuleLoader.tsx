// 🔌 Module Loader - 모든 모듈을 통합하여 로드하는 시스템

import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { moduleRegistry } from '../registry/ModuleRegistry';
import { ModuleErrorBoundary } from './ErrorBoundary';
import { Module, ModuleContext, ModuleError, LoadingState } from '../types';
import { ModuleProps } from '../types/module';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';

// 📋 모듈 로더 Props
interface ModuleLoaderProps extends ModuleProps {
  moduleId: string;
  fallback?: React.ComponentType;
  lazy?: boolean;
  autoLoad?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

// 📋 모듈 설정
interface ModuleConfig {
  name: string;
  props?: Record<string, any>;
  config?: Record<string, any>;
  className?: string;
  hidden?: boolean;
}

// 🎨 레이아웃 스타일
const layoutStyles = {
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  flex: 'flex flex-wrap gap-6',
  stack: 'space-y-6',
  custom: ''
};

export const ModuleLoader: React.FC<ModuleLoaderProps> = ({
  moduleId,
  fallback: Fallback,
  lazy: isLazy = true,
  autoLoad = true,
  retryOnError = false,
  maxRetries = 3,
  config = {},
  onLoad,
  onError,
  onUnload,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [moduleInstance, setModuleInstance] = useState<any>(null);

  // 모듈 로딩 함수
  const loadModule = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 모듈 로딩 시작: ${moduleId}`);
      
      const instance = await moduleRegistry.load(moduleId);
      
      if (instance.error) {
        throw instance.error;
      }
      
      setModuleInstance(instance);
      console.log(`✅ 모듈 로딩 완료: ${moduleId}`);
      
      if (onLoad) {
        onLoad();
      }
    } catch (err) {
      const error = err as Error;
      console.error(`❌ 모듈 로딩 실패: ${moduleId}`, error);
      
      setError(error);
      
      if (onError) {
        onError(error);
      }
      
      // 재시도 로직
      if (retryOnError && retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadModule();
        }, Math.pow(2, retryCount) * 1000); // 지수 백오프
      }
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 자동 로딩
  useEffect(() => {
    if (autoLoad) {
      loadModule();
    }
    
    return () => {
      if (onUnload) {
        onUnload();
      }
    };
  }, [moduleId, autoLoad]);

  // 수동 로딩을 위한 함수
  const manualLoad = () => {
    loadModule();
  };

  // Lazy 로딩을 위한 컴포넌트 생성
  const LazyModule = isLazy && moduleInstance 
    ? lazy(async () => {
        return { default: moduleInstance.component };
      })
    : moduleInstance?.component;

  // 로딩 상태 렌더링
  if (loading) {
    return Fallback ? <Fallback /> : <LoadingSpinner moduleId={moduleId} />;
  }

  // 에러 상태 렌더링
  if (error) {
    return (
      <div className="module-error-container">
        <div className="module-error">
          <h3>모듈 로딩 실패: {moduleId}</h3>
          <p>{error.message}</p>
          {retryOnError && retryCount < maxRetries && (
            <p>재시도 중... ({retryCount + 1}/{maxRetries})</p>
          )}
          {(!retryOnError || retryCount >= maxRetries) && (
            <button onClick={manualLoad} className="retry-button">
              다시 시도
            </button>
          )}
        </div>
      </div>
    );
  }

  // 모듈이 없는 경우
  if (!moduleInstance) {
    return (
      <div className="module-not-found">
        <p>모듈을 찾을 수 없습니다: {moduleId}</p>
        <button onClick={manualLoad} className="load-button">
          로드 시도
        </button>
      </div>
    );
  }

  // 모듈 렌더링
  const ModuleComponent = LazyModule;
  
  if (!ModuleComponent) {
    return <div>모듈 컴포넌트를 찾을 수 없습니다.</div>;
  }

  // Lazy 로딩인 경우 Suspense로 감싸기
  if (isLazy && React.isValidElement(LazyModule)) {
    return (
      <ErrorBoundary moduleName={moduleId}>
        <Suspense fallback={Fallback ? <Fallback /> : <LoadingSpinner moduleId={moduleId} />}>
          <ModuleComponent 
            config={{ ...moduleInstance.config, ...config }} 
            {...props} 
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // 일반 로딩인 경우
  return (
    <ErrorBoundary moduleName={moduleId}>
      <ModuleComponent 
        config={{ ...moduleInstance.config, ...config }} 
        {...props} 
      />
    </ErrorBoundary>
  );
};

// 🎯 특화된 로더들
export function DashboardModuleLoader(props: Omit<ModuleLoaderProps, 'modules'>) {
  return (
    <ModuleLoader
      moduleId="summary-cards"
      layout="grid"
      {...props}
    />
  );
}

export function ReportsModuleLoader(props: Omit<ModuleLoaderProps, 'modules'>) {
  return (
    <ModuleLoader
      moduleId="weekly-report"
      layout="stack"
      {...props}
    />
  );
}

// 🔧 훅 기반 모듈 로더
export function useModuleLoader(modules: string[]) {
  const [loadedModules, setLoadedModules] = useState<Record<string, React.ComponentType<any>>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<ModuleError[]>([]);

  useEffect(() => {
    const loadModules = async () => {
      const components: Record<string, React.ComponentType<any>> = {};
      const moduleErrors: ModuleError[] = [];

      for (const moduleName of modules) {
        try {
          const module = moduleRegistry.get(moduleName);
          if (module) {
            if (!moduleRegistry.isInitialized(moduleName)) {
              await moduleRegistry.initialize(moduleName, {
                environment: process.env.NODE_ENV as any
              });
            }
            components[moduleName] = module.component;
          }
        } catch (error) {
          moduleErrors.push({
            code: 'HOOK_LOAD_ERROR',
            message: (error as Error).message,
            module: moduleName,
            timestamp: new Date(),
            recoverable: true
          });
        }
      }

      setLoadedModules(components);
      setErrors(moduleErrors);
      setLoading(false);
    };

    loadModules();
  }, [modules]);

  return { loadedModules, loading, errors };
}

// 모듈 프리로더 컴포넌트
export const ModulePreloader: React.FC<{ moduleIds: string[] }> = ({ moduleIds }) => {
  const [preloadedModules, setPreloadedModules] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const preloadModules = async () => {
      for (const moduleId of moduleIds) {
        try {
          await moduleRegistry.load(moduleId);
          setPreloadedModules(prev => new Set([...prev, moduleId]));
          console.log(`🚀 프리로드 완료: ${moduleId}`);
        } catch (error) {
          console.error(`❌ 프리로드 실패: ${moduleId}`, error);
        }
      }
    };
    
    preloadModules();
  }, [moduleIds]);
  
  return (
    <div className="module-preloader">
      <p>모듈 프리로딩 중... ({preloadedModules.size}/{moduleIds.length})</p>
      <div className="preload-progress">
        {moduleIds.map(id => (
          <span 
            key={id} 
            className={preloadedModules.has(id) ? 'loaded' : 'loading'}
          >
            {id}
          </span>
        ))}
      </div>
    </div>
  );
};

// 모듈 상태 표시 컴포넌트
export const ModuleStatus: React.FC<{ moduleId: string }> = ({ moduleId }) => {
  const [instance, setInstance] = useState(moduleRegistry.get(moduleId));
  
  useEffect(() => {
    const updateStatus = () => {
      setInstance(moduleRegistry.get(moduleId));
    };
    
    // 모듈 이벤트 리스너 등록
    moduleRegistry.on('load', updateStatus);
    moduleRegistry.on('unload', updateStatus);
    moduleRegistry.on('error', updateStatus);
    
    return () => {
      moduleRegistry.off('load', updateStatus);
      moduleRegistry.off('unload', updateStatus);
      moduleRegistry.off('error', updateStatus);
    };
  }, [moduleId]);
  
  if (!instance) {
    return <span className="module-status not-loaded">미로딩</span>;
  }
  
  if (instance.error) {
    return <span className="module-status error">오류</span>;
  }
  
  if (instance.isActive) {
    return <span className="module-status active">활성</span>;
  }
  
  return <span className="module-status loaded">로딩됨</span>;
};

export default ModuleLoader; 