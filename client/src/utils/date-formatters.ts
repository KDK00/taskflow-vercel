import { format, parseISO, isValid, formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

/**
 * 날짜를 YYYY년 MM월 DD일 형식으로 포맷
 */
export const formatDateKorean = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, 'yyyy년 MM월 dd일', { locale: ko });
  } catch {
    return '';
  }
};

/**
 * 날짜를 MM/DD 형식으로 포맷
 */
export const formatDateShort = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, 'MM/dd');
  } catch {
    return '';
  }
};

/**
 * 날짜와 시간을 YYYY-MM-DD HH:mm 형식으로 포맷
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, 'yyyy-MM-dd HH:mm');
  } catch {
    return '';
  }
};

/**
 * 상대적 시간 표시 (예: "2시간 전")
 */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: ko });
  } catch {
    return '';
  }
};

/**
 * 오늘 날짜인지 확인
 */
export const isToday = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return false;
    
    const today = new Date();
    return (
      dateObj.getFullYear() === today.getFullYear() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
};

/**
 * 날짜 범위 확인 (시작일과 종료일 사이인지)
 */
export const isDateInRange = (
  date: string | Date,
  startDate: string | Date,
  endDate: string | Date
): boolean => {
  try {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    if (!isValid(targetDate) || !isValid(start) || !isValid(end)) return false;
    
    return targetDate >= startOfDay(start) && targetDate <= endOfDay(end);
  } catch {
    return false;
  }
};

/**
 * 현재 시간을 ISO 문자열로 반환
 */
export const getCurrentISOString = (): string => {
  return new Date().toISOString();
};

/**
 * 날짜 문자열을 Date 객체로 안전하게 변환
 */
export const safeParseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}; 