import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  Repeat, 
  MapPin, 
  Tag, 
  Info,
  CheckCircle,
  Loader2,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DailyTaskWithDetails } from '../../../../../shared/schema';

interface TaskToScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTasks: DailyTaskWithDetails[];
  onSuccess?: () => void;
}

// 새 일정 추가와 동일한 반복 설정 구조 사용
const recurringTypes = [
  { value: "daily", label: "매일" },
  { value: "weekly", label: "매주" },
  { value: "monthly", label: "매월" },
  { value: "yearly", label: "매년" },
  { value: "weekdays", label: "평일만" },
  { value: "custom", label: "사용자 정의" }
];

const weekDays = [
  { value: "monday", label: "월", short: "월" },
  { value: "tuesday", label: "화", short: "화" },
  { value: "wednesday", label: "수", short: "수" },
  { value: "thursday", label: "목", short: "목" },
  { value: "friday", label: "금", short: "금" },
  { value: "saturday", label: "토", short: "토", style: "text-blue-600 font-bold" },
  { value: "sunday", label: "일", short: "일", style: "text-red-600 font-bold" }
];

interface ScheduleConversionData {
  startDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  isRecurring: boolean;
  recurringType: string;
  recurringInterval: number;
  recurringDays: string[];
  recurringEndDate: string;
  recurringCount: number | undefined;
  isIndefinite: boolean; // 무기한 옵션 추가
  location: string;
  reminder: number;
  color: string;
  category: string;
}

export function TaskToScheduleModal({ 
  isOpen, 
  onClose, 
  selectedTasks, 
  onSuccess 
}: TaskToScheduleModalProps) {
  const { toast } = useToast();
  const [converting, setConverting] = useState(false);
  const [conversionData, setConversionData] = useState<ScheduleConversionData>({
    startDate: '', // 기본값 제거 - 사용자가 직접 입력하도록
    startTime: '09:00',
    endTime: '17:00',
    allDay: false,
    isRecurring: true,
    recurringType: 'weekly',
    recurringInterval: 1,
    recurringDays: [],
    recurringEndDate: '',
    recurringCount: undefined,
    isIndefinite: true, // 기본값을 무기한으로 설정
    location: '',
    reminder: 15, // 새 일정 추가와 동일하게 15분으로 변경
    color: '#3b82f6',
    category: '업무'
  });

  const handleInputChange = (field: keyof ScheduleConversionData, value: any) => {
    setConversionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRecurringDayToggle = (day: string) => {
    setConversionData(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter(d => d !== day)
        : [...prev.recurringDays, day]
    }));
  };

  const handleConvert = async () => {
    if (selectedTasks.length === 0) {
      toast({
        title: "오류",
        description: "변환할 업무를 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setConverting(true);
    try {
      const schedules = selectedTasks.map(task => ({
        title: task.title,
        description: task.description || '',
        startDate: conversionData.startDate,
        endDate: '',
        startTime: conversionData.allDay ? null : conversionData.startTime,
        endTime: conversionData.allDay ? null : conversionData.endTime,
        allDay: conversionData.allDay,
        isRecurring: conversionData.isRecurring,
        recurringType: conversionData.isRecurring ? conversionData.recurringType : '',
        recurringInterval: conversionData.isRecurring ? conversionData.recurringInterval : 1,
        recurringDays: conversionData.isRecurring && conversionData.recurringDays.length > 0 ? JSON.stringify(conversionData.recurringDays) : null,
        recurringEndDate: conversionData.isRecurring && !conversionData.isIndefinite ? conversionData.recurringEndDate : null,
        recurringCount: conversionData.isRecurring && !conversionData.isIndefinite ? conversionData.recurringCount : null,
        location: conversionData.location,
        reminder: conversionData.reminder,
        color: conversionData.color,
        category: conversionData.category
      }));

      const response = await fetch('/api/schedules/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ schedules }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ 변환 완료",
          description: `${selectedTasks.length}개의 업무가 반복일정으로 변환되었습니다.`,
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: "변환 실패",
          description: result.message || '변환 중 오류가 발생했습니다.',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('업무 변환 오류:', error);
      toast({
        title: "변환 실패",
        description: "변환 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            새일정추가
          </DialogTitle>
          <DialogDescription>
            선택한 {selectedTasks.length}개의 업무를 반복일정으로 변환합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 선택된 업무 미리보기 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">선택된 업무</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedTasks.map((task, index) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Badge variant="outline" className="text-xs">
                      {index + 1}
                    </Badge>
                    <span className="text-sm">{task.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 기본 일정 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                기본 일정 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">시작 날짜</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={conversionData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allDay"
                    checked={conversionData.allDay}
                    onCheckedChange={(checked) => handleInputChange('allDay', checked)}
                  />
                  <Label htmlFor="allDay">종일</Label>
                </div>
              </div>

              {!conversionData.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">시작 시간</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={conversionData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">종료 시간</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={conversionData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 반복 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                반복 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRecurring"
                  checked={conversionData.isRecurring}
                  onCheckedChange={(checked) => handleInputChange('isRecurring', checked)}
                />
                <Label htmlFor="isRecurring">반복 일정</Label>
              </div>

              {conversionData.isRecurring && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  {/* 반복 날짜 규정 안내 */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>📅 반복 날짜 규정:</strong><br/>
                      • <strong>매일/주간</strong>: 선택한 요일에 따라<br/>
                      • <strong>매월</strong>: 시작일 기준 (예: 15일 시작 → 매월 15일)<br/>
                      • <strong>매년</strong>: 시작 월/일 기준 (예: 6/15 시작 → 매년 6월 15일)
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>반복 유형</Label>
                      <Select
                        value={conversionData.recurringType}
                        onValueChange={(value) => handleInputChange('recurringType', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {recurringTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>
                        반복 간격 
                        <span className="text-xs text-gray-500 ml-2">
                          (몇 번째마다 반복할지)
                        </span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={conversionData.recurringInterval}
                        onChange={(e) => handleInputChange('recurringInterval', parseInt(e.target.value) || 1)}
                        className="mt-1"
                        placeholder="1"
                      />
                      <div className="text-xs text-gray-600 mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                        <div className="font-medium mb-1">📍 반복간격 예시:</div>
                        <div className="space-y-1">
                          <div><strong>매일:</strong> 1=매일, 2=이틀마다, 3=사흘마다</div>
                          <div><strong>매주:</strong> 1=매주, 2=격주(2주마다), 3=3주마다</div>
                          <div><strong>매월:</strong> 1=매월, 2=2개월마다, 3=분기별(3개월마다)</div>
                          <div><strong>매년:</strong> 1=매년, 2=2년마다, 3=3년마다</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(conversionData.recurringType === "weekly" || conversionData.recurringType === "custom") && (
                    <div>
                      <Label>반복 요일</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {weekDays.map(day => (
                          <Badge
                            key={day.value}
                            variant={conversionData.recurringDays.includes(day.value) ? "default" : "outline"}
                            className={`cursor-pointer ${day.style || ''}`}
                            onClick={() => handleRecurringDayToggle(day.value)}
                          >
                            {day.short}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 무기한 옵션 추가 */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isIndefinite"
                        checked={conversionData.isIndefinite}
                        onCheckedChange={(checked) => handleInputChange('isIndefinite', checked)}
                      />
                      <Label htmlFor="isIndefinite" className="text-sm font-medium">
                        무기한 반복 (종료일 없음)
                      </Label>
                    </div>

                    {!conversionData.isIndefinite && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>반복 종료 날짜</Label>
                          <Input
                            type="date"
                            value={conversionData.recurringEndDate}
                            onChange={(e) => handleInputChange('recurringEndDate', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>반복 횟수</Label>
                          <Input
                            type="number"
                            min="1"
                            value={conversionData.recurringCount || ""}
                            onChange={(e) => handleInputChange('recurringCount', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="제한 없음"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}

                    {conversionData.isIndefinite && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          무기한으로 설정하면 반복일정이 계속해서 생성됩니다.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 추가 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                추가 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="location" className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  장소
                </Label>
                <Input
                  id="location"
                  value={conversionData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="장소를 입력하세요"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>업무구분</Label>
                  <Select
                    value={conversionData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="회의">회의</SelectItem>
                      <SelectItem value="업무">업무</SelectItem>
                      <SelectItem value="개인">개인</SelectItem>
                      <SelectItem value="프로젝트">프로젝트</SelectItem>
                      <SelectItem value="휴가">휴가</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>색상</Label>
                  <Select
                    value={conversionData.color}
                    onValueChange={(value) => handleInputChange('color', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="#3b82f6">🔵 파랑</SelectItem>
                      <SelectItem value="#ef4444">🔴 빨강</SelectItem>
                      <SelectItem value="#10b981">🟢 초록</SelectItem>
                      <SelectItem value="#f59e0b">🟡 노랑</SelectItem>
                      <SelectItem value="#8b5cf6">🟣 보라</SelectItem>
                      <SelectItem value="#ec4899">🩷 핑크</SelectItem>
                      <SelectItem value="#06b6d4">🔷 시안</SelectItem>
                      <SelectItem value="#84cc16">🟢 연두</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="reminder">알림 (분)</Label>
                <Input
                  id="reminder"
                  type="number"
                  min="0"
                  value={conversionData.reminder}
                  onChange={(e) => handleInputChange('reminder', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              💡 변환된 반복일정은 기존 업무와 별도로 관리됩니다. 
              원본 업무는 삭제되지 않습니다.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={converting}>
            취소
          </Button>
          <Button onClick={handleConvert} disabled={converting || selectedTasks.length === 0}>
            {converting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                변환 중...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                반복일정으로 변환
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 