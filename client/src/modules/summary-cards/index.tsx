// 📊 Summary Cards Module - 완전 독립적이고 재사용 가능한 요약 카드 모듈

import React, { useState, useEffect } from 'react';
import { ModuleProps, DashboardStats, LoadingState } from '../core/types';
import { ModuleErrorBoundary } from '../core/components/ErrorBoundary';
import { StatsApiClient } from '../core/api/client';
import { CARD_CONFIGS, CardConfig, getConfigForRole, getThemeConfig } from './config';

// 🎨 아이콘 매핑 (lucide-react)
const iconMap = {
  BarChart3: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Clock: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  CheckCircle: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  AlertTriangle: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
};

// 📊 개별 카드 컴포넌트
interface CardProps {
  config: CardConfig;
  stats: DashboardStats | null;
  isActive: boolean;
  onClick: () => void;
  loading: boolean;
}

function SummaryCard({ config, stats, isActive, onClick, loading }: CardProps) {
  const Icon = iconMap[config.icon as keyof typeof iconMap];
  
  const getValue = () => {
    if (!stats) return 0;
    switch (config.filter) {
      case 'all': return stats.totalTasks;
      case 'progress': return stats.inProgressTasks;
      case 'completed': return stats.completedTasks;
      case 'overdue': return stats.overdueTasks;
      default: return 0;
    }
  };

  const getProgress = () => {
    if (!stats || !config.showProgress) return undefined;
    const total = stats.totalTasks;
    const current = getValue();
    return total > 0 ? Math.round((current / total) * 100) : 0;
  };

  const value = getValue();
  const progress = getProgress();

  return (
    <div 
      className={`
        relative p-6 rounded-xl shadow-sm border cursor-pointer transition-all duration-200
        hover:scale-105 hover:shadow-lg transform
        ${isActive ? 'ring-2 ring-purple-500 bg-purple-50 border-purple-200' : 'bg-white border-gray-200 hover:border-gray-300'}
        ${loading ? 'opacity-50' : ''}
      `}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-xl">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{config.title}</p>
          <p className={`text-3xl font-bold mt-1 ${config.color}`}>
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center`}>
          {Icon && <div className={config.color}><Icon /></div>}
        </div>
      </div>
      
      <div className="mt-4">
        {progress !== undefined && (
          <div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${config.color.replace('text-', 'bg-')}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-gray-500 text-sm">
              {progress}% 진행중
            </span>
          </div>
        )}
        
        {config.showChange && (
          <div className="flex items-center">
            <span className={`text-sm font-medium ${config.color}`}>
              +12%
            </span>
            <span className="text-gray-500 text-sm ml-2">지난 주 대비</span>
          </div>
        )}
        
        {config.showAlert && value > 0 && (
          <div className="flex items-center">
            <span className="text-red-600 text-sm font-medium">
              주의 필요
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 🏗️ 메인 Summary Cards 모듈
interface SummaryCardsModuleProps extends ModuleProps {
  onFilterChange?: (filter: string) => void;
  userRole?: 'employee' | 'manager' | 'admin';
  theme?: 'light' | 'dark' | 'corporate';
}

function SummaryCardsModule({ 
  config, 
  context, 
  onError, 
  onUpdate, 
  onLoading,
  onFilterChange,
  userRole,
  theme,
  className 
}: SummaryCardsModuleProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [apiClient, setApiClient] = useState<StatsApiClient | null>(null);

  // 🔧 설정 병합
  const mergedConfig = {
    ...config,
    ...(userRole ? getConfigForRole(userRole) : {}),
    ...(theme ? getThemeConfig(theme) : {})
  };

  // 🌐 API 클라이언트 초기화
  useEffect(() => {
    const client = new StatsApiClient(mergedConfig);
    setApiClient(client);
    
    return () => {
      client.cancelPreviousRequest();
    };
  }, [mergedConfig]);

  // 📊 데이터 로드
  const loadStats = async () => {
    if (!apiClient) return;

    try {
      setLoading('loading');
      onLoading?.(true);

      const response = userRole === 'manager' || userRole === 'admin' 
        ? await apiClient.getTeamStats() 
        : await apiClient.getUserStats();

      if (response.success) {
        setStats(response.data);
        setLoading('success');
        onUpdate?.(response.data);
      } else {
        throw new Error(response.error || 'Failed to load stats');
      }
    } catch (error) {
      setLoading('error');
      onError?.({
        code: 'STATS_LOAD_ERROR',
        message: (error as Error).message,
        module: 'summary-cards',
        timestamp: new Date(),
        recoverable: true
      });
    } finally {
      onLoading?.(false);
    }
  };

  // 🔄 초기 로드 및 주기적 업데이트
  useEffect(() => {
    if (mergedConfig.refreshOnMount) {
      loadStats();
    }

    // 자동 새로고침 비활성화: updateInterval이 0이면 setInterval 실행하지 않음
    if (mergedConfig.updateInterval > 0) {
      const interval = setInterval(loadStats, mergedConfig.updateInterval);
      return () => clearInterval(interval);
    }
  }, []);

  // 🎯 필터 변경 처리
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    onFilterChange?.(filter);
  };

  // 🎨 스타일 적용
  const moduleClassName = `
    summary-cards-module 
    ${mergedConfig.styling?.className || ''}
    ${className || ''}
  `.trim();

  return (
    <div className={moduleClassName}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CARD_CONFIGS.map((cardConfig, index) => (
          <SummaryCard
            key={cardConfig.filter}
            config={cardConfig}
            stats={stats}
            isActive={activeFilter === cardConfig.filter}
            onClick={() => handleFilterChange(cardConfig.filter)}
            loading={loading === 'loading'}
          />
        ))}
      </div>
      
      {loading === 'error' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">
            📊 통계 데이터를 불러오는데 실패했습니다.
            <button 
              onClick={loadStats}
              className="ml-2 text-red-600 underline hover:text-red-800"
            >
              다시 시도
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

// 🛡️ 오류 경계로 감싼 최종 컴포넌트
export function SummaryCards(props: SummaryCardsModuleProps) {
  return (
    <ModuleErrorBoundary
      moduleName="summary-cards"
      onError={props.onError}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <SummaryCardsModule {...props} />
    </ModuleErrorBoundary>
  );
}

// 📦 모듈 매니페스트
export const SummaryCardsManifest = {
  name: 'summary-cards',
  version: '1.0.0',
  description: '업무 통계를 표시하는 요약 카드 모듈',
  author: 'TaskFlow Team',
  dependencies: [],
  peerDependencies: ['react', '@taskflow/core'],
  exports: ['SummaryCards', 'SummaryCardsManifest'],
  config: {
    configurable: true,
    themes: ['light', 'dark', 'corporate'],
    roles: ['employee', 'manager', 'admin']
  }
};

// 🎯 기본 export
export default SummaryCards; 