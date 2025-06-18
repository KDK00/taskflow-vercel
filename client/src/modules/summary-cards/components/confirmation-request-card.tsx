import React, { useState } from 'react';
import { CheckCircle, Clock, User, FileText, AlertTriangle, ChevronDown, ChevronRight, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface FollowUpTask {
  id: number;
  title: string;
  description?: string;
  category: string;
  followUpType: 'general' | 'contract';
  parentTaskId: number;
  assignedUser: { name: string; };
  creator: { name: string; };
  workDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  confirmationRequestedAt?: string; // 확인요청 시간
  confirmationCompletedAt?: string; // 확인 완료 시간
  status?: string;
}

interface ConfirmationRequestCardProps {
  followUpTasks: FollowUpTask[];
  onConfirm: (taskId: number) => void;
  onReject: (taskId: number, memo?: string) => void;
  loading?: boolean;
}

const priorityConfig = {
  low: { label: '낮음', color: 'bg-green-100 text-green-800', icon: '🟢' },
  medium: { label: '보통', color: 'bg-blue-100 text-blue-800', icon: '🔵' },
  high: { label: '높음', color: 'bg-orange-100 text-orange-800', icon: '🟠' },
  urgent: { label: '긴급', color: 'bg-red-100 text-red-800', icon: '🔴' }
};

const typeConfig = {
  general: { label: '경영일반', color: 'bg-indigo-100 text-indigo-800', icon: '📊' },
  contract: { label: '계약업무', color: 'bg-purple-100 text-purple-800', icon: '📋' }
};

export function ConfirmationRequestCard({
  followUpTasks,
  onConfirm,
  onReject,
  loading = false
}: ConfirmationRequestCardProps) {
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  
  const pendingTasks = followUpTasks.filter(task => task.status === 'pending');
  
  // 디버깅용 로그
  console.log('🔍 확인요청 카드 렌더링:', {
    totalTasks: followUpTasks.length,
    pendingTasks: pendingTasks.length,
    pendingTaskIds: pendingTasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
  });
  
  const toggleExpanded = (taskId: number) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };
  
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
          확인요청
              </CardTitle>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pendingTasks.length}건
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {pendingTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>확인요청 업무가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[240px] overflow-y-auto">
            {pendingTasks.slice(0, 5).map((task) => {
              const priority = priorityConfig[task.priority];
              
              // 🔧 안전한 날짜 처리
              let workDate: Date;
              let isValidDate = true;
              
              try {
                workDate = new Date(task.workDate);
                if (isNaN(workDate.getTime())) {
                  workDate = new Date();
                  isValidDate = false;
                  console.warn('⚠️ 잘못된 workDate 감지:', task.workDate, '현재 시간으로 대체');
                }
              } catch (error) {
                workDate = new Date();
                isValidDate = false;
                console.warn('⚠️ workDate 파싱 오류:', task.workDate, error);
              }
              
              const isExpanded = expandedTask === task.id;
              
              return (
                <div key={task.id} className={`border rounded-lg ${isExpanded ? 'p-2' : 'p-1'} bg-gray-50 hover:bg-gray-100 transition-colors`}>
                  {/* 한줄 기본 표시 */}
                  <div className="flex items-center gap-2 min-h-[32px]">
                    {/* 날짜/시간 - 고정폭 */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className={`font-bold text-xs ${
                        isValidDate && workDate.getDay() === 0 ? 'text-red-500' :
                        isValidDate && workDate.getDay() === 6 ? 'text-blue-500' :
                        'text-gray-700'
                      }`}>
                        {isValidDate ? format(workDate, 'MM/dd') : '--/--'}
                      </div>
                      <div className="text-xs text-gray-700">
                        {isValidDate ? format(workDate, 'HH:mm') : '--:--'}
                      </div>
                    </div>
                    
                    {/* 긴급도 - 한글로 표시 */}
                    <div className="flex-shrink-0">
                      <Badge className={`text-xs px-1 py-0.5 ${priority.color}`}>
                        {priority.label}
                      </Badge>
                    </div>
                    
                    {/* 제목 및 요청자 */}
                    <button
                      onClick={() => toggleExpanded(task.id)}
                      className="flex-1 text-left hover:bg-white transition-colors rounded px-1 py-0.5 min-w-0"
                    >
                      <div className="flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-xs text-gray-900 truncate">
                            {task.title}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            <span className="font-semibold text-gray-600">요청자:</span> {task.creator.name}
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* 확인 버튼만 표시 */}
                      <div className="flex-shrink-0 flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white font-medium"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔘 확인 버튼 클릭됨:', task.id, task.title);
                          onConfirm(task.id);
                        }}
                          disabled={loading}
                        >
                        {loading ? '처리중...' : '확인'}
                        </Button>
                      </div>
                  </div>
                  
                  {/* 확장된 내용 */}
                  {isExpanded && (
                    <div className="mt-2 space-y-2">
                      {task.description && (
                        <div className="text-xs bg-white p-2 rounded border">
                          <div className="font-semibold text-gray-700 mb-1">내용:</div>
                          <div className="text-gray-600">{task.description}</div>
                        </div>
                      )}
                      
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        {/* 확인요청 시간 정보 */}
                        {task.confirmationRequestedAt ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-blue-500" />
                              <span className="font-semibold text-gray-700">확인요청:</span>
                              <span className="text-gray-600">
                                {format(new Date(task.confirmationRequestedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({formatDistanceToNow(new Date(task.confirmationRequestedAt), { 
                                  addSuffix: true, 
                                  locale: ko 
                                })})
                              </span>
                            </div>
                            
                            {task.confirmationCompletedAt && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span className="font-semibold text-gray-700">확인완료:</span>
                                <span className="text-gray-600">
                                  {format(new Date(task.confirmationCompletedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({formatDistanceToNow(new Date(task.confirmationCompletedAt), { 
                                    addSuffix: true, 
                                    locale: ko 
                                  })})
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-gray-700">요청시간:</span>{' '}
                            <span className="text-gray-600">
                              {(() => {
                                try {
                                  const createdDate = new Date(task.createdAt);
                                  if (isNaN(createdDate.getTime())) {
                                    return '날짜 정보 없음';
                                  }
                                  return formatDistanceToNow(createdDate, { addSuffix: true, locale: ko });
                                } catch (error) {
                                  return '날짜 오류';
                                }
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* 더보기 안내 */}
            {pendingTasks.length > 5 && (
              <div className="text-center py-2 text-xs text-gray-500 border-t">
                총 {pendingTasks.length}건 중 5건 표시 • 스크롤하여 더보기
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 