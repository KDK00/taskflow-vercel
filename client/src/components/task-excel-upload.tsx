import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  User,
  Tag,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
  XCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

interface ExcelUploadResult {
  success: boolean;
  message: string;
  data?: any[];
  errors?: string[];
}

interface TaskExcelUploadProps {
  onUploadComplete?: (result: ExcelUploadResult) => void;
  onClose?: () => void;
  className?: string;
}

interface ExcelTaskData {
  title: string;
  startDate: string;
  targetPlace: string;
  description: string;
  category: string;
  priority: string;
  dueDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  status: string;
  progress: number;
}

export function TaskExcelUpload({ onUploadComplete, onClose, className }: TaskExcelUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<ExcelUploadResult | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const queryClient = useQueryClient();

  // ExcelJS를 사용한 실제 드롭다운 템플릿 생성
  const generateExcelTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // 업무목록 템플릿 시트
    const worksheet = workbook.addWorksheet('업무목록_템플릿');
    
    // 헤더 설정 - 사용자 요청에 따라 컬럼 순서 변경
    const headers = [
      '업무제목*', '시작날짜*', '시작시간', '대상처', '설명', '업무구분*', '우선순위',
      '마감날짜', '마감시간', '하루종일', '상태', '진행률(%)'
    ];
    
    worksheet.addRow(headers);
    
    // 예시 데이터 추가 - 새로운 컬럼 순서에 맞게 수정
    const sampleData = [
      ['월간 보고서 작성', '2025-01-31', '09:00', '경영진', '2025년 1월 월간 업무 보고서 작성 및 제출', '경영지원', '높음', '2025-01-31', '11:00', '아니오', '예정', 0],
      ['신규 고객 계약 검토', '2025-01-20', '09:00', 'A사', 'A사와의 신규 계약서 검토 및 승인 절차 진행', '신규계약', '긴급', '2025-01-20', '16:00', '아니오', '예정', 0],
      ['기존 계약 갱신', '2025-01-25', '09:00', 'B사', 'B사 계약 갱신 협상 및 처리 업무', '계약관리', '보통', '2025-01-25', '12:00', '아니오', '진행', 50],
      ['C사 계약 해지 처리', '2025-01-30', '09:00', 'C사', '계약 해지 절차 진행 및 정산 업무', '계약해지', '보통', '2025-01-30', '17:00', '아니오', '예정', 0],
      ['시스템 점검', '2025-02-05', '', '전사', '전체 시스템 정기 점검 및 유지보수 작업', '경영지원', '높음', '2025-02-05', '', '예', '예정', 0]
    ];
    
    sampleData.forEach(row => {
      worksheet.addRow(row);
    });
    
    // 컬럼 너비 설정 - 헤더 순서에 맞게 조정
    worksheet.columns = [
      { width: 25 }, // 업무제목*
      { width: 12 }, // 시작날짜*
      { width: 10 }, // 시작시간
      { width: 15 }, // 대상처
      { width: 50 }, // 설명
      { width: 12 }, // 업무구분*
      { width: 10 }, // 우선순위
      { width: 12 }, // 마감날짜
      { width: 10 }, // 마감시간
      { width: 10 }, // 하루종일
      { width: 10 }, // 상태
      { width: 12 }  // 진행률(%)
    ];
    
    // 헤더 스타일 설정 - 중앙 정렬 추가
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 모든 데이터 행에 중앙 정렬 적용 및 시간 형식 설정
    for (let rowNumber = 2; rowNumber <= 101; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // 시작시간 기본값 09:00 설정 (C열)
      if (rowNumber > 6) { // 예시 데이터 이후 빈 행들
        const startTimeCell = worksheet.getCell(`C${rowNumber}`);
        startTimeCell.value = '09:00';
        startTimeCell.alignment = { horizontal: 'center', vertical: 'middle' };
        startTimeCell.numFmt = '@'; // 텍스트 형식으로 강제 설정
      }
      
      // 마감시간 컬럼도 텍스트 형식으로 설정 (I열)
      const endTimeCell = worksheet.getCell(`I${rowNumber}`);
      endTimeCell.numFmt = '@'; // 텍스트 형식으로 강제 설정
    }
    
    // 시간 및 날짜 컬럼들을 텍스트 형식으로 설정
    worksheet.getColumn('B').numFmt = '@'; // 시작날짜*
    worksheet.getColumn('C').numFmt = '@'; // 시작시간
    worksheet.getColumn('H').numFmt = '@'; // 마감날짜
    worksheet.getColumn('I').numFmt = '@'; // 마감시간
    
    // 실제 작동하는 드롭다운 설정 - 새로운 컬럼 위치에 맞게 수정
    // 업무구분 드롭다운 (F열, 2행부터 101행까지)
    worksheet.getColumn('F').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber >= 2 && rowNumber <= 101) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"경영지원,계약관리,신규계약,계약해지"'],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: '입력 오류',
          error: '업무구분을 드롭다운에서 선택하세요'
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    
    // 우선순위 드롭다운 (G열, 2행부터 101행까지)
    worksheet.getColumn('G').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber >= 2 && rowNumber <= 101) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"낮음,보통,높음,긴급"'],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: '입력 오류',
          error: '우선순위를 드롭다운에서 선택하세요'
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    
    // 하루종일 드롭다운 (J열, 2행부터 101행까지)
    worksheet.getColumn('J').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber >= 2 && rowNumber <= 101) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"예,아니오"'],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: '입력 오류',
          error: '하루종일 여부를 드롭다운에서 선택하세요'
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    
    // 상태 드롭다운 (K열, 2행부터 101행까지)
    worksheet.getColumn('K').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber >= 2 && rowNumber <= 101) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"예정,진행,완료,취소,연기"'],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: '입력 오류',
          error: '상태를 드롭다운에서 선택하세요'
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    
    // 사용법 시트 추가
    const instructionSheet = workbook.addWorksheet('📖사용법_필독');
    
    const instructions = [
      ['🎯 업무 일괄등록 엑셀 템플릿 사용법'],
      [''],
      ['📝 1. 필수 필드 (반드시 입력)'],
      ['업무제목*: 업무명 입력 (필수)'],
      ['시작날짜*: 2025-01-31 형식 (필수)'],
      ['업무구분*: 경영지원, 계약관리, 신규계약, 계약해지 중 드롭다운 선택 (필수)'],
      [''],
      ['📋 2. 기본 정보 입력'],
      ['대상처: 업무 대상 회사/부서명'],
      ['설명: 업무에 대한 상세 내용 (컬럼 너비가 넓게 설정됨)'],
      ['우선순위: 낮음, 보통, 높음, 긴급 중 드롭다운 선택 (기본값: 보통)'],
      ['마감날짜: 2025-01-31 형식 (선택사항)'],
      [''],
      ['⏰ 3. 시간 설정 (다양한 형식 지원)'],
      ['시작시간: 09:00, 9:00, 900, 0900 등 다양한 형식 입력 가능'],
      ['마감시간: 17:00, 17:30, 1730 등 다양한 형식 입력 가능'],
      ['⭐ 시간 입력 예시: 09:00, 9:00, 900, 1530, 15:30 모두 가능'],
      ['하루종일: 예/아니오 드롭다운 선택 (예 선택시 시간 무시)'],
      [''],
      ['📊 4. 상태 및 진행률'],
      ['상태: 예정, 진행, 완료, 취소, 연기 중 드롭다운 선택 (기본값: 예정)'],
      ['진행률(%): 0~100 숫자 (기본값: 0)'],
      [''],
      ['🎨 5. 드롭다운 기능 사용법 ⭐'],
      ['✅ 업무구분, 우선순위, 상태, 하루종일 필드는 실제 드롭다운으로 작동합니다'],
      ['✅ 셀을 클릭하면 우측에 화살표가 나타나며, 클릭하면 선택 옵션 표시'],
      ['✅ 직접 입력하지 말고 반드시 드롭다운에서 선택하세요'],
      ['✅ 잘못된 값 입력시 오류 메시지가 표시됩니다'],
      [''],
      ['📅 6. 반복일정 등록 안내'],
      ['⚠️ 반복일정 등록은 일괄등록 후 개별수정해주세요'],
      ['일괄등록으로는 단일 업무만 등록되며, 반복 설정은 웹에서 개별 수정 필요'],
      [''],
      ['⚠️ 7. 주의사항'],
      ['- 업무제목, 시작날짜, 업무구분은 필수입니다'],
      ['- 날짜는 다양한 형식 지원: 2025-01-31, 2025/01/31, 01/31/2025, 엑셀 날짜 등'],
      ['- 시간은 다양한 형식 지원: 09:00, 9:00, 900, 1530 등'],
      ['- 시간 컬럼은 텍스트 형식으로 설정되어 있습니다'],
      ['- 하루종일이 "예"면 시작시간/마감시간 입력 불필요'],
      ['- 후속담당자와 전달메모는 웹상에서 입력 가능합니다'],
      ['- 진행률은 0~100 사이의 숫자로 입력'],
      [''],
      ['💡 8. 예시 데이터 활용'],
      ['템플릿에 포함된 5개 예시 데이터를 참고하여 작성하세요'],
      ['예시: 월간 보고서 작성, 신규 고객 계약 검토, 기존 계약 갱신 등'],
      ['예시 데이터는 삭제하고 실제 업무 데이터로 교체하세요'],
      [''],
      ['✅ 9. 완료 후 업로드'],
      ['작성 완료 후 "엑셀 업로드" 탭에서 파일을 업로드하세요'],
      ['업로드 전 필수 필드와 형식을 다시 한번 확인하세요'],
      ['오류 발생시 오류 메시지를 확인하여 수정 후 재업로드하세요']
    ];
    
    instructions.forEach(row => {
      instructionSheet.addRow(row);
    });
    
    instructionSheet.getColumn(1).width = 70;
    
    return workbook;
  };

  // 템플릿 다운로드 (ExcelJS 사용)
  const downloadTemplate = async () => {
    try {
      const workbook = await generateExcelTemplate();
      const buffer = await workbook.xlsx.writeBuffer();
      
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '업무_일괄등록_템플릿_드롭다운.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('템플릿 다운로드 오류:', error);
      alert('템플릿 다운로드 중 오류가 발생했습니다.');
    }
  };

  // 파일 선택 핸들러
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      console.log('🔥 NEW FILE SELECTED:', selectedFile.name, selectedFile.size, 'bytes');
      // 🔥 중요: 새 파일 선택 시 모든 상태 초기화
      setFile(selectedFile);
      setResult(null);
      setUploadProgress(0);
      setUploading(false);
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
        console.log('🔥 NEW FILE DROPPED:', droppedFile.name, droppedFile.size, 'bytes');
        // 🔥 중요: 새 파일 드롭 시 모든 상태 초기화
        setFile(droppedFile);
        setResult(null);
        setUploadProgress(0);
        setUploading(false);
      } else {
        alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      }
    }
  };

  // 시간 형식 변환 함수 (다양한 시간 형식을 HH:MM으로 통일)
  const convertTimeFormat = (timeValue: any): string | null => {
    if (!timeValue) return null;
    
    // 문자열로 변환
    let timeStr = String(timeValue).trim();
    
    // 이미 HH:MM 형식인 경우
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    // H:MM 형식인 경우 (예: 9:00 -> 09:00)
    if (/^\d{1}:\d{2}$/.test(timeStr)) {
      return '0' + timeStr;
    }
    
    // 숫자만 있는 경우 (예: 900 -> 09:00, 1530 -> 15:30)
    if (/^\d{3,4}$/.test(timeStr)) {
      if (timeStr.length === 3) {
        // 900 -> 09:00
        return '0' + timeStr.charAt(0) + ':' + timeStr.slice(1);
      } else if (timeStr.length === 4) {
        // 1530 -> 15:30
        return timeStr.slice(0, 2) + ':' + timeStr.slice(2);
      }
    }
    
    // 엑셀에서 시간이 소수로 읽힌 경우 (예: 0.375 = 9:00)
    if (typeof timeValue === 'number' && timeValue >= 0 && timeValue <= 1) {
      const totalMinutes = Math.round(timeValue * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
    }
    
    // 시간:분 형식이지만 공백이나 다른 문자가 포함된 경우
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2];
      if (parseInt(hours) >= 0 && parseInt(hours) <= 23 && parseInt(minutes) >= 0 && parseInt(minutes) <= 59) {
        return hours + ':' + minutes;
      }
    }
    
    // 변환할 수 없는 형식
    return null;
  };

  // 엑셀 날짜 변환 함수 - 문자열은 그대로 반환, 변환 최소화
  const convertDateFormat = (dateValue: any): string | null => {
    if (!dateValue) return null;
    
    console.log('🔍 CRITICAL 날짜 변환 시도:', dateValue, typeof dateValue);
    
    // 🔥 CRITICAL: 이미 문자열인 경우 최대한 그대로 사용
    if (typeof dateValue === 'string') {
      const dateStr = dateValue.trim();
      
      // 이미 YYYY-MM-DD 형식인 경우 - 절대 변환하지 않음!
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        console.log('✅ CRITICAL 이미 올바른 형식 (변환 없이 그대로 반환):', dateStr);
        return dateStr;
      }
      
      // YYYY/MM/DD 형식인 경우만 최소 변환
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
        const result = dateStr.replace(/\//g, '-');
        console.log('✅ YYYY/MM/DD 변환:', dateStr, '->', result);
        return result;
      }
      
      // MM/DD/YYYY 형식인 경우
      const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mmddyyyyMatch) {
        const month = mmddyyyyMatch[1].padStart(2, '0');
        const day = mmddyyyyMatch[2].padStart(2, '0');
        const year = mmddyyyyMatch[3];
        const result = `${year}-${month}-${day}`;
        console.log('✅ MM/DD/YYYY 변환:', dateStr, '->', result);
        return result;
      }
      
      // M/D 형식인 경우 (현재 년도 가정)
      const mdMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (mdMatch) {
        const month = mdMatch[1].padStart(2, '0');
        const day = mdMatch[2].padStart(2, '0');
        const year = new Date().getFullYear();
        const result = `${year}-${month}-${day}`;
        console.log('✅ M/D 변환:', dateStr, '->', result);
        return result;
      }
      
      // 🔥 CRITICAL: 기타 문자열 형식도 그대로 반환 (서버에서 처리하도록)
      console.log('✅ CRITICAL 알 수 없는 문자열 형식 - 그대로 반환:', dateStr);
      return dateStr;
    }
    
    // 🔥 CRITICAL: Date 객체나 숫자는 가능한 피하고, 변환시에도 로컬타임 기준으로 처리
    if (dateValue instanceof Date) {
      // 유효한 Date 객체인지 확인
      if (isNaN(dateValue.getTime())) {
        console.warn('❌ CRITICAL 유효하지 않은 Date 객체:', dateValue);
        return null;
      }
      
      // 🔥 CRITICAL: 로컬 시간 기준으로 처리 (타임존 무시)
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getDate()).padStart(2, '0');
      const result = `${year}-${month}-${day}`;
      console.log('✅ CRITICAL Date 객체 변환 (로컬 시간 기준):', dateValue, '->', result);
      return result;
    }
    
    // 엑셀 시리얼 넘버인 경우 (최후의 수단)
    if (typeof dateValue === 'number' && dateValue > 0) {
      // 🔥 CRITICAL: 엑셀 시리얼 넘버를 로컬 시간 기준으로 변환
      const excelEpoch = new Date(1899, 11, 30); // 로컬 시간 기준
      const jsDate = new Date(excelEpoch.getTime() + (dateValue * 24 * 60 * 60 * 1000));
      
      const year = jsDate.getFullYear();
      const month = String(jsDate.getMonth() + 1).padStart(2, '0');
      const day = String(jsDate.getDate()).padStart(2, '0');
      const result = `${year}-${month}-${day}`;
      console.log('✅ CRITICAL 엑셀 시리얼 넘버 변환 (로컬 기준):', dateValue, '->', result);
      return result;
    }
    
    // 변환할 수 없는 형식
    console.warn('❌ 날짜 변환 실패:', dateValue);
    return null;
  };

  // 엑셀 데이터 검증 (기존 파일과 새 템플릿 모두 지원)
  const validateExcelData = (data: any[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 3; // 헤더와 설명 행 제외
      
      // 필수 필드 검증 (기존 파일과 새 템플릿 모두 지원)
      const title = row['업무제목*'] || row['업무제목'];
      if (!title) {
        errors.push(`행 ${rowNum}: 업무제목은 필수 항목입니다.`);
      }
      
      const startDate = row['시작날짜*'] || row['시작날짜'];
      if (!startDate) {
        errors.push(`행 ${rowNum}: 시작날짜는 필수 항목입니다.`);
      } else {
        // 날짜 형식 검증 및 변환
        const convertedStartDate = convertDateFormat(startDate);
        if (!convertedStartDate) {
          errors.push(`행 ${rowNum}: 시작날짜 형식이 올바르지 않습니다. (YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY 형식 또는 엑셀 날짜)`);
        } else {
          row['시작날짜*'] = convertedStartDate; // 변환된 날짜로 업데이트
          if (row['시작날짜']) row['시작날짜'] = convertedStartDate; // 기존 컬럼명도 업데이트
        }
      }
      
      const category = row['업무구분*'] || row['업무구분'];
      if (!category) {
        errors.push(`행 ${rowNum}: 업무구분은 필수 항목입니다.`);
      } else {
        // 업무구분 유효성 검증
        const validCategories = ['경영지원', '계약관리', '신규계약', '계약해지'];
        if (!validCategories.includes(category)) {
          errors.push(`행 ${rowNum}: 업무구분은 ${validCategories.join(', ')} 중 하나여야 합니다.`);
        }
      }
      
      // 마감날짜 형식 검증 및 변환 (선택사항) - 기존 파일과 새 템플릿 모두 지원
      const dueDate = row['마감날짜'];
      if (dueDate) {
        const convertedDueDate = convertDateFormat(dueDate);
        if (!convertedDueDate) {
          errors.push(`행 ${rowNum}: 마감날짜 형식이 올바르지 않습니다. (YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY 형식 또는 엑셀 날짜)`);
        } else {
          row['마감날짜'] = convertedDueDate; // 변환된 날짜로 업데이트
        }
      }
      
      // 상태 검증 - 기존 파일과 새 템플릿 모두 지원
      const status = row['상태'];
      if (status) {
        const validStatuses = ['예정', '진행', '완료', '취소', '연기'];
        if (!validStatuses.includes(status)) {
          errors.push(`행 ${rowNum}: 상태는 ${validStatuses.join(', ')} 중 하나여야 합니다.`);
        }
      }
      
      // 우선순위 검증 - 기존 파일과 새 템플릿 모두 지원
      const priority = row['우선순위'];
      if (priority) {
        const validPriorities = ['낮음', '보통', '높음', '긴급'];
        if (!validPriorities.includes(priority)) {
          errors.push(`행 ${rowNum}: 우선순위는 ${validPriorities.join(', ')} 중 하나여야 합니다.`);
        }
      }
      
      // 하루종일 검증 - 기존 파일과 새 템플릿 모두 지원
      const allDay = row['하루종일'];
      if (allDay) {
        const validAllDay = ['예', '아니오'];
        if (!validAllDay.includes(allDay)) {
          errors.push(`행 ${rowNum}: 하루종일은 '예' 또는 '아니오'여야 합니다.`);
        }
      }
      
      // 시간 형식 검증 및 변환 (하루종일이 아닌 경우만) - 기존 파일과 새 템플릿 모두 지원
      const isAllDay = allDay === '예';
      if (!isAllDay) {
        const startTime = row['시작시간'];
        if (startTime) {
          const convertedStartTime = convertTimeFormat(startTime);
          if (!convertedStartTime) {
            errors.push(`행 ${rowNum}: 시작시간 형식이 올바르지 않습니다. (HH:MM 또는 H:MM 형식으로 입력하세요)`);
          } else {
            row['시작시간'] = convertedStartTime; // 변환된 시간으로 업데이트
          }
        }
        
        const endTime = row['마감시간'];
        if (endTime) {
          const convertedEndTime = convertTimeFormat(endTime);
          if (!convertedEndTime) {
            errors.push(`행 ${rowNum}: 마감시간 형식이 올바르지 않습니다. (HH:MM 또는 H:MM 형식으로 입력하세요)`);
          } else {
            row['마감시간'] = convertedEndTime; // 변환된 시간으로 업데이트
          }
        }
      }
      
      // 진행률 검증 - 기존 파일과 새 템플릿 모두 지원
      const progress = row['진행률(%)'] || row['진행율(%)'] || row['진행률'] || row['진행율'];
      if (progress) {
        const progressNum = Number(progress);
        if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
          errors.push(`행 ${rowNum}: 진행률은 0~100 사이의 숫자여야 합니다.`);
        }
      }
    });
    
    return { valid: errors.length === 0, errors };
  };

  // 상태 한글 -> 영문 변환
  const convertStatusToEnglish = (koreanStatus: string): string => {
    const statusMap: { [key: string]: string } = {
      '예정': 'scheduled',
      '진행': 'in_progress',
      '완료': 'completed',
      '취소': 'cancelled',
      '연기': 'postponed'
    };
    return statusMap[koreanStatus] || 'scheduled';
  };

  // 우선순위 한글 -> 영문 변환
  const convertPriorityToEnglish = (koreanPriority: string): string => {
    const priorityMap: { [key: string]: string } = {
      '낮음': 'low',
      '보통': 'medium',
      '높음': 'high',
      '긴급': 'urgent'
    };
    return priorityMap[koreanPriority] || 'medium';
  };

  // 엑셀 데이터를 업무 형식으로 변환 - 기존 파일과 새 템플릿 모두 지원
  const convertExcelToTask = (excelData: any): ExcelTaskData => {
    const startDateRaw = excelData['시작날짜*'] || excelData['시작날짜'];
    const dueDateRaw = excelData['마감날짜'];
    
    console.log('📝 업무 데이터 변환:', {
      title: excelData['업무제목*'] || excelData['업무제목'],
      startDateRaw,
      dueDateRaw
    });
    
    // 🔥 CRITICAL: 날짜 변환 함수 사용 금지! 문자열 그대로 사용!
    const finalStartDate = String(startDateRaw || ''); // 강제 문자열 변환
    const finalDueDate = String(dueDateRaw || ''); // 강제 문자열 변환
    
    console.log('📅 🔥 CRITICAL 날짜 문자열 그대로 사용:', {
      startDateRaw,
      finalStartDate,
      startDateType: typeof finalStartDate,
      dueDateRaw,
      finalDueDate,
      dueDateType: typeof finalDueDate
    });
    
    return {
      title: excelData['업무제목*'] || excelData['업무제목'] || '',
      startDate: finalStartDate, // 🔥 문자열 그대로!
      startTime: convertTimeFormat(excelData['시작시간']) || '09:00', // 기본값 09:00 설정
      targetPlace: excelData['대상처'] || '',
      description: excelData['설명'] || '',
      category: excelData['업무구분*'] || excelData['업무구분'] || '경영지원',
      priority: convertPriorityToEnglish(excelData['우선순위'] || '보통'),
      dueDate: finalDueDate, // 🔥 문자열 그대로!
      endTime: convertTimeFormat(excelData['마감시간']) || '',
      allDay: excelData['하루종일'] === '예',
      status: convertStatusToEnglish(excelData['상태'] || '예정'),
      progress: Number(excelData['진행률(%)'] || excelData['진행율(%)'] || excelData['진행률'] || excelData['진행율']) || 0
    };
  };

  // 파일 취소 함수 추가
  const handleFileCancel = () => {
    setFile(null);
    setResult(null);
    setUploadProgress(0);
    // 파일 입력 초기화
    const fileInput = document.getElementById('excel-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // 업로드 처리
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    
    // 🔥 중요: 이전 결과와 상태 완전 초기화
    setResult(null);

    try {
      console.log('🚀 엑셀 업로드 시작:', file.name, file.size, 'bytes');
      console.log('🔥 CRITICAL: 새로운 파일 업로드 - 이전 데이터 무시!');
      
      // 파일 읽기 - 🔥 CRITICAL: 날짜를 문자열로 읽어서 타임존 문제 완전 해결
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { 
        cellDates: false,   // 🔥 핵심: Date 객체 변환 비활성화 (타임존 문제 원인)
        cellNF: false,
        cellText: true,     // 🔥 핵심: 문자열로 읽기
        raw: false          // 🔥 핵심: 원본 형식 유지
      });
      
      console.log('📋 워크북 시트 목록:', workbook.SheetNames);
      console.log('📋 파일명 재확인:', file.name);
      console.log('📋 파일 크기 재확인:', file.size, 'bytes');
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // 🔥 CRITICAL: 문자열 기반으로 데이터 읽기 (타임존 문제 완전 차단)
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false, // 🔥 핵심: 문자열 형태로 읽기 (Date 변환 방지)
        header: 1
      });
      
      console.log('📋 원본 엑셀 데이터 전체 행 수:', rawData.length);
      console.log('📋 원본 엑셀 데이터 (첫 5행):', rawData.slice(0, 5));
      console.log('🔥 CRITICAL CHECK: 파일에서 읽은 실제 행 수:', rawData.length);
      
      if (rawData.length < 2) {
        throw new Error('엑셀 파일에 데이터가 없거나 헤더만 있습니다. 최소 1행의 데이터가 필요합니다.');
      }
      
      // 헤더와 데이터 분리
      const headers = rawData[0] as string[];
      const dataRows = rawData.slice(1);
      
      console.log('📋 헤더:', headers);
      console.log('📋 데이터 행 수:', dataRows.length);
      console.log('🔥 CRITICAL: 헤더 제외한 실제 데이터 행 수:', dataRows.length);
      
      // 객체 형태로 변환하면서 날짜 시리얼 넘버 처리
      const jsonData = dataRows.map((row: any[], rowIndex: number) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          let value = row[index];
          
          console.log(`🔍 [행${rowIndex + 2}] ${header}: 원본값="${value}" (타입: ${typeof value})`);
          
          // 🔥 CRITICAL: cellDates:false 설정으로 이제 모든 날짜가 문자열로 읽힘!
          if (header === '시작날짜*' || header === '시작날짜' || header === '마감날짜') {
            if (value) {
              console.log(`📅 날짜 컬럼 처리 [${header}]: 원본="${value}", 타입=${typeof value}`);
              // 🔥 CRITICAL: 절대로 문자열만 사용! Date 변환 금지!
              value = String(value); // 강제로 문자열 변환하여 완전히 보장
              console.log(`✅ CRITICAL: 강제 문자열 변환 후: ${value} (타입: ${typeof value})`);
            }
          }
          
          obj[header] = value || '';
        });
        return obj;
      });
      
      console.log('📋 엑셀 데이터 읽기 완료:', jsonData.length, '행');
      console.log('📋 변환된 데이터 샘플 (첫 3개):', jsonData.slice(0, 3));
      console.log('🔥 CRITICAL: JSON 변환 후 데이터 수:', jsonData.length);
      console.log('🔥 CRITICAL: 전체 데이터 제목 확인:', jsonData.map((row, i) => `${i+1}: ${row['업무제목*'] || row['업무제목'] || '제목없음'}`));

      setUploadProgress(30);

      // 빈 행 제거 - 더 정확한 검증
      const filteredRows = jsonData.filter((row: any, index: number) => {
        // 필수 필드인 업무제목이 있는지 우선 확인
        const title = row['업무제목*'] || row['업무제목'];
        if (!title || String(title).trim() === '') {
          console.log(`🗑️ 제목 없는 행 제거 [행${index + 2}]:`, row);
          return false;
        }
        
        // 기타 유효한 데이터가 있는지 확인
        const hasOtherData = Object.entries(row).some(([key, value]) => {
          if (key === '업무제목*' || key === '업무제목') return false; // 제목은 이미 확인했음
          const str = String(value).trim();
          return str !== '' && str !== 'undefined' && str !== 'null';
        });
        
        if (!hasOtherData) {
          console.log(`🗑️ 데이터 부족한 행 제거 [행${index + 2}]:`, row);
          return false;
        }
        
        return true;
      });
      
      console.log('📋 빈 행 제거 후 데이터:', filteredRows.length, '행');
      console.log('📋 필터링된 데이터 샘플 (첫 3개):', filteredRows.slice(0, 3));
      console.log('🔥 CRITICAL: 필터링 후 최종 데이터 수:', filteredRows.length);
      console.log('🔥 CRITICAL: 최종 데이터 제목들:', filteredRows.map((row, i) => `${i+1}: ${row['업무제목*'] || row['업무제목']}`));

      if (filteredRows.length === 0) {
        console.error('❌ 필터링 후 데이터 없음. 원본 데이터 분석:');
        jsonData.forEach((row, index) => {
          const title = row['업무제목*'] || row['업무제목'];
          console.log(`   행${index + 2}: 제목="${title}", 전체데이터=`, row);
        });
        throw new Error('엑셀 파일에 유효한 데이터가 없습니다. 업무제목이 입력된 행이 없거나 필수 데이터가 누락되었습니다.');
      }

      setUploadProgress(50);

      // 데이터 검증
      console.log('🔍 데이터 검증 시작...');
      const validation = validateExcelData(filteredRows);
      
      console.log('🔍 검증 결과:', {
        valid: validation.valid,
        errorCount: validation.errors.length,
        errors: validation.errors.slice(0, 5) // 첫 5개 오류만 로그
      });
      
      if (!validation.valid) {
        console.error('❌ 데이터 검증 실패:', validation.errors);
        setResult({
          success: false,
          message: '데이터 검증에 실패했습니다.',
          errors: validation.errors
        });
        setUploading(false);
        return;
      }

      setUploadProgress(70);

      // 데이터 변환
      console.log('🔄 데이터 변환 시작...');
      const taskData = filteredRows.map((row, index) => {
        try {
          const converted = convertExcelToTask(row);
          console.log(`✅ 변환 완료 [${index + 1}]:`, {
            title: converted.title,
            startDate: converted.startDate,
            category: converted.category,
            targetPlace: converted.targetPlace
          });
          
          // 🔥 CRITICAL: 서버가 기대하는 필드명으로 매핑
          const serverTask = {
            title: converted.title,
            workDate: converted.startDate, // 🔥 핵심: startDate -> workDate로 매핑!
            dueDate: converted.dueDate,
            startTime: converted.startTime,
            endTime: converted.endTime,
            targetPlace: converted.targetPlace,
            description: converted.description,
            category: converted.category,
            priority: converted.priority,
            status: converted.status,
            progress: converted.progress,
            allDay: converted.allDay
          };
          
          console.log(`🔥 CRITICAL 서버 전송용 데이터 [${index + 1}]:`, {
            title: serverTask.title,
            workDate: serverTask.workDate, // 🔥 이제 workDate로 전송!
            category: serverTask.category,
            targetPlace: serverTask.targetPlace
          });
          
          return serverTask;
        } catch (error) {
          console.error(`❌ 변환 실패 [${index + 1}]:`, error, row);
          throw error;
        }
      });

      console.log('🔄 변환된 업무 데이터:', taskData.length, '개');
      console.log('🔄 변환 샘플 (첫 2개):', taskData.slice(0, 2));

      if (taskData.length === 0) {
        throw new Error('변환 가능한 업무 데이터가 없습니다.');
      }

      setUploadProgress(90);

      // 서버로 데이터 전송
      console.log('📤 서버로 데이터 전송 시작...', {
        endpoint: '/api/tasks/bulk-upload',
        taskCount: taskData.length,
        sampleTask: taskData[0]
      });
      
      const requestBody = { tasks: taskData };
      console.log('📤 전송할 데이터 구조:', {
        tasksArrayLength: requestBody.tasks.length,
        firstTaskKeys: Object.keys(requestBody.tasks[0] || {}),
        bodySize: JSON.stringify(requestBody).length
      });
      console.log('🔥 CRITICAL: 서버로 전송하는 업무 수량 최종 확인:', taskData.length);
      console.log('🔥 CRITICAL: 전송할 업무 제목들 최종 확인:', taskData.map((task, i) => `${i+1}: ${task.title}`));
      
      // 🔥 CRITICAL: 서버 전송 직전 날짜 타입 최종 검증
      console.log('🔥 CRITICAL HTTP 전송 직전 날짜 타입 검증:', taskData.map(task => ({
        title: task.title,
        workDate: task.workDate,
        workDateType: typeof task.workDate,
        isString: typeof task.workDate === 'string'
      })));
      
      const response = await fetch('/api/tasks/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📤 서버 응답 상태:', response.status, response.statusText);
      
      const responseData = await response.json();
      console.log('📤 서버 응답 데이터:', responseData);

      setUploadProgress(100);

      if (response.ok && responseData.success) {
        // 서버에서 반환된 실제 등록 개수 사용
        const actualCount = responseData.createdCount || responseData.count || responseData.data?.length || taskData.length;
        const successMessage = `${actualCount}개의 업무가 성공적으로 등록되었습니다.`;
        console.log('🎉 업로드 성공:', successMessage);
        console.log('📊 카운팅 확인 - taskData.length:', taskData.length, 'actualCount:', actualCount);
        
        setResult({
          success: true,
          message: successMessage,
          data: taskData
        });
        
        // React Query 캐시 무효화하여 업무목록 즉시 갱신
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        
        if (onUploadComplete) {
          onUploadComplete({
            success: true,
            message: successMessage,
            data: taskData
          });
        }
      } else {
        console.error('❌ 서버 오류:', responseData);
        const errorMessage = responseData.message || '업로드에 실패했습니다.';
        console.error('❌ 오류 상세:', errorMessage);
        
        setResult({
          success: false,
          message: errorMessage,
          errors: responseData.errors || [errorMessage]
        });
      }

    } catch (error) {
      console.error('❌ Excel upload error:', error);
      const errorMessage = error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.';
      console.error('❌ 오류 상세:', errorMessage);
      
      setResult({
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 제목과 닫기 버튼을 같은 행에 배치 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">업무 일괄등록</h2>
        {onClose && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            닫기
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 템플릿 다운로드 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              1단계: 업무 엑셀 템플릿 다운로드
            </CardTitle>
            <CardDescription>
              업무 일괄등록을 위한 엑셀 템플릿을 다운로드하세요.
              <br />✅ 시작시간 기본값 09:00 자동 설정
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={downloadTemplate} className="flex items-center gap-2 w-full sm:w-auto">
              <FileText className="h-4 w-4" />
              📋 업무등록 템플릿 다운로드
            </Button>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                💡 <strong>필수입력:</strong> 업무제목/시작날짜*/업무구분*
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* 파일 업로드 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              2단계: 작성된 엑셀 파일 업로드
            </CardTitle>
            <CardDescription>
              작성한 엑셀 파일을 선택하고 업로드하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excel-file">엑셀 파일 선택</Label>
              
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
                onClick={() => !uploading && document.getElementById('excel-file')?.click()}
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
                id="excel-file"
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
                <div className="flex justify-between text-sm">
                  <span>업로드 진행중...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  업무 일괄등록 실행
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 사용법 가이드 섹션 */}
      {/* 사용법 가이드 - 접을 수 있는 형태 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader 
          className="cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setShowGuide(!showGuide)}
        >
          <CardTitle className="flex items-center justify-between text-gray-900">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              📖 업무 일괄등록 사용법 가이드
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {showGuide ? '숨기기' : '보기'}
              </span>
              {showGuide ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardTitle>
          <CardDescription className="text-gray-800">
            엑셀을 이용한 업무 일괄등록 방법을 안내합니다. (클릭하여 {showGuide ? '숨기기' : '펼치기'})
          </CardDescription>
        </CardHeader>
        
        {showGuide && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">📝 1. 필수 필드 (반드시 입력)</h4>
                  <ul className="space-y-1 text-gray-900">
                    <li>• <strong>업무제목<span className="text-red-600 font-bold">*</span>:</strong> 업무명 입력 (필수)</li>
                    <li>• <strong>시작시간:</strong> 09:00 형식 (기본값: 09:00)</li>
                    <li>• <strong>시작날짜<span className="text-red-600 font-bold">*</span>:</strong> 2025-01-31 형식 (필수)</li>
                    <li>• <strong>업무구분<span className="text-red-600 font-bold">*</span>:</strong> 드롭다운 선택 (필수)</li>
                  </ul>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">📋 2. 기본 정보 입력</h4>
                  <ul className="space-y-1 text-gray-900">
                    <li>• <strong>대상처:</strong> 업무 대상 회사/부서명</li>
                    <li>• <strong>설명:</strong> 업무 상세 내용</li>
                    <li>• <strong>우선순위:</strong> 드롭다운 선택</li>
                    <li>• <strong>마감날짜:</strong> 2025-01-31 형식</li>
                  </ul>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">⏰ 3. 시간 설정</h4>
                  <ul className="space-y-1 text-gray-900">
                    <li>• <strong>시작시간:</strong> 09:00 형식</li>
                    <li>• <strong>마감시간:</strong> 17:00 형식</li>
                    <li>• <strong>하루종일:</strong> 예/아니오 드롭다운</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">🎨 4. 드롭다운 기능 ⭐</h4>
                  <ul className="space-y-1 text-gray-900">
                    <li>• <strong>업무구분:</strong> 경영지원, 계약관리, 신규계약, 계약해지</li>
                    <li>• <strong>우선순위:</strong> 낮음, 보통, 높음, 긴급</li>
                    <li>• <strong>상태:</strong> 예정, 진행, 완료, 취소, 연기</li>
                    <li>• <strong>하루종일:</strong> 예, 아니오</li>
                  </ul>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">📊 5. 상태 및 진행률</h4>
                  <ul className="space-y-1 text-gray-900">
                    <li>• <strong>상태:</strong> 드롭다운 선택 (기본값: 예정)</li>
                    <li>• <strong>진행률(%):</strong> 0~100 숫자 (기본값: 0)</li>
                  </ul>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">⚠️ 6. 주의사항</h4>
                  <ul className="space-y-1 text-gray-900">
                    <li>• <strong>날짜</strong>: YYYY-MM-DD 형식 (예: 2025-01-31)</li>
                    <li>• <strong>시간</strong>: HH:MM 형식 (예: 09:00, 17:30)</li>
                    <li>• <strong>드롭다운</strong>: 정확한 옵션만 선택 (직접 입력 불가)</li>
                    <li>• <strong className="text-red-600">엑셀 컬럼명 수정금지</strong>: 헤더 행의 컬럼명을 절대 변경하지 마세요</li>
                    <li>• <strong>필수필드 외 항목</strong>: 후속담당자, 전달메모는 "업무목록"에서 수정 가능</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-gray-900">
                <strong>💡 중요:</strong> 엑셀에서 셀을 클릭하면 우측에 화살표가 나타납니다. 
                화살표를 클릭하여 드롭다운 옵션을 선택하세요. 직접 입력시 오류가 발생할 수 있습니다.
              </AlertDescription>
            </Alert>


          </CardContent>
        )}
      </Card>

      {/* 결과 표시 */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              업로드 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                {result.message}
              </AlertDescription>
            </Alert>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-red-800">오류 상세:</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.success && result.data && (
              <div className="mt-4 space-y-3">
                <h4 className="font-medium text-green-800">등록된 업무 목록:</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-60 overflow-y-auto">
                  {result.data.map((task: ExcelTaskData, index: number) => (
                    <div key={index} className="flex items-center gap-3 py-2 border-b border-green-200 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <User className="h-3 w-3" />
                        <span>{task.assignedTo}</span>
                        <Clock className="h-3 w-3 ml-2" />
                        <span>{task.workDate}</span>
                        <Tag className="h-3 w-3 ml-2" />
                        <span>{task.category}</span>
                      </div>
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