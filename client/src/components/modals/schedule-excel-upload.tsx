import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Calendar,
  Clock,
  Repeat,
  MapPin,
  Tag,
  XCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelUploadResult {
  success: boolean;
  message: string;
  data?: any[];
  errors?: string[];
}

interface ScheduleExcelUploadProps {
  onUploadComplete?: (result: ExcelUploadResult) => void;
  className?: string;
}

interface ExcelScheduleData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  isRecurring: boolean;
  recurringType: string;
  recurringInterval: number;
  recurringDays: string;
  recurringEndDate: string;
  recurringCount: number;
  location: string;
  reminder: number;
  color: string;
  category: string;
}

export function ScheduleExcelUpload({ onUploadComplete, className }: ScheduleExcelUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<ExcelUploadResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // 엑셀 템플릿 데이터 생성
  const generateExcelTemplate = () => {
    const templateData = [
      // 헤더 행
      [
        '제목*', '설명', '시작날짜*', '종료날짜', '시작시간', '종료시간', '종일여부',
        '반복여부', '반복유형', '반복간격', '반복요일', '반복종료날짜', '반복횟수',
        '장소', '알림(분)', '색상', '업무구분'
      ],
      // 설명 행
      [
        '일정 제목 (필수)', '일정 상세 설명', 'YYYY-MM-DD (필수)', 'YYYY-MM-DD', 'HH:MM', 'HH:MM', 'TRUE/FALSE',
        'TRUE/FALSE', 'daily/weekly/monthly/yearly/weekdays/custom', '숫자 (예: 2)', 'monday,tuesday,wednesday,thursday,friday,saturday,sunday', 'YYYY-MM-DD', '숫자',
        '장소명', '분 단위 숫자', '#RRGGBB 형식', '업무구분명'
      ],
      // 예시 데이터 1: 매일 반복되는 운동
      [
        '매일 운동', '건강을 위한 일일 운동', '2025-01-01', '', '07:00', '08:00', 'FALSE',
        'TRUE', 'daily', '1', '', '2025-12-31', '', '헬스장', '30', '#22c55e', '건강'
      ],
      // 예시 데이터 2: 주간 회의
      [
        '주간 팀 회의', '팀 진행사항 점검 회의', '2025-01-06', '', '14:00', '15:00', 'FALSE',
        'TRUE', 'weekly', '1', 'monday', '2025-12-31', '', '회의실 A', '15', '#3b82f6', '업무'
      ],
      // 예시 데이터 3: 월간 보고서
      [
        '월간 보고서 작성', '월말 업무 성과 보고서 작성', '2025-01-31', '', '09:00', '11:00', 'FALSE',
        'TRUE', 'monthly', '1', '', '2025-12-31', '', '사무실', '60', '#f59e0b', '보고서'
      ],
      // 예시 데이터 4: 평일 출퇴근
      [
        '출근', '평일 업무 시작', '2025-01-01', '', '09:00', '', 'FALSE',
        'TRUE', 'weekdays', '1', '', '2025-12-31', '', '사무실', '0', '#6366f1', '업무'
      ],
      // 예시 데이터 5: 연간 휴가
      [
        '연차 휴가', '개인 연차 휴가', '2025-08-15', '2025-08-16', '', '', 'TRUE',
        'FALSE', '', '', '', '', '', '집', '0', '#ef4444', '휴가'
      ],
      // 예시 데이터 6: 커스텀 반복 (화목금)
      [
        '영어 학습', '비즈니스 영어 학습', '2025-01-01', '', '19:00', '20:00', 'FALSE',
        'TRUE', 'custom', '1', 'tuesday,thursday,friday', '2025-06-30', '', '온라인', '30', '#8b5cf6', '학습'
      ]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // 컬럼 너비 설정
    const colWidths = [
      { wch: 20 }, // 제목
      { wch: 30 }, // 설명
      { wch: 12 }, // 시작날짜
      { wch: 12 }, // 종료날짜
      { wch: 10 }, // 시작시간
      { wch: 10 }, // 종료시간
      { wch: 10 }, // 종일여부
      { wch: 10 }, // 반복여부
      { wch: 15 }, // 반복유형
      { wch: 10 }, // 반복간격
      { wch: 25 }, // 반복요일
      { wch: 15 }, // 반복종료날짜
      { wch: 10 }, // 반복횟수
      { wch: 15 }, // 장소
      { wch: 10 }, // 알림
      { wch: 10 }, // 색상
      { wch: 15 }  // 업무구분
    ];
    ws['!cols'] = colWidths;

    // 헤더 스타일 설정
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F46E5" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    XLSX.utils.book_append_sheet(wb, ws, '반복일정_템플릿');

    // 사용법 시트 추가
    const instructionData = [
      ['반복일정 엑셀 템플릿 사용법'],
      [''],
      ['1. 기본 정보'],
      ['- 제목*: 일정의 제목 (필수 항목)'],
      ['- 설명: 일정의 상세 설명'],
      ['- 시작날짜*: YYYY-MM-DD 형식 (예: 2025-01-01)'],
      ['- 종료날짜: YYYY-MM-DD 형식 (선택사항)'],
      ['- 시작시간: HH:MM 형식 (예: 09:00)'],
      ['- 종료시간: HH:MM 형식 (예: 17:00)'],
      ['- 종일여부: TRUE 또는 FALSE'],
      [''],
      ['2. 반복 설정'],
      ['- 반복여부: TRUE 또는 FALSE'],
      ['- 반복유형: daily(매일), weekly(매주), monthly(매월), yearly(매년), weekdays(평일), custom(사용자정의)'],
      ['- 반복간격: 숫자 (예: 2주마다 = 2)'],
      ['- 반복요일: monday,tuesday,wednesday,thursday,friday,saturday,sunday 조합'],
      ['- 반복종료날짜: YYYY-MM-DD 형식'],
      ['- 반복횟수: 숫자 (반복종료날짜 대신 사용 가능)'],
      [''],
      ['3. 기타 설정'],
      ['- 장소: 일정 장소'],
      ['- 알림(분): 알림 시간 (분 단위, 예: 30)'],
      ['- 색상: #RRGGBB 형식 (예: #3b82f6)'],
      ['- 업무구분: 일정 분류'],
      [''],
      ['4. 반복유형별 설정 방법'],
      [''],
      ['📅 daily (매일)'],
      ['- 반복간격: 1 (매일), 2 (이틀마다), 3 (3일마다)'],
      ['- 반복요일: 비워둠'],
      [''],
      ['📅 weekly (매주)'],
      ['- 반복간격: 1 (매주), 2 (격주)'],
      ['- 반복요일: monday,wednesday,friday (월,수,금)'],
      [''],
      ['📅 monthly (매월)'],
      ['- 반복간격: 1 (매월), 3 (3개월마다)'],
      ['- 반복요일: 비워둠'],
      [''],
      ['📅 yearly (매년)'],
      ['- 반복간격: 1 (매년)'],
      ['- 반복요일: 비워둠'],
      [''],
      ['📅 weekdays (평일)'],
      ['- 반복간격: 1'],
      ['- 반복요일: 자동으로 월~금 설정됨'],
      [''],
      ['📅 custom (사용자정의)'],
      ['- 반복간격: 1'],
      ['- 반복요일: 원하는 요일 조합 (예: tuesday,thursday)'],
      [''],
      ['5. 색상 코드 예시'],
      ['- 빨강: #ef4444'],
      ['- 파랑: #3b82f6'],
      ['- 초록: #22c55e'],
      ['- 노랑: #f59e0b'],
      ['- 보라: #8b5cf6'],
      ['- 인디고: #6366f1'],
      [''],
      ['6. 주의사항'],
      ['- 필수 항목(*) 반드시 입력'],
      ['- 날짜 형식 준수 (YYYY-MM-DD)'],
      ['- 시간 형식 준수 (HH:MM)'],
      ['- 반복설정시 반복유형 정확히 입력'],
      ['- 반복요일은 영어 소문자로 입력'],
      ['- 색상은 # 포함한 헥스 코드로 입력']
    ];

    const instructionWs = XLSX.utils.aoa_to_sheet(instructionData);
    instructionWs['!cols'] = [{ wch: 50 }];
    XLSX.utils.book_append_sheet(wb, instructionWs, '사용법');

    return wb;
  };

  // 템플릿 다운로드
  const downloadTemplate = () => {
    const wb = generateExcelTemplate();
    XLSX.writeFile(wb, '반복일정_업로드_템플릿.xlsx');
  };

  // 파일 선택 핸들러
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  // 드래그앤드랍 이벤트 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0];
      
      // 파일 확장자 검증
      const allowedExtensions = ['.xlsx', '.xls'];
      const fileExtension = droppedFile.name.toLowerCase().substring(droppedFile.name.lastIndexOf('.'));
      
      if (allowedExtensions.includes(fileExtension)) {
        setFile(droppedFile);
        setResult(null);
      } else {
        alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      }
    }
  };

  // 파일 취소 함수 추가
  const handleFileCancel = () => {
    setFile(null);
    setResult(null);
    setUploadProgress(0);
    // 파일 입력 초기화
    const fileInput = document.getElementById('modal-schedule-excel-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // 엑셀 데이터 검증
  const validateExcelData = (data: any[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 3; // 헤더와 설명 행 제외
      
      // 필수 필드 검증
      if (!row['제목*']) {
        errors.push(`행 ${rowNum}: 제목은 필수 항목입니다.`);
      }
      
      if (!row['시작날짜*']) {
        errors.push(`행 ${rowNum}: 시작날짜는 필수 항목입니다.`);
      } else {
        // 날짜 형식 검증
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row['시작날짜*'])) {
          errors.push(`행 ${rowNum}: 시작날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)`);
        }
      }
      
      // 시간 형식 검증
      if (row['시작시간']) {
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(row['시작시간'])) {
          errors.push(`행 ${rowNum}: 시작시간 형식이 올바르지 않습니다. (HH:MM)`);
        }
      }
      
      if (row['종료시간']) {
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(row['종료시간'])) {
          errors.push(`행 ${rowNum}: 종료시간 형식이 올바르지 않습니다. (HH:MM)`);
        }
      }
      
      // 반복 설정 검증
      if (row['반복여부'] === 'TRUE') {
        const validTypes = ['daily', 'weekly', 'monthly', 'yearly', 'weekdays', 'custom'];
        if (!validTypes.includes(row['반복유형'])) {
          errors.push(`행 ${rowNum}: 반복유형이 올바르지 않습니다. (${validTypes.join(', ')})`);
        }
        
        if (row['반복간격'] && isNaN(Number(row['반복간격']))) {
          errors.push(`행 ${rowNum}: 반복간격은 숫자여야 합니다.`);
        }
      }
      
      // 색상 형식 검증
      if (row['색상']) {
        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!colorRegex.test(row['색상'])) {
          errors.push(`행 ${rowNum}: 색상 형식이 올바르지 않습니다. (#RRGGBB)`);
        }
      }
    });
    
    return { valid: errors.length === 0, errors };
  };

  // 엑셀 데이터를 스케줄 형식으로 변환
  const convertExcelToSchedule = (excelData: any): ExcelScheduleData => {
    return {
      title: excelData['제목*'] || '',
      description: excelData['설명'] || '',
      startDate: excelData['시작날짜*'] || '',
      endDate: excelData['종료날짜'] || '',
      startTime: excelData['시작시간'] || '',
      endTime: excelData['종료시간'] || '',
      allDay: excelData['종일여부'] === 'TRUE',
      isRecurring: excelData['반복여부'] === 'TRUE',
      recurringType: excelData['반복유형'] || '',
      recurringInterval: Number(excelData['반복간격']) || 1,
      recurringDays: excelData['반복요일'] || '',
      recurringEndDate: excelData['반복종료날짜'] || '',
      recurringCount: Number(excelData['반복횟수']) || 0,
      location: excelData['장소'] || '',
      reminder: Number(excelData['알림(분)']) || 0,
      color: excelData['색상'] || '#3b82f6',
      category: excelData['업무구분'] || '기타'
    };
  };

  // 파일 업로드 및 처리
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 파일 읽기
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      setUploadProgress(25);

      // 헤더 제외하고 데이터 추출 (첫 2행은 헤더와 설명)
      const dataRows = jsonData.slice(2).filter((row: any) => row.length > 0 && row[0]);
      const headers = jsonData[0] as string[];
      
      // 객체 형태로 변환
      const excelData = dataRows.map((row: any) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      setUploadProgress(50);

      // 데이터 검증
      const validation = validateExcelData(excelData);
      if (!validation.valid) {
        setResult({
          success: false,
          message: '데이터 검증 실패',
          errors: validation.errors
        });
        setUploading(false);
        return;
      }

      setUploadProgress(75);

      // 스케줄 데이터로 변환
      const scheduleData = excelData.map(convertExcelToSchedule);

      // 서버로 데이터 전송
      const response = await fetch('/api/schedules/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedules: scheduleData }),
      });

      const result = await response.json();

      setUploadProgress(100);

      if (result.success) {
        setResult({
          success: true,
          message: `${scheduleData.length}개의 일정이 성공적으로 등록되었습니다.`,
          data: scheduleData
        });
        onUploadComplete?.(result);
      } else {
        setResult({
          success: false,
          message: result.message || '업로드 실패',
          errors: result.errors || []
        });
      }

    } catch (error) {
      console.error('Excel upload error:', error);
      setResult({
        success: false,
        message: '파일 처리 중 오류가 발생했습니다.',
        errors: [error instanceof Error ? error.message : '알 수 없는 오류']
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 템플릿 다운로드 섹션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            <CardTitle>1단계: 엑셀 템플릿 다운로드</CardTitle>
          </div>
          <CardDescription>
            반복일정 등록을 위한 엑셀 템플릿을 다운로드하세요. 
            템플릿에는 예시 데이터와 상세한 사용법이 포함되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={downloadTemplate} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              템플릿 다운로드
            </Button>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                기본정보
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                반복설정
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                시간설정
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                위치/알림
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                업무구분
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* 파일 업로드 섹션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-600" />
            <CardTitle>2단계: 작성된 엑셀 파일 업로드</CardTitle>
          </div>
          <CardDescription>
            작성한 엑셀 파일을 선택하고 업로드하세요. 
            데이터 검증 후 반복일정이 자동으로 등록됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modal-schedule-excel-file">엑셀 파일 선택</Label>
            
            {/* 드래그앤드랍 영역 */}
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
                ${isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
                ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && document.getElementById('modal-schedule-excel-file')?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className={`h-8 w-8 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className="text-sm">
                  <span className="font-medium text-gray-900">
                    {isDragOver ? '파일을 여기에 놓으세요' : '파일을 드래그하거나 클릭하여 선택'}
                  </span>
                  <p className="text-gray-500 mt-1">
                    .xlsx, .xls 파일만 지원됩니다
                  </p>
                </div>
              </div>
              
              {/* 숨겨진 파일 입력 */}
              <Input
                id="modal-schedule-excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800 flex-1">{file.name}</span>
              <Badge variant="secondary">
                {(file.size / 1024).toFixed(1)} KB
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFileCancel}
                disabled={uploading}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                title="파일 취소"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>처리 중...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          <Button 
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? '업로드 중...' : '업로드 및 등록'}
          </Button>
        </CardContent>
      </Card>

      {/* 결과 표시 */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <CardTitle>
                {result.success ? '업로드 성공' : '업로드 실패'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-red-600">오류 목록:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.success && result.data && (
              <div className="mt-4">
                <h4 className="font-medium text-green-600 mb-2">등록된 일정:</h4>
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {result.data.map((schedule: ExcelScheduleData, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                      <Badge 
                        className="shrink-0" 
                        style={{ backgroundColor: schedule.color, color: 'white' }}
                      >
                        {schedule.category}
                      </Badge>
                      <span className="font-medium">{schedule.title}</span>
                      {schedule.isRecurring && (
                        <Badge variant="outline" className="shrink-0">
                          <Repeat className="h-3 w-3 mr-1" />
                          {schedule.recurringType}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 