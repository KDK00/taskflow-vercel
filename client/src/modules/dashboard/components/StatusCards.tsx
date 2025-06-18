import React, { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';

interface StatusGroup {
  label: string;
  emoji: string;
  color: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  titleBg: string;
  tasks: any[];
}

interface StatusCardsProps {
  statusGroups: Record<string, StatusGroup>;
  showPreview?: boolean;
  maxPreviewItems?: number;
  onCardClick?: (status: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusCards: React.FC<StatusCardsProps> = ({
  statusGroups,
  showPreview = true,
  maxPreviewItems = 3,
  onCardClick,
  className = '',
  style = {}
}) => {
  const [, setLocation] = useLocation();

  const handleCardClick = useCallback((status: string) => {
    if (onCardClick) {
      onCardClick(status);
    } else {
      // 기본 동작: task-management 페이지로 이동
      setLocation(`/task-management?status=${status}`);
    }
  }, [onCardClick, setLocation]);

  return (
    <div 
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 ${className}`}
      style={style}
    >
      {Object.entries(statusGroups).map(([status, config]) => (
        <Card 
          key={status}
          className={`cursor-pointer transition-all duration-200 ${config.color} ${config.borderColor} border hover:shadow-md transform hover:scale-102 p-4`}
          onClick={() => handleCardClick(status)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`${config.titleBg} px-3 py-1 rounded-md inline-block`}>
                <span 
                  className="text-white text-sm font-bold tracking-wide" 
                  style={{ filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 1))' }}
                >
                  {config.label}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-xl font-bold ${config.textColor}`}>
                {config.tasks.length}
              </span>
              <ChevronRight className={`w-4 h-4 ${config.iconColor}`} />
            </div>
          </div>
          
          {/* 업무 미리보기 */}
          {showPreview && config.tasks.length > 0 && (
            <div className="mt-2 space-y-1">
              {config.tasks.slice(0, maxPreviewItems).map((task, index) => (
                <div 
                  key={task.id}
                  className={`text-xs ${config.textColor} opacity-70 truncate`}
                >
                  • {task.title}
                </div>
              ))}
              {config.tasks.length > maxPreviewItems && (
                <div className={`text-xs ${config.textColor} opacity-50`}>
                  +{config.tasks.length - maxPreviewItems}개 더
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default StatusCards; 