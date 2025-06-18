import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FolderOpen, 
  Save, 
  Database,
  CheckCircle,
  AlertCircle,
  Server,
  Monitor,
  User,
  Download,
  Upload,
  Trash2,
  Shield,
  RefreshCw,
  Clock,
  Eye,
  EyeOff,
  Settings,
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Zap,
  Brain
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface SystemStatus {
  server: {
    status: 'online' | 'offline';
    port: number;
    uptime: string;
    nodeInfo: {
      version: string;
      platform: string;
      arch: string;
    };
  };
  client: {
    status: 'online' | 'offline';
    port: number;
    url: string;
  };
  auth: {
    isLoggedIn: boolean;
    username?: string;
    role?: string;
    loginTime?: string;
  };
  database?: {
    status: 'connected' | 'disconnected';
  };
        memory?: {
    // TaskFlow 앱 메모리
    heapUsed: number;
    heapTotal: number;
    usage: number;
    rss: number;
    external: number;
    processUsage: number;
    maxMemory: number;
    
    // 시스템 전체 메모리
    systemTotal: number;
    systemUsed: number;
    systemFree: number;
    systemUsage: number;
  };
  performance?: {
    optimization: 'good' | 'warning' | 'critical';
  };
  logs?: {
    count: number;
  };
}

interface BackupConfig {
  backupPath: string;
  includeTaskflowDb: boolean;
  includeAppDb: boolean;
  includeConfig: boolean;
  includeUsers: boolean;
}

interface RestoreConfig {
  restorePath: string;
  includeTaskflowDb: boolean;
  includeAppDb: boolean;
  includeConfig: boolean;
  includeUsers: boolean;
}

interface DeleteConfig {
  deleteTaskflowDb: boolean;
  deleteAppDb: boolean;
  deleteConfig: boolean;
  deleteUsers: boolean;
}

interface AutoBackupConfig {
  enabled: boolean;
  interval: '5min' | '10min' | '30min' | '1hour';
  backupPath: string;
}

interface SecurityConfig {
  f12Restriction: boolean;
  rightClickRestriction: boolean;
  devToolsDetection: boolean;
  consoleWarning: boolean;
}

interface SystemDebugLog {
  id: string;
  timestamp: string;
  username: string;
  action: 'login' | 'logout' | 'data_create' | 'data_update' | 'data_delete' | 'security_violation';
  details: string;
  ipAddress?: string;
  location?: string;
}

interface DebugLogsResponse {
  logs: SystemDebugLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalLogs: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface StorageSettingsProps {
  viewMode?: "employee" | "manager";
}

export function StorageSettings({ viewMode = "manager" }: StorageSettingsProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    backupPath: '',
    includeTaskflowDb: true,
    includeAppDb: true,
    includeConfig: true,
    includeUsers: true
  });
  const [restoreConfig, setRestoreConfig] = useState<RestoreConfig>({
    restorePath: '',
    includeTaskflowDb: true,
    includeAppDb: true,
    includeConfig: true,
    includeUsers: true
  });
  const [deleteConfig, setDeleteConfig] = useState<DeleteConfig>({
    deleteTaskflowDb: true,
    deleteAppDb: true,
    deleteConfig: true,
    deleteUsers: true
  });
  const [autoBackupConfig, setAutoBackupConfig] = useState<AutoBackupConfig>({
    enabled: false,
    interval: '30min',
    backupPath: ''
  });
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    f12Restriction: false,
    rightClickRestriction: false,
    devToolsDetection: false,
    consoleWarning: true
  });
  const [operationStatus, setOperationStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [lastLogCount, setLastLogCount] = useState<number>(0);

  // 관리자 권한 체크 (개발자, 운영자만 접근 가능)
  const isAdminUser = currentUser?.role === 'developer' || currentUser?.role === 'manager';
  const isDeveloper = currentUser?.role === 'developer';
  
  // 🎯 뷰 모드에 따른 권한 제한 (직원 뷰에서는 개발자 전용 기능 숨김)
  const showDeveloperFeatures = viewMode === "manager" && isDeveloper;
  const showSecuritySettings = viewMode === "manager" && isDeveloper;

  // 권한이 없는 경우 접근 거부
  if (!isAdminUser) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="glass-card border-red-200">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <Shield className="h-6 w-6" />
              접근 거부
            </CardTitle>
            <CardDescription className="text-red-500">
              이 페이지는 운영자 또는 개발자만 접근할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-700">
                현재 계정: <strong>{currentUser?.username || '알 수 없음'}</strong>
                <br />
                현재 권한: <strong>{currentUser?.role === 'employee' ? '일반 사용자' : currentUser?.role || '알 수 없음'}</strong>
                <br />
                필요 권한: <strong>운영자(manager) 또는 개발자(developer)</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 시스템 상태 조회
  const { data: systemStatus, isLoading, refetch: refetchSystemStatus } = useQuery<SystemStatus>({
    queryKey: ['system-status'],
    queryFn: async () => {
      const response = await fetch('/api/admin/system-status', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('시스템 상태 조회 실패');
      }
      return response.json();
    },
    refetchInterval: 30000, // 30초마다 갱신 (기존 5초에서 변경)
    staleTime: 20000, // 20초간 캐시 유지
    enabled: isAdminUser // 관리자일 때만 조회
  });

  // fetchSystemStatus 함수 정의 (시스템 최적화 후 상태 갱신용)
  const fetchSystemStatus = async () => {
    try {
      await refetchSystemStatus();
    } catch (error) {
      console.error('시스템 상태 갱신 실패:', error);
    }
  };

  // 시스템 디버그 로그 조회
  const { data: debugLogsData, refetch: refetchDebugLogs } = useQuery({
    queryKey: ['debug-logs', currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/debug-logs?page=${currentPage}&limit=10`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('디버그 로그 조회 실패');
      }
      return response.json();
    },
    enabled: isAdminUser,
    refetchInterval: 60000, // 60초마다 자동 새로고침 (기존 5초에서 변경)
    staleTime: 45000, // 45초간 캐시 유지
    refetchIntervalInBackground: false, // 백그라운드 새로고침 비활성화
  });

  // 디버그 로그 내보내기 뮤테이션
  const exportLogsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/export-debug-logs', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('로그 내보내기 실패');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setOperationStatus('success');
      alert(`✅ ${data.message}`);
      refetchDebugLogs(); // 로그 새로고침
    },
    onError: (error: any) => {
      setOperationStatus('error');
      alert(`❌ 로그 내보내기 실패: ${error.message}`);
    }
  });

  // 자동백업 설정 조회
  const { data: currentAutoBackup } = useQuery<AutoBackupConfig>({
    queryKey: ['auto-backup-config'],
    queryFn: async () => {
      const response = await fetch('/api/admin/auto-backup-config', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('자동백업 설정 조회 실패');
      }
      return response.json();
    }
  });

  // 시스템 보안 설정 조회
  const { data: currentSecurityConfig } = useQuery<SecurityConfig>({
    queryKey: ['security-config'],
    queryFn: async () => {
      const response = await fetch('/api/admin/security-config', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('시스템 보안 설정 조회 실패');
      }
      return response.json();
    },
    enabled: isDeveloper // 개발자만 접근 가능
  });

  // 자동백업 설정이 로드되면 상태 업데이트
  useEffect(() => {
    if (currentAutoBackup) {
      setAutoBackupConfig(currentAutoBackup);
    }
  }, [currentAutoBackup]);

  // 시스템 보안 설정이 로드되면 상태 업데이트
  useEffect(() => {
    if (currentSecurityConfig) {
      setSecurityConfig(currentSecurityConfig);
    }
  }, [currentSecurityConfig]);

  // 폴더 선택 공통 함수
  const selectFolder = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/admin/select-folder', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.folderPath) {
        return result.folderPath;
      } else {
        console.warn('폴더 선택 실패:', result.message);
        return null;
      }
    } catch (error) {
      console.error('폴더 선택 API 오류:', error);
      // 기본 경로 제공
      const userInput = prompt('폴더 경로를 직접 입력하세요 (예: C:\\Users\\사용자명\\Desktop):');
      return userInput && userInput.trim() ? userInput.trim() : null;
    }
  };

  // 백업 폴더 선택
  const handleSelectBackupFolder = async () => {
    const selectedPath = await selectFolder();
    if (selectedPath) {
      setBackupConfig({ ...backupConfig, backupPath: selectedPath });
    }
  };

  // 자동백업 폴더 선택
  const handleSelectAutoBackupFolder = async () => {
    const selectedPath = await selectFolder();
    if (selectedPath) {
      setAutoBackupConfig({ ...autoBackupConfig, backupPath: selectedPath });
    }
  };

  // 복구 폴더 선택
  const handleSelectRestoreFolder = async () => {
    const selectedPath = await selectFolder();
    if (selectedPath) {
      setRestoreConfig({ ...restoreConfig, restorePath: selectedPath });
    }
  };

  // 데이터 백업
  const handleBackup = async () => {
    if (!backupConfig.backupPath) {
      alert('백업 폴더를 선택해주세요.');
      return;
    }

    const selectedItems = Object.entries(backupConfig)
      .filter(([key, value]) => key.startsWith('include') && value)
      .map(([key]) => key.replace('include', '').toLowerCase());

    if (selectedItems.length === 0) {
      alert('백업할 항목을 선택해주세요.');
      return;
    }

    setOperationStatus('processing');

    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(backupConfig)
      });

      const result = await response.json();

      if (result.success) {
        setOperationStatus('success');
        alert(`백업이 완료되었습니다. ${result.backupCount}개 파일이 백업되었습니다.`);
      } else {
        setOperationStatus('error');
        alert('백업 실패: ' + result.message);
      }
    } catch (error) {
      setOperationStatus('error');
      console.error('백업 오류:', error);
      alert('백업 중 오류가 발생했습니다.');
    }

    setTimeout(() => setOperationStatus('idle'), 3000);
  };

  // 자동백업 설정 저장
  const handleSaveAutoBackup = async () => {
    if (autoBackupConfig.enabled && !autoBackupConfig.backupPath) {
      alert('자동백업을 활성화하려면 백업 폴더를 선택해주세요.');
      return;
    }

    setOperationStatus('processing');

    try {
      const response = await fetch('/api/admin/auto-backup-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(autoBackupConfig)
      });

      const result = await response.json();

      if (result.success) {
        setOperationStatus('success');
        alert('자동백업 설정이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: ['auto-backup-config'] });
      } else {
        setOperationStatus('error');
        alert('자동백업 설정 저장 실패: ' + result.message);
      }
    } catch (error) {
      setOperationStatus('error');
      console.error('자동백업 설정 오류:', error);
      alert('자동백업 설정 중 오류가 발생했습니다.');
    }

    setTimeout(() => setOperationStatus('idle'), 3000);
  };

  // 시스템 보안 설정 저장
  const handleSaveSecurityConfig = async () => {
    setOperationStatus('processing');

    try {
      const response = await fetch('/api/admin/security-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(securityConfig)
      });

      const result = await response.json();

      if (result.success) {
        setOperationStatus('success');
        alert('시스템 보안 설정이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: ['security-config'] });
      } else {
        setOperationStatus('error');
        alert('시스템 보안 설정 저장 실패: ' + result.message);
      }
    } catch (error) {
      setOperationStatus('error');
      console.error('시스템 보안 설정 오류:', error);
      alert('시스템 보안 설정 중 오류가 발생했습니다.');
    }

    setTimeout(() => setOperationStatus('idle'), 3000);
  };

  // 데이터 복구 (개선된 버전 - 복구 전 자동 백업)
  const handleRestore = async () => {
    if (!restoreConfig.restorePath) {
      alert('복구할 폴더를 선택해주세요.');
      return;
    }

    const selectedItems = Object.entries(restoreConfig)
      .filter(([key, value]) => key.startsWith('include') && value)
      .map(([key]) => key.replace('include', '').toLowerCase());

    if (selectedItems.length === 0) {
      alert('복구할 항목을 선택해주세요.');
      return;
    }

    if (!confirm('복구 전에 현재 데이터를 자동으로 백업한 후 복구를 진행합니다. 계속하시겠습니까?')) {
      return;
    }

    setOperationStatus('processing');

    try {
      const response = await fetch('/api/admin/restore-with-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(restoreConfig)
      });

      const result = await response.json();

      if (result.success) {
        setOperationStatus('success');
        alert(`복구가 완료되었습니다.\n• 기존 데이터 백업: ${result.backupPath}\n• 복구된 파일: ${result.restoredCount}개`);
        queryClient.invalidateQueries();
      } else {
        setOperationStatus('error');
        alert('복구 실패: ' + result.message);
      }
    } catch (error) {
      setOperationStatus('error');
      console.error('복구 오류:', error);
      alert('복구 중 오류가 발생했습니다.');
    }

    setTimeout(() => setOperationStatus('idle'), 3000);
  };

  // 데이터 일괄 삭제
  const handleDelete = async () => {
    console.log('🗑️ 삭제 버튼 클릭됨');
    console.log('📋 현재 deleteConfig:', deleteConfig);
    
    const selectedItems = Object.entries(deleteConfig)
      .filter(([key, value]) => key.startsWith('delete') && value)
      .map(([key]) => key.replace('delete', '').toLowerCase());

    console.log('📝 선택된 항목들:', selectedItems);

    if (selectedItems.length === 0) {
      console.log('❌ 선택된 항목이 없음');
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!confirm('선택한 데이터가 영구적으로 삭제됩니다. 정말 삭제하시겠습니까?')) {
      console.log('❌ 첫 번째 확인에서 취소됨');
      return;
    }

    if (!confirm('정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      console.log('❌ 두 번째 확인에서 취소됨');
      return;
    }

    console.log('✅ 삭제 확인 완료, 요청 시작');
    setOperationStatus('processing');

    try {
      console.log('🚀 DELETE 요청 전송 중...');
      console.log('📤 요청 데이터:', deleteConfig);
      
      const response = await fetch('/api/admin/delete-data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(deleteConfig)
      });

      console.log('📥 응답 상태:', response.status, response.statusText);
      console.log('📥 응답 헤더:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP 오류:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('📥 응답 데이터:', result);

      if (result.success) {
        setOperationStatus('success');
        console.log('✅ 삭제 성공:', result);
        alert(`삭제가 완료되었습니다. ${result.deletedCount}개 파일이 삭제되었습니다.`);
        queryClient.invalidateQueries();
      } else {
        setOperationStatus('error');
        console.error('❌ 삭제 실패:', result.message);
        alert('삭제 실패: ' + result.message);
      }
    } catch (error) {
      setOperationStatus('error');
      console.error('❌ 삭제 오류:', error);
      console.error('❌ 오류 스택:', error.stack);
      alert('삭제 중 오류가 발생했습니다: ' + error.message);
    }

    setTimeout(() => setOperationStatus('idle'), 3000);
  };

  // 액션 타입 한글 변환
  const getActionTypeText = (action: string) => {
    switch (action) {
      case 'login': return '로그인';
      case 'logout': return '로그아웃';
      case 'data_create': return '데이터 생성';
      case 'data_update': return '데이터 수정';
      case 'data_delete': return '데이터 삭제';
      case 'security_violation': return '보안 위반';
      default: return action;
    }
  };

  // 액션 타입 색상
  const getActionTypeColor = (action: string) => {
    switch (action) {
      case 'login': return 'text-green-600';
      case 'logout': return 'text-gray-600';
      case 'data_create': return 'text-blue-600';
      case 'data_update': return 'text-yellow-600';
      case 'data_delete': return 'text-red-600';
      case 'security_violation': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 시스템 최적화 함수
  const handleSystemOptimize = async (optimizeType: 'memory' | 'system' | 'cache' | 'all') => {
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    setOptimizationResult(null);
    
    try {
      const response = await fetch('/api/admin/system-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ optimizeType }),
        credentials: 'include',
      });

      // 응답 상태 확인
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // JSON 파싱 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버에서 올바른 JSON 응답을 받지 못했습니다.');
      }

      const data = await response.json();
      
      if (data.success) {
        setOptimizationResult(data.results);
        toast({
          title: "최적화 완료",
          description: `${getOptimizeTypeLabel(optimizeType)} 최적화가 완료되었습니다. (메모리 ${data.results.memorySaved} 절약)`,
        });
        
        // 시스템 상태 즉시 새로고침
        await fetchSystemStatus();
        
        // 추가로 1초 후에도 한 번 더 새로고침 (메모리 정리 완료 확인)
        setTimeout(async () => {
          await fetchSystemStatus();
        }, 1000);
      } else {
        toast({
          title: "최적화 실패",
          description: data.message || "시스템 최적화에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('시스템 최적화 중 오류:', error);
      toast({
        title: "오류 발생",
        description: "시스템 최적화 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getOptimizeTypeLabel = (type: string) => {
    switch (type) {
      case 'memory': return '메모리';
      case 'system': return '시스템';
      case 'cache': return '캐시';
      case 'all': return '전체';
      default: return type;
    }
  };

  // 새로운 로그 감지 시 알림
  useEffect(() => {
    if (debugLogsData?.pagination?.totalLogs && lastLogCount > 0) {
      const currentLogCount = debugLogsData.pagination.totalLogs;
      if (currentLogCount > lastLogCount) {
        const newLogsCount = currentLogCount - lastLogCount;
        toast({
          title: "새로운 시스템 로그",
          description: `${newLogsCount}개의 새로운 로그가 추가되었습니다.`,
        });
      }
    }
    if (debugLogsData?.pagination?.totalLogs) {
      setLastLogCount(debugLogsData.pagination.totalLogs);
    }
  }, [debugLogsData?.pagination?.totalLogs, lastLogCount, toast]);

  if (isLoading) {
    return <div className="p-6 text-center">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 1. 시스템 상태 & 시스템 보안 설정 - 같은 행에 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 시스템 상태 카드 */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            <CardTitle>시스템 상태</CardTitle>
            {(currentUser?.role === 'developer' || currentUser?.role === 'manager') && (
              <Badge variant="outline" className="text-xs">
                {currentUser?.role === 'developer' ? '개발자+운영자' : '운영자'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {systemStatus ? (
            <>
              {/* 서버 상태 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">서버:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">온라인</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">포트:</span>
                  <span className="font-medium ml-1">{systemStatus.server?.port}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">가동시간:</span>
                  <span className="font-medium ml-1">{systemStatus.server?.uptime}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">데이터베이스:</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      systemStatus.database?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium">
                      {systemStatus.database?.status === 'connected' ? '연결됨' : '오류'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 메모리 정보 */}
              {systemStatus.memory && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-2">메모리 사용량</div>
                  <div className="space-y-3">
                    {/* 시스템 전체 메모리 */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>시스템 RAM:</span>
                        <span>{systemStatus.memory.systemUsed}GB / {systemStatus.memory.systemTotal}GB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            systemStatus.memory.systemUsage > 90 ? 'bg-red-500' : 
                            systemStatus.memory.systemUsage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${systemStatus.memory.systemUsage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span>시스템 사용률:</span>
                        <span className={`font-medium ${
                          systemStatus.memory.systemUsage > 90 ? 'text-red-600' : 
                          systemStatus.memory.systemUsage > 80 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {systemStatus.memory.systemUsage}%
                        </span>
                      </div>
                    </div>
                    
                    {/* TaskFlow 앱 메모리 */}
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>TaskFlow 앱:</span>
                        <span>{systemStatus.memory.rss}MB / {systemStatus.memory.maxMemory}MB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            systemStatus.memory.usage > 85 ? 'bg-red-400' : 
                            systemStatus.memory.usage > 70 ? 'bg-yellow-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${systemStatus.memory.usage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span>앱 사용률:</span>
                        <span className={`font-medium ${
                          systemStatus.memory.usage > 85 ? 'text-red-600' : 
                          systemStatus.memory.usage > 70 ? 'text-yellow-600' : 'text-blue-600'
                        }`}>
                          {systemStatus.memory.usage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 성능 상태 */}
              {systemStatus.performance && (
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">성능 최적화</span>
                    <Badge 
                      variant="outline" 
                      className={
                        systemStatus.performance.optimization === 'good' ? 'text-green-600 border-green-300' :
                        systemStatus.performance.optimization === 'warning' ? 'text-yellow-600 border-yellow-300' :
                        'text-red-600 border-red-300'
                      }
                    >
                      {systemStatus.performance.optimization === 'good' ? '✅ 양호' :
                       systemStatus.performance.optimization === 'warning' ? '⚠️ 주의' : '🚨 위험'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Node.js 정보 */}
              {systemStatus.server?.nodeInfo && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-2">시스템 정보</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Node.js: {systemStatus.server.nodeInfo.version}</div>
                    <div>플랫폼: {systemStatus.server.nodeInfo.platform}</div>
                    <div>아키텍처: {systemStatus.server.nodeInfo.arch}</div>
                    <div>로그: {systemStatus.logs?.count || 0}개</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground">시스템 상태 로딩 중...</div>
          )}
        </CardContent>
      </Card>

        {/* 시스템 보안 설정 카드 - 개발자 전용 */}
        {showSecuritySettings && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                시스템 보안 설정
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded text-[10px]">
                  dev
                </span>
              </CardTitle>
              <CardDescription>
                F12 개발자 도구 제한 및 보안 기능을 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                
                {/* F12 개발자 도구 제한 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="f12-restriction"
                      checked={securityConfig.f12Restriction}
                      onCheckedChange={(checked) => 
                        setSecurityConfig({ ...securityConfig, f12Restriction: checked as boolean })
                      }
                    />
                    <label htmlFor="f12-restriction" className="text-sm font-medium">
                      F12 개발자 도구 제한
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 pl-6">
                    F12, Ctrl+Shift+I, Ctrl+U, Ctrl+Shift+C 키 차단
                  </div>
                </div>

                {/* 우클릭 제한 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="right-click-restriction"
                      checked={securityConfig.rightClickRestriction}
                      onCheckedChange={(checked) => 
                        setSecurityConfig({ ...securityConfig, rightClickRestriction: checked as boolean })
                      }
                    />
                    <label htmlFor="right-click-restriction" className="text-sm font-medium">
                      우클릭 제한
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 pl-6">
                    마우스 우클릭 컨텍스트 메뉴 차단
                  </div>
                </div>

                {/* 개발자 도구 감지 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="devtools-detection"
                      checked={securityConfig.devToolsDetection}
                      onCheckedChange={(checked) => 
                        setSecurityConfig({ ...securityConfig, devToolsDetection: checked as boolean })
                      }
                    />
                    <label htmlFor="devtools-detection" className="text-sm font-medium">
                      개발자 도구 감지
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 pl-6">
                    브라우저 크기 변화로 개발자 도구 열림 감지 (프로덕션만)
                  </div>
                </div>

                {/* 콘솔 경고 메시지 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="console-warning"
                      checked={securityConfig.consoleWarning}
                      onCheckedChange={(checked) => 
                        setSecurityConfig({ ...securityConfig, consoleWarning: checked as boolean })
                      }
                    />
                    <label htmlFor="console-warning" className="text-sm font-medium">
                      콘솔 경고 메시지
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 pl-6">
                    개발자 콘솔에 보안 경고 메시지 표시
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    💡 <strong>참고:</strong> 개발자 계정은 모든 보안 제한이 자동으로 비활성화됩니다.
                  </div>
                  <Button 
                    onClick={handleSaveSecurityConfig} 
                    disabled={operationStatus === 'processing'}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    {operationStatus === 'processing' ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        저장중
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        보안 설정 저장
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. 시스템 디버그 - 운영자, 개발자 접근 */}
      {isAdminUser && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              시스템 디버그
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                {isDeveloper ? '개발자 전용' : '운영자 권한'}
              </span>
            </CardTitle>
            <CardDescription>
              {isDeveloper 
                ? '모든 계정의 로그인/로그아웃, 업무등록/수정/삭제, 보안 위반 내용을 실시간으로 모니터링합니다.'
                : '운영자 및 일반 사용자의 활동을 모니터링합니다. (개발자 활동은 표시되지 않습니다.)'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {debugLogsData && debugLogsData.logs && Array.isArray(debugLogsData.logs) && debugLogsData.logs.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                {debugLogsData.logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-gray-50 text-sm">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* 시간 */}
                      <span className="text-xs text-gray-500 w-16 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                      
                      {/* 사용자 */}
                      <span className="text-xs font-medium w-16 flex-shrink-0 truncate">
                        {log.username}
                      </span>
                      
                      {/* 액션 타입 */}
                      <span className={`text-xs px-2 py-1 rounded w-20 text-center flex-shrink-0 ${getActionTypeColor(log.action)} bg-opacity-10`}>
                        {getActionTypeText(log.action)}
                      </span>
                      
                      {/* 보안 위반 아이콘 */}
                      {log.action === 'security_violation' && (
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      
                      {/* 상세 내용 */}
                      <span className="text-gray-600 flex-1 truncate">
                        {log.details}
                      </span>
                      
                      {/* IP 주소와 지역 정보 */}
                      {(log.ipAddress || log.location) && (
                        <div className="text-xs text-gray-400 w-32 flex-shrink-0 text-right">
                          {log.ipAddress && (
                            <div className="truncate" title={log.ipAddress}>
                              🌐 {log.ipAddress}
                            </div>
                          )}
                          {log.location && (
                            <div className="truncate text-gray-500" title={log.location}>
                              📍 {log.location}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>아직 로그가 없습니다.</p>
                {debugLogsData && (
                  <p className="text-xs mt-2 text-gray-400">
                    디버그 정보: {JSON.stringify(debugLogsData, null, 2)}
                  </p>
                )}
              </div>
            )}
            
            {/* 페이지네이션 및 컨트롤 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* 페이지네이션 */}
                {debugLogsData && debugLogsData.pagination && (
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!debugLogsData.pagination.hasPrev || !isAdminUser}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm text-gray-600 min-w-0">
                      {debugLogsData.pagination.currentPage} / {debugLogsData.pagination.totalPages}
                      <span className="text-xs text-gray-400 ml-2">
                        (총 {debugLogsData.pagination.totalLogs}개)
                      </span>
                    </span>
                    
                    <Button 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!debugLogsData.pagination.hasNext || !isAdminUser}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* 파일 내보내기 */}
                <Button 
                  onClick={() => exportLogsMutation.mutate()}
                  disabled={exportLogsMutation.isPending}
                  variant="outline"
                  size="sm"
                >
                  {exportLogsMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  <span className="ml-1">내보내기</span>
                </Button>
                
                {/* 새로고침 */}
                <Button 
                  onClick={() => refetchDebugLogs()}
                  variant="outline"
                  size="sm"
                  disabled={!isAdminUser}
                >
                  {isAdminUser ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* 안내 메시지 */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                최근 100개의 로그를 페이지별로 표시합니다. 100개 초과시 자동으로 파일에 저장됩니다.
                보안 위반 발생 시 실시간 알림이 표시됩니다.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* 3. 데이터 관리 카드 섹션 - 컴팩트 레이아웃 */}
      {showDeveloperFeatures && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* 데이터 자동백업 */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                자동백업
                <span className="text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded text-[10px]">dev</span>
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-backup-enabled"
                checked={autoBackupConfig.enabled}
                onCheckedChange={(checked) => 
                  setAutoBackupConfig({ ...autoBackupConfig, enabled: checked as boolean })
                }
              />
              <label htmlFor="auto-backup-enabled" className="text-sm font-medium">
                자동백업 활성화
              </label>
            </div>

            {autoBackupConfig.enabled && (
              <>
                                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Select
                        value={autoBackupConfig.interval}
                        onValueChange={(value: '5min' | '10min' | '30min' | '1hour') => 
                          setAutoBackupConfig({ ...autoBackupConfig, interval: value })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="주기" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30min">30분</SelectItem>
                          <SelectItem value="1hour">1시간</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleSelectAutoBackupFolder} variant="outline" size="sm" className="h-7 text-xs">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      폴더
                    </Button>
                  </div>
                  {autoBackupConfig.backupPath && (
                    <div className="text-xs text-gray-500 truncate">
                      📁 {autoBackupConfig.backupPath}
                    </div>
                  )}

                <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                  💾 자동백업: 모든 데이터 포함
                </div>
              </>
            )}

            <Button 
              onClick={handleSaveAutoBackup} 
              disabled={operationStatus === 'processing'}
              className="w-full"
              size="sm"
            >
              {operationStatus === 'processing' ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  저장중
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  설정저장
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* 데이터 전체 백업 */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1 text-sm">
              <Download className="h-4 w-4" />
              전체백업
              <span className="text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded text-[10px]">dev</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button onClick={handleSelectBackupFolder} variant="outline" size="sm" className="w-full h-7 text-xs">
                <FolderOpen className="h-3 w-3 mr-1" />
                저장 폴더 선택
              </Button>
              {backupConfig.backupPath && (
                <div className="text-xs text-gray-500 truncate mt-1">
                  📁 {backupConfig.backupPath}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs text-gray-500">
                백업 대상: DB, 스토리지, 설정, 계정정보
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="backup-all"
                  checked={backupConfig.includeTaskflowDb && backupConfig.includeAppDb && backupConfig.includeConfig && backupConfig.includeUsers}
                  onCheckedChange={(checked) => 
                    setBackupConfig({ 
                      ...backupConfig, 
                      includeTaskflowDb: checked as boolean,
                      includeAppDb: checked as boolean,
                      includeConfig: checked as boolean,
                      includeUsers: checked as boolean
                    })
                  }
                />
                <label htmlFor="backup-all" className="text-sm">
                  전체 선택
                </label>
              </div>
            </div>

            <Button 
              onClick={handleBackup} 
              disabled={operationStatus === 'processing'}
              className="w-full"
              size="sm"
            >
              {operationStatus === 'processing' ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  백업중
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 mr-1" />
                  백업실행
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* 데이터 복구 */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1 text-sm">
              <Upload className="h-4 w-4" />
              데이터복구
              <span className="text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded text-[10px]">dev</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button onClick={handleSelectRestoreFolder} variant="outline" size="sm" className="w-full h-7 text-xs">
                <FolderOpen className="h-3 w-3 mr-1" />
                복구 폴더 선택
              </Button>
              {restoreConfig.restorePath && (
                <div className="text-xs text-gray-500 truncate mt-1">
                  📁 {restoreConfig.restorePath}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs text-gray-500">
                복구 대상: DB, 스토리지, 설정, 계정정보
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="restore-all"
                  checked={restoreConfig.includeTaskflowDb && restoreConfig.includeAppDb && restoreConfig.includeConfig && restoreConfig.includeUsers}
                  onCheckedChange={(checked) => 
                    setRestoreConfig({ 
                      ...restoreConfig, 
                      includeTaskflowDb: checked as boolean,
                      includeAppDb: checked as boolean,
                      includeConfig: checked as boolean,
                      includeUsers: checked as boolean
                    })
                  }
                />
                <label htmlFor="restore-all" className="text-sm">
                  전체 선택
                </label>
              </div>
            </div>

            <Button 
              onClick={handleRestore} 
              disabled={operationStatus === 'processing'}
              className="w-full"
              variant="secondary"
              size="sm"
            >
              {operationStatus === 'processing' ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  복구중
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  복구실행
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* 데이터 일괄삭제 */}
        <Card className="glass-card border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1 text-sm text-red-600">
              <Trash2 className="h-4 w-4" />
              일괄삭제
              <span className="text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded text-[10px]">dev</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs text-gray-500">
                ⚠️ 주의: 삭제된 데이터는 복구할 수 없습니다
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delete-all"
                  checked={deleteConfig.deleteTaskflowDb && deleteConfig.deleteAppDb && deleteConfig.deleteConfig && deleteConfig.deleteUsers}
                  onCheckedChange={(checked) => 
                    setDeleteConfig({ 
                      ...deleteConfig, 
                      deleteTaskflowDb: checked as boolean,
                      deleteAppDb: checked as boolean,
                      deleteConfig: checked as boolean,
                      deleteUsers: checked as boolean
                    })
                  }
                />
                <label htmlFor="delete-all" className="text-sm">
                  전체 선택
                </label>
              </div>
            </div>

            <Button 
              onClick={handleDelete} 
              disabled={operationStatus === 'processing'}
              className="w-full"
              variant="destructive"
              size="sm"
            >
              {operationStatus === 'processing' ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  삭제중
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3 mr-1" />
                  데이터삭제
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* 시스템 최적화 */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1 text-sm text-green-600">
              <Zap className="h-4 w-4" />
              시스템최적화
              <span className="text-xs bg-green-100 text-green-600 px-1 py-0.5 rounded text-[10px]">admin</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* 최적화 결과 표시 */}
            {optimizationResult && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                <div className="font-medium text-green-800">
                  ✅ {getOptimizeTypeLabel(optimizationResult.optimizeType)} 완료
                </div>
                <div className="text-green-700 text-[10px]">
                  절약: {optimizationResult.memorySaved}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1">
              {/* 메모리 최적화 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSystemOptimize('memory')}
                disabled={isOptimizing || !isAdminUser}
                className="text-xs h-7"
              >
                <Brain className="h-3 w-3 mr-1" />
                메모리
              </Button>

              {/* 시스템 최적화 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSystemOptimize('system')}
                disabled={isOptimizing || !isAdminUser}
                className="text-xs h-7"
              >
                <Settings className="h-3 w-3 mr-1" />
                시스템
              </Button>

              {/* 캐시 정리 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSystemOptimize('cache')}
                disabled={isOptimizing || !isAdminUser}
                className="text-xs h-7"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                캐시
              </Button>

              {/* 전체 최적화 */}
              <Button
                variant="default"
                size="sm"
                onClick={() => handleSystemOptimize('all')}
                disabled={isOptimizing || !isAdminUser}
                className="text-xs h-7 bg-green-600 hover:bg-green-700"
              >
                <Zap className="h-3 w-3 mr-1" />
                전체
              </Button>
            </div>
          </CardContent>
        </Card>
        
        </div>
      )}



      {/* 상태 메시지 */}
      {operationStatus === 'success' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            작업이 성공적으로 완료되었습니다.
          </AlertDescription>
        </Alert>
      )}

      {operationStatus === 'error' && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            작업 중 오류가 발생했습니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 