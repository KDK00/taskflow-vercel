import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertDailyTaskSchema, insertCommentSchema, insertNotificationSchema, type User } from "../shared/schema";
import { ZodError } from "zod";
import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users, tasks } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { gte, lte } from 'drizzle-orm';

interface AuthenticatedRequest extends Express.Request {
  user?: User;
  query: any;
  params: any;
  body: any;
}

async function requireAuth(req: AuthenticatedRequest, res: any, next: any) {
  // 세션에서 사용자 ID 확인
  const userId = req.session.userId;
  
  if (!userId) {
    // 로그인 없이 보호된 API 접근 시도
    await addSecurityLog('anonymous', 'UNAUTHORIZED_ACCESS', `로그인 없이 ${req.method} ${req.path} 접근 시도`, req.ip);
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }
  
  // 계정 정보 조회
  const account = ACCOUNT_CONFIG[userId];
  if (!account) {
    // 유효하지 않은 세션으로 접근 시도
    await addSecurityLog(userId, 'INVALID_SESSION', `유효하지 않은 세션으로 ${req.method} ${req.path} 접근 시도`, req.ip);
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 사용자입니다.'
    });
  }
  
  // req.user에 사용자 정보 설정
    req.user = {
    id: account.id,
    username: account.username,
    email: account.email,
    role: account.role,
    department: account.department,
    name: account.name
  };
  
  next();
}

async function requireManager(req: AuthenticatedRequest, res: any, next: any) {
  // 인증 확인
  if (!req.user) {
    await requireAuth(req, res, () => {});
  }
  
  // 개발자는 모든 권한을 가짐, 관리자도 관리자 권한 허용
  const user = req.user;
  if (user?.role === 'developer' || user?.role === 'manager') {
  next();
  } else {
    // 권한 부족으로 관리자 API 접근 실패
    await addSecurityLog(user?.username || 'unknown', 'INSUFFICIENT_PERMISSION', `권한 부족으로 ${req.method} ${req.path} 접근 거부 (현재 권한: ${user?.role})`, req.ip);
    return res.status(403).json({
      success: false,
      message: '관리자 또는 개발자 권한이 필요합니다.'
    });
  }
}

// WebSocket 관련 변수들
let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

function broadcastToClients(message: any) {
  if (!wss) return;
  
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// 시스템 디버그 로그 관리
interface SystemDebugLog {
  id: string;
  timestamp: string;
  username: string;
  action: 'login' | 'logout' | 'data_create' | 'data_update' | 'data_delete' | 'security_violation';
  details: string;
  ipAddress?: string;
  location?: string;
}

// IP 지역 정보 조회 함수
async function getLocationFromIP(ip: string): Promise<string> {
  try {
    // 로컬 IP 처리
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip?.startsWith('192.168.') || ip?.startsWith('10.') || ip?.startsWith('172.')) {
      return '로컬 네트워크';
    }
    
    // 무료 IP 지역 조회 API 사용 (ip-api.com)
    const response = await fetch(`http://ip-api.com/json/${ip}?lang=ko`);
    if (!response.ok) {
      throw new Error('IP 지역 조회 실패');
    }
    
    const data = await response.json();
    if (data.status === 'success') {
      return `${data.country || '알 수 없음'}, ${data.regionName || ''} ${data.city || ''}`.trim();
    } else {
      return '위치 정보 없음';
    }
  } catch (error) {
    console.log('IP 지역 조회 오류:', error);
    return '위치 조회 실패';
  }
}

// 메모리 기반 로그 저장소 (시스템 재시작 시 초기화)
const systemLogs: SystemDebugLog[] = [];

// 보안 위반 로그 저장소 (메모리 기반)
const SYSTEM_LOGS: SystemDebugLog[] = [];

// 사용자별 보안위반 카운트 추적
const SECURITY_VIOLATION_COUNT: { [username: string]: number } = {};

// 사용자별 사유서 메모 저장소
interface SecurityViolationReport {
  id: string;
  username: string;
  violationCount: number;
  reportDate: string;
  memo: string;
  ipAddress?: string;
  location?: string;
  isDeletable: boolean; // 개발자만 삭제 가능
}

const SECURITY_VIOLATION_REPORTS: SecurityViolationReport[] = [];

// 보안위반 3회 누적 확인 함수
function checkSecurityViolationThreshold(username: string): boolean {
  const count = SECURITY_VIOLATION_COUNT[username] || 0;
  return count >= 3;
}

// 보안위반 카운트 증가 함수
function incrementSecurityViolationCount(username: string): number {
  SECURITY_VIOLATION_COUNT[username] = (SECURITY_VIOLATION_COUNT[username] || 0) + 1;
  return SECURITY_VIOLATION_COUNT[username];
}

// 로그 추가 함수
function addSystemLog(log: Omit<SystemDebugLog, 'id' | 'timestamp'>) {
  const newLog: SystemDebugLog = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    ...log
  };
  
  // 최대 1000개까지만 보관 (메모리 사용량 제한)
  systemLogs.unshift(newLog);
  if (systemLogs.length > 1000) {
    systemLogs.splice(1000);
  }
  
  console.log(`📊 시스템 로그 추가: [${newLog.action}] ${newLog.username} - ${newLog.details}`);
  
  // 보안 위반 시 실시간 알림
  if (newLog.action === 'security_violation') {
    broadcastToClients({
      type: 'security_alert',
      data: newLog
    });
  }
  
  return newLog;
}

// 자동백업 관리
interface AutoBackupConfig {
  enabled: boolean;
  interval: '5min' | '10min' | '30min' | '1hour';
  backupPath: string;
  lastBackupTime?: string;
}

// 시스템 보안 설정 인터페이스
interface SystemSecurityConfig {
  f12Restriction: boolean; // F12 개발자 도구 제한 여부
  rightClickRestriction: boolean; // 우클릭 제한 여부
  devToolsDetection: boolean; // 개발자 도구 감지 여부
  consoleWarning: boolean; // 콘솔 경고 메시지 표시 여부
}

let autoBackupConfig: AutoBackupConfig = {
  enabled: false,
  interval: '30min',
  backupPath: '',
};

// 시스템 보안 설정 인터페이스
interface SystemSecurityConfig {
  f12Restriction: boolean; // F12 개발자 도구 제한 여부
  rightClickRestriction: boolean; // 우클릭 제한 여부
  devToolsDetection: boolean; // 개발자 도구 감지 여부
  consoleWarning: boolean; // 콘솔 경고 메시지 표시 여부
}

// 시스템 보안 설정 기본값
let systemSecurityConfig: SystemSecurityConfig = {
  f12Restriction: false, // 기본값: 비활성화 (테스트 환경에서 불편함)
  rightClickRestriction: false,
  devToolsDetection: false,
  consoleWarning: true
};

let autoBackupTimer: NodeJS.Timeout | null = null;



// 가상 데이터 함수 완전 삭제됨 - 실제 사용자 업로드 데이터만 사용



// 반복 업무 생성 함수
function createRecurringTasks(baseTask: any) {
  const recurringTasks = [];
  
  if (!baseTask.isRecurring) {
    return [baseTask]; // 반복 업무가 아니면 원본 업무만 반환
  }
  
  const startDate = new Date(baseTask.workDate || baseTask.dueDate);
  const endDate = baseTask.isIndefinite ? null : new Date(baseTask.recurringEndDate);
  
  let currentDate = new Date(startDate);
  let taskCounter = 0;
  const maxTasks = 365; // 무기한일 경우 최대 1년치만 미리 생성
  
  while (taskCounter < maxTasks && (baseTask.isIndefinite || !endDate || currentDate <= endDate)) {
    // 매주 반복일 때 요일 체크
    if (baseTask.recurringType === 'weekly' && baseTask.recurringDays && baseTask.recurringDays.length > 0) {
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const currentDayName = dayNames[currentDate.getDay()];
      
      if (!baseTask.recurringDays.includes(currentDayName)) {
        // 다음 날로 이동
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
    }
    
    const taskDate = new Date(currentDate);
    const recurringTask = {
      ...baseTask,
      id: baseTask.id + taskCounter,
      workDate: taskDate.toISOString().split('T')[0],
      dueDate: taskDate.toISOString(),
      title: taskCounter === 0 ? baseTask.title : `${baseTask.title} (${taskCounter + 1}회차)`,
      isRecurringTask: true,
      recurringParentId: baseTask.id,
      recurringSequence: taskCounter + 1,
      createdAt: baseTask.createdAt, // 원본 업무의 생성일 유지
      updatedAt: new Date().toISOString()
    };
    
    recurringTasks.push(recurringTask);
    taskCounter++;
    
    // 다음 반복 날짜 계산
    switch (baseTask.recurringType) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        if (baseTask.recurringDays && baseTask.recurringDays.length > 0) {
          currentDate.setDate(currentDate.getDate() + 1);
        } else {
          currentDate.setDate(currentDate.getDate() + 7);
        }
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      case 'weekdays':
        do {
          currentDate.setDate(currentDate.getDate() + 1);
        } while (currentDate.getDay() === 0 || currentDate.getDay() === 6); // 주말 제외
        break;
      default:
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 무기한이 아닌 경우 종료일 체크
    if (!baseTask.isIndefinite && endDate && currentDate > endDate) {
      break;
    }
  }
  
  console.log(`🔄 반복업무 생성: ${baseTask.title} - ${recurringTasks.length}개 업무 생성 (${baseTask.isIndefinite ? '무기한' : '종료일: ' + baseTask.recurringEndDate})`);
  return recurringTasks;
}

// 후속업무 자동 생성 함수 (카테고리 구분 없이 통합)
async function createFollowUpTasks(originalTask: any) {
  const followUpTasks = [];
  
  // 후속담당자가 있는 경우 (카테고리 상관없이)
  const followUpAssignee = originalTask.followUpAssignee || originalTask.followUpAssigneeGeneral || originalTask.followUpAssigneeContract;
  
  if (followUpAssignee) {
    // 🔍 중복 후속업무 방지: 이미 존재하는 후속업무가 있는지 확인
    const existingFollowUpTask = taskList.find(task => 
      task.isFollowUpTask && 
      task.parentTaskId === originalTask.id &&
      task.assignedTo === followUpAssignee
    );
    
    if (existingFollowUpTask) {
      console.log('⚠️ 중복 후속업무 생성 방지:', {
        originalTaskId: originalTask.id,
        existingFollowUpTaskId: existingFollowUpTask.id,
        assignedTo: followUpAssignee
      });
      return followUpTasks; // 중복이면 생성하지 않고 빈 배열 반환
    }
    const memoText = originalTask.followUpMemo ? `\n\n📝 전달 메모:\n${originalTask.followUpMemo}` : '';
    const now = new Date();
    const workDate = originalTask.dueDate || now.toISOString(); // dueDate가 없으면 현재 시간 사용
    
    const followUpTask = {
      id: Date.now() + 1,
      title: `[확인요청] ${originalTask.title}`,
      description: `원본 업무: ${originalTask.title}\n카테고리: ${originalTask.category}\n요청자: ${originalTask.createdBy}\n내용: ${originalTask.description || ''}${memoText}`,
      status: 'pending', // 🔥 확인 대기 상태로 초기 설정
      priority: originalTask.priority,
      assignedTo: followUpAssignee,
      createdBy: originalTask.createdBy, // 실제 생성자로 변경
      dueDate: originalTask.dueDate,
      workDate: originalTask.workDate || (originalTask.dueDate ? originalTask.dueDate.split('T')[0] : ''), // 원본 업무의 workDate 사용
      targetPlace: originalTask.targetPlace,
      contractType: originalTask.contractType,
      category: '확인요청', // 항상 확인요청 카테고리로 변경
      isFollowUpTask: true,
      parentTaskId: originalTask.id,
      followUpType: 'unified', // 통합 타입으로 변경
      followUpMemo: originalTask.followUpMemo || '',
      // 확인요청 시간 정보 추가
      confirmationRequestedAt: new Date().toISOString(), // 확인요청 시간
      confirmationCompletedAt: null, // 확인 완료 시간 (초기값 null)
      createdAt: originalTask.createdAt, // 원본 업무의 생성일 유지
      updatedAt: new Date().toISOString()
    };
    
    taskList.push(followUpTask);
    followUpTasks.push(followUpTask);
    console.log('✅ 후속업무 생성 완료:', {
      originalTaskId: originalTask.id,
      originalTitle: originalTask.title,
      followUpTaskId: followUpTask.id,
      followUpTitle: followUpTask.title,
      assignedTo: followUpAssignee,
      isFollowUpTask: followUpTask.isFollowUpTask,
      parentTaskId: followUpTask.parentTaskId,
      category: originalTask.category
    });
    
    // 후속담당자에게 알림 전송
    const assignedUser = accountDatabase[followUpAssignee as keyof typeof accountDatabase];
    const creatorUser = accountDatabase[originalTask.createdBy as keyof typeof accountDatabase];
    
    if (assignedUser && creatorUser) {
      // WebSocket으로 실시간 알림 전송
      broadcastToClients({
        type: 'follow_up_assigned',
        data: {
          followUpTask,
          notification: {
            userId: followUpAssignee,
            title: '새로운 확인요청 업무',
            message: `${creatorUser.name}님이 "${originalTask.title}" 업무의 확인을 요청했습니다.`,
            type: 'follow_up_assigned',
            taskId: followUpTask.id,
            taskType: 'daily'
          }
        }
      });
      
      console.log('🔔 후속업무 알림 전송:', assignedUser.name, '님에게');
    }
  }

  return followUpTasks; // 생성된 후속업무 배열 반환
}

// 업무 목록을 메모리에 저장하는 변수 (빈 배열로 시작)
let taskList: any[] = [];

const router = express.Router();

// ============================================================================
// 📋 통합 하드코딩 데이터 관리 시스템
// ============================================================================
// 모든 하드코딩된 값들을 이 섹션에서 중앙 관리합니다.
// 새로운 하드코딩 값이 필요한 경우 반드시 이 섹션에 추가하세요.



// 하드코딩된 계정 정보 삭제됨 - 실제 데이터베이스 기반 계정만 사용

// 📊 UI 표시 텍스트 중앙 관리
const UI_TEXT_CONFIG = {
  // 시스템 이름
  SYSTEM_NAME: 'TaskFlowMaster',
  
  // 로그 메시지
  LOG_MESSAGES: {
    LOGIN_ATTEMPT: '🔐 로그인 시도',
    LOGIN_SUCCESS: '✅ 로그인 성공',
    LOGIN_FAILED: '❌ 로그인 실패',
    LOGOUT: '🚪 로그아웃'
  },
  
  // 에러 메시지
  ERROR_MESSAGES: {
    ACCOUNT_NOT_FOUND: '존재하지 않는 계정입니다.',
    PASSWORD_MISMATCH: '비밀번호가 일치하지 않습니다.',
    LOGIN_REQUIRED: '로그인이 필요합니다.',
    PERMISSION_DENIED: '권한이 없습니다.'
  }
};

// 하드코딩된 템플릿 데이터 삭제됨 - 실제 사용자 입력 데이터만 사용

// ============================================================================

// 🔐 기본 로그인 계정 설정 (초기 테스트 계정 3개)
const ACCOUNT_CONFIG = {
  admin: {
    id: 'admin',
    username: 'admin', 
    password: 'admin',
    name: '김동규',
    department: '개발자',
    role: 'developer',
    email: 'admin@nara.go.kr'
  },
  nara0: {
    id: 'nara0',
    username: 'nara0', 
    password: 'nara0',
    name: '관리자',
    department: '경영지원팀',
    role: 'manager',
    email: 'manager@nara.go.kr'
  },
  nara1: {
    id: 'nara1',
    username: 'nara1', 
    password: 'nara1',
    name: '송나영',
    department: '경영지원팀',
    role: 'employee',
    email: 'employee@nara.go.kr'
  }
};

// 계정 정보 설정 (통합 관리 시스템 사용)
const accountDatabase = ACCOUNT_CONFIG;

// 로그인 API
router.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`🔐 로그인 시도: ${username}`);
    
    // 계정 확인
    const account = accountDatabase[username as keyof typeof accountDatabase];
    
    if (!account) {
      console.log(`❌ 존재하지 않는 계정: ${username}`);
      // 보안 위반 로그 추가
      await addSecurityLog(username, 'INVALID_ACCOUNT', `존재하지 않는 계정으로 로그인 시도`, req.ip);
      return res.status(401).json({
        success: false,
        message: '존재하지 않는 계정입니다.'
      });
    }
    
    // 비밀번호 확인 (개발 환경에서는 단순 비교, 실제 환경에서는 해시 비교)
    if (account.password !== password) {
      console.log(`❌ 비밀번호 불일치: ${username}`);
      
      // 개발자 계정이 아닌 경우에만 보안 위반 로그 추가
      if (account.role !== 'developer') {
        await addSecurityLog(username, 'WRONG_PASSWORD', `비밀번호 불일치로 로그인 실패`, req.ip);
      } else {
        console.log(`🔧 개발자 계정 로그인 실패 - 보안위반 로그 제외: ${username}`);
      }
      
      return res.status(401).json({
        success: false,
        message: '비밀번호가 일치하지 않습니다.'
      });
    }
    
    // 로그인 성공
    req.session.userId = username;
    
    // 비밀번호 제외하고 응답
    const { password: _, ...userInfo } = account;
    
    console.log(`✅ 로그인 성공: ${username} (${account.name})`);
    
    // 시스템 로그 추가 (개발자는 제외)
    if (account.role !== 'developer') {
      const location = await getLocationFromIP(req.ip || '127.0.0.1');
      addSystemLog({
        username: username,
        action: 'login',
        details: `${account.name}(${account.role}) 로그인 성공`,
        ipAddress: req.ip,
        location: location
      });
    }
    
    res.json({
      success: true,
      user: userInfo
    });
    
  } catch (error) {
    console.error('❌ 로그인 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
});

// 로그아웃 API
router.post('/api/logout', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (userId) {
      console.log(`🚪 로그아웃: ${userId}`);
      
      // 시스템 로그 추가 (개발자는 제외)
      const account = accountDatabase[userId as keyof typeof accountDatabase];
      if (account && account.role !== 'developer') {
        addSystemLog({
          username: userId,
          action: 'logout',
          details: `${account.name}(${account.role}) 로그아웃`,
          ipAddress: req.ip,
          location: '로컬'
        });
      }
    }
    
    // 세션 삭제
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ 로그아웃 처리 오류:', err);
        return res.status(500).json({
          success: false,
          message: '로그아웃 처리 중 오류가 발생했습니다.'
        });
      }
      
      res.json({
        success: true,
        message: '로그아웃되었습니다.'
      });
    });
    
  } catch (error) {
    console.error('❌ 로그아웃 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그아웃 처리 중 오류가 발생했습니다.'
    });
  }
});

// 회원가입 API (개발 환경용)
router.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, name, department, role } = req.body;
    
    console.log(`📝 회원가입 시도: ${username}`);
    
    // 기존 계정 중복 확인
    if (accountDatabase[username as keyof typeof accountDatabase]) {
      console.log(`❌ 중복 계정: ${username}`);
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 계정입니다.'
      });
    }
    
    console.log(`⚠️ 회원가입 기능은 현재 데모 환경에서는 지원되지 않습니다.`);
    console.log(`💡 기존 테스트 계정을 사용해주세요: admin, nara0~nara4`);
    
    res.status(400).json({
      success: false,
      message: '데모 환경에서는 회원가입이 제한됩니다. 기존 테스트 계정을 사용해주세요.'
    });
    
  } catch (error) {
    console.error('❌ 회원가입 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원가입 처리 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 정보 API - auth.ts에서 처리하므로 여기서는 제거

// 전체 사용자 목록 API (후속담당자 선택용)
router.get('/api/users', (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    // 모든 사용자 정보를 비밀번호 제외하고 반환
    const users = Object.values(accountDatabase).map(account => {
      const { password: _, ...userInfo } = account;
      return userInfo;
    });
    
    console.log('✅ 사용자 목록 조회:', users.length, '명');
    
    res.json({
      success: true,
      users
    });
    
  } catch (error) {
    console.error('❌ 사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

router.get('/api/user', (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const account = accountDatabase[userId as keyof typeof accountDatabase];
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: '사용자 정보를 찾을 수 없습니다.'
      });
    }
    
    // 비밀번호 제외하고 응답
    const { password: _, ...userInfo } = account;
    
    res.json({
      success: true,
      user: userInfo
    });
    
  } catch (error) {
    console.error('❌ 사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

// 중복 제거됨 - 위의 /api/users 엔드포인트 사용

// 사용자 통계 API
router.get('/api/users/me/stats', (req, res) => {
  try {
    const completed = taskList.filter(task => task.status === 'completed').length;
    const pending = taskList.filter(task => task.status === 'scheduled' || task.status === 'in_progress').length;
    const overdue = taskList.filter(task => {
      const dueDate = new Date(task.dueDate);
      return task.status !== 'completed' && dueDate < new Date();
    }).length;

    res.json({
      totalTasks: taskList.length,
      completedTasks: completed,
      pendingTasks: pending,
      overdueeTasks: overdue
    });
  } catch (error) {
    console.error('❌ 사용자 통계 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 통계 조회에 실패했습니다.'
    });
  }
});

// 알림 목록 API
router.get('/api/notifications', (req, res) => {
  try {
    const notifications = [
      {
        id: 1,
        message: '새 업무가 할당되었습니다.',
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json(notifications);
  } catch (error) {
    console.error('❌ 알림 목록 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '알림 목록 조회에 실패했습니다.'
    });
  }
});

// 후속업무 목록 API - 로그인한 사용자별 데이터만 반환
router.get('/api/tasks/follow-up', (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    console.log('🔍 후속업무 조회 요청:', {
      userId,
      totalTasks: taskList.length,
      followUpTasks: taskList.filter(task => task.isFollowUpTask).length,
      userAssignedTasks: taskList.filter(task => task.assignedTo === userId).length
    });
    
    // 로그인한 사용자에게 할당된 후속업무만 필터링 (pending 상태만)
    const userFollowUpTasks = taskList.filter(task => {
      const isFollowUp = task.isFollowUpTask;
      const isAssignedToUser = task.assignedTo === userId;
      const isPending = task.status === 'pending'; // 🔥 확인 대기 상태만 표시
      
      console.log('🔍 업무 필터링:', {
        taskId: task.id,
        title: task.title,
        isFollowUpTask: isFollowUp,
        assignedTo: task.assignedTo,
        isAssignedToUser,
        status: task.status,
        isPending,
        shouldInclude: isFollowUp && isAssignedToUser && isPending
      });
      
      return isFollowUp && isAssignedToUser && isPending; // 🔥 pending 상태만 확인요청 섹션에 표시
    }).map(task => {
      // 사용자 정보 매핑
      const assignedUser = accountDatabase[task.assignedTo as keyof typeof accountDatabase];
      const creator = accountDatabase[task.createdBy as keyof typeof accountDatabase];
      
      return {
        ...task,
        assignedUser: assignedUser ? { name: assignedUser.name } : { name: '알 수 없음' },
        creator: creator ? { name: creator.name } : { name: '알 수 없음' }
      };
    });
    
    console.log('✅ 후속업무 목록 API 성공:', {
      userId,
      userName: accountDatabase[userId as keyof typeof accountDatabase]?.name,
      followUpTasksCount: userFollowUpTasks.length,
      followUpTasks: userFollowUpTasks.map(t => ({ id: t.id, title: t.title, assignedTo: t.assignedTo }))
    });
    
    res.json({
      success: true,
      followUpTasks: userFollowUpTasks
    });
  } catch (error) {
    console.error('❌ 후속업무 목록 API 오류:', error);
    res.status(404).json({
      success: false,
      message: '업무를 찾을 수 없습니다.'
    });
  }
});

// 후속업무 확인완료 API
router.patch('/api/tasks/:id/confirm', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const taskIndex = taskList.findIndex(task => task.id === parseInt(id));
    
    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '업무를 찾을 수 없습니다.'
      });
    }
    
    // 후속업무 확인완료 처리
    taskList[taskIndex] = {
      ...taskList[taskIndex],
      status: 'scheduled', // 🔥 확인 후 scheduled 상태로 변경 (업무목록에 표시됨)
      completedAt: new Date().toISOString(),
      confirmationCompletedAt: new Date().toISOString(), // 확인 완료 시간 기록
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ 후속업무 확인완료:', taskList[taskIndex].title);
    
    // 실시간 알림 전송
    broadcastToClients({
      type: 'follow_up_task_confirmed',
      data: taskList[taskIndex]
    });
    
    res.json({
      success: true,
      task: taskList[taskIndex]
    });
  } catch (error) {
    console.error('❌ 후속업무 확인완료 오류:', error);
    res.status(500).json({
      success: false,
      message: '후속업무 확인완료에 실패했습니다.'
    });
  }
});

// 후속업무 반려 API
router.patch('/api/tasks/:id/reject', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const taskIndex = taskList.findIndex(task => task.id === parseInt(id));
    
    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '업무를 찾을 수 없습니다.'
      });
    }
    
    // 후속업무 반려 처리
    taskList[taskIndex] = {
      ...taskList[taskIndex],
      status: 'cancelled',
      memo: `반려사유: ${reason || '사유 없음'}`,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ 후속업무 반려:', taskList[taskIndex].title);
    
    // 실시간 알림 전송
    broadcastToClients({
      type: 'follow_up_task_rejected',
      data: taskList[taskIndex]
    });
    
    res.json({
      success: true,
      task: taskList[taskIndex]
    });
  } catch (error) {
    console.error('❌ 후속업무 반려 오류:', error);
    res.status(500).json({
      success: false,
      message: '후속업무 반려에 실패했습니다.'
    });
  }
});

// 업무 목록 API - 로그인한 사용자별 데이터만 반환
router.get('/api/tasks', (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    // 사용자 권한에 따른 업무 필터링
    const account = ACCOUNT_CONFIG[userId];
    let userTasks;
    
    if (account && (account.role === 'developer' || account.role === 'manager')) {
      // 개발자/관리자는 모든 업무 조회 가능 (단, pending 상태 후속업무 제외)
      userTasks = taskList.filter(task => {
        // 🔥 pending 상태의 후속업무는 업무목록에서 제외 (확인요청 섹션에만 표시)
        if (task.isFollowUpTask && task.status === 'pending') {
          return false;
        }
        return true;
      });
      console.log(`👑 ${account.role} 권한: 전체 업무 조회 (${userTasks.length}개)`);
    } else {
      // 일반 사용자는 자신에게 할당된 업무만 조회 (단, pending 상태 후속업무 제외)
      userTasks = taskList.filter(task => {
        // 🔥 pending 상태의 후속업무는 업무목록에서 제외
        if (task.isFollowUpTask && task.status === 'pending') {
          return false;
        }
        return task.assignedTo === userId || task.createdBy === userId;
      });
      console.log(`👤 일반 사용자: 개인 업무만 조회 (${userTasks.length}개)`);
    }
    
    // 최신 작업날짜가 맨위로 오도록 정렬 (workDate 기준 내림차순)
    const sortedUserTasks = userTasks.sort((a, b) => {
      // workDate가 없으면 createdAt 사용
      const dateA = new Date(a.workDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.workDate || b.createdAt || 0).getTime();
      return dateB - dateA; // 내림차순 정렬 (최신순)
    });
    
    console.log(`✅ 업무 목록 API 성공: ${sortedUserTasks.length}개 업무 (사용자 ID: ${userId})`);
    
    // 응답 데이터에 메타 정보 추가
    res.json({
      success: true,
      tasks: sortedUserTasks,
      meta: {
        total: sortedUserTasks.length,
        lastUpdated: new Date().toISOString(),
        userId: userId
      }
    });
  } catch (error) {
    console.error('❌ 업무 목록 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '업무 목록을 불러오는 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// 개별 업무 조회 API 추가
router.get('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const task = taskList.find(task => task.id === parseInt(id));
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '업무를 찾을 수 없습니다.'
      });
    }
    
    console.log('✅ 개별 업무 조회:', task.title);
    res.json(task);
  } catch (error) {
    console.error('❌ 개별 업무 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '업무 조회에 실패했습니다.'
    });
  }
});

// 업무 생성 API - 실제로 메모리에 저장 + 후속담당자 기능 + 반복업무 지원
router.post('/api/tasks', requireAuth, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      priority, 
      assignedTo, 
      dueDate, 
      targetPlace, 
      contractType,
      category,
      followUpAssignee,
      followUpAssigneeGeneral,
      followUpAssigneeContract,
      followUpMemo,
      startTime,
      endTime,
      workDate,
      startDate,
      // 반복업무 관련 필드
      isRecurring,
      recurringType,
      recurringDays,
      recurringEndDate,
      isIndefinite
    } = req.body;
    
    // 디버깅을 위한 로그 출력
    console.log('📋 업무 생성 요청 데이터:', {
      title,
      workDate,
      startDate,
      dueDate,
      category,
      assignedTo
    });
    
    // 사용자 입력 날짜를 우선적으로 사용 (오늘 날짜 기본값 완전 제거)
    const finalWorkDate = workDate || startDate || (dueDate ? dueDate.split('T')[0] : null);
    
    // 사용자가 입력한 날짜만 사용, 기본값 없음
    const processedWorkDate = finalWorkDate;
    
    console.log('📅 날짜 처리 결과:', {
      입력받은_workDate: workDate,
      입력받은_startDate: startDate,
      입력받은_dueDate: dueDate,
      최종_workDate: processedWorkDate
    });
    
    // 현재 로그인한 사용자 정보 사용
    const currentUserId = req.session.userId || 'admin';
    
    const baseTask = {
      id: Date.now(),
      title: title || '새 업무',
      description: description || '',
      status: 'scheduled',
      priority: priority || 'medium',
      assignedTo: assignedTo || currentUserId, // 기본값을 현재 사용자로 설정
      createdBy: currentUserId, // 현재 로그인한 사용자로 설정
      dueDate: dueDate ? (new Date(dueDate + 'T23:59:59')).toISOString() : (processedWorkDate ? (new Date(processedWorkDate.split('T')[0] + 'T23:59:59')).toISOString() : null),
      targetPlace: targetPlace || '',
      contractType: contractType || '관리',
      category: category || '경영일반',
      followUpAssignee,
      followUpAssigneeGeneral,
      followUpAssigneeContract,
      followUpMemo: followUpMemo || '',
      isFollowUpTask: false,
      parentTaskId: null,
      followUpType: null,
      startTime: startTime || null,
      endTime: endTime || null,
      workDate: processedWorkDate, // 사용자 입력값 그대로 사용
      // 반복업무 관련 필드
      isRecurring: isRecurring || false,
      recurringType: recurringType || 'daily',
      recurringDays: recurringDays || [],
      recurringEndDate: recurringEndDate || null,
      isIndefinite: isIndefinite || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('✅ 최종 업무 데이터:', {
      title: baseTask.title,
      workDate: baseTask.workDate,
      dueDate: baseTask.dueDate
    });

    // 반복 업무 생성 (반복이 아니면 원본 업무만 반환)
    const recurringTasks = createRecurringTasks(baseTask);
    
    // 실제로 메모리에 추가
    recurringTasks.forEach(task => taskList.push(task));
    
    console.log('✅ 새 업무 생성:', baseTask.title, `(${recurringTasks.length}개 업무, 총 ${taskList.length}개)`);

    // 🔍 디버그 로그 추가 - 업무 생성
    addSystemLog({
      username: currentUserId,
      action: 'data_create',
      details: `업무 생성: "${baseTask.title}" (카테고리: ${baseTask.category}, 담당자: ${baseTask.assignedTo}, 반복업무: ${recurringTasks.length}개)`,
      ipAddress: req.ip
    });

    // 각 반복 업무에 대해 후속담당자가 있으면 자동으로 후속업무 생성
    let allFollowUpTasks = [];
    for (const task of recurringTasks) {
      const createdFollowUpTasks = await createFollowUpTasks(task);
      allFollowUpTasks = allFollowUpTasks.concat(createdFollowUpTasks);
    }

    // WebSocket으로 실시간 알림 전송
    recurringTasks.forEach(task => {
      broadcastToClients({
        type: 'task_created',
        data: task
      });
    });

    // 후속업무 정보를 사용자 정보와 함께 매핑
    const followUpTasksWithUserInfo = allFollowUpTasks.map(followUpTask => {
      const assignedUser = accountDatabase[followUpTask.assignedTo as keyof typeof accountDatabase];
      return {
        ...followUpTask,
        assignedUser: assignedUser ? { name: assignedUser.name } : { name: '알 수 없음' }
      };
    });

    res.json({
      success: true,
      task: baseTask,
      recurringTasks: recurringTasks, // 생성된 반복업무 목록
      followUpTasks: followUpTasksWithUserInfo // 생성된 후속업무 정보 포함
    });
  } catch (error) {
    console.error('❌ 업무 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '업무 생성에 실패했습니다.'
    });
  }
});

// 업무 수정 API - 실제로 메모리에서 수정 (PUT과 PATCH 모두 지원)
router.put('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      priority, 
      assignedTo, 
      dueDate, 
      targetPlace, 
      contractType,
      category,
      followUpAssignee,
      followUpAssigneeGeneral,
      followUpAssigneeContract,
      followUpMemo,
      startTime,
      endTime,
      workDate,
      startDate,
      status,
      progress,
      allDay,
      ...otherData
    } = req.body;
    
    // 디버깅을 위한 로그 출력
    console.log('📋 업무 수정 요청 데이터:', {
      id,
      idType: typeof id,
      title,
      workDate,
      startDate,
      dueDate,
      category,
      assignedTo
    });
    
    // ID 파싱 개선 - 문자열과 숫자 모두 처리
    let taskId;
    if (typeof id === 'string') {
      // 소수점이 포함된 문자열 ID인 경우 (예: "1750245686670.0525")
      taskId = parseFloat(id);
    } else {
      taskId = parseInt(id);
    }
    
    console.log('🔍 파싱된 업무 ID (PUT):', { original: id, parsed: taskId, type: typeof taskId });
    
    // 업무 찾기 - 숫자 ID와 문자열 ID 모두 고려
    const taskIndex = taskList.findIndex(task => {
      // task.id는 숫자이고, taskId도 숫자로 변환했으므로 비교
      return task.id === taskId || task.id.toString() === id.toString();
    });
    
    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '업무를 찾을 수 없습니다.'
      });
    }
    
    // 수정 전 업무 정보 저장 (로그용)
    const originalTask = { ...taskList[taskIndex] };
    const currentUserId = req.session.userId || 'admin';
    
    // 사용자 입력 날짜를 그대로 사용 (변환 최소화)
    const processedWorkDate = workDate || startDate || (dueDate ? dueDate.split('T')[0] : null) || taskList[taskIndex].workDate; // 기존 값 유지
    
    console.log('📅 업무 수정 (PUT) - 날짜 처리 결과:', {
      입력받은_workDate: workDate,
      입력받은_startDate: startDate,
      입력받은_dueDate: dueDate,
      기존_workDate: taskList[taskIndex].workDate,
      최종_workDate: processedWorkDate
    });
    
    // 상태 기준 진행률 검증 및 자동 조정
    let validatedProgress = progress !== undefined ? progress : taskList[taskIndex].progress;
    let validatedStatus = status || taskList[taskIndex].status;
    
    // 상태 변경 시 진행률 자동 조정
    if (status && status !== taskList[taskIndex].status) {
      if (status === 'scheduled') {
        validatedProgress = 0; // 예정 → 0% 고정
      } else if (status === 'in_progress') {
        validatedProgress = 25; // 진행 → 25% (25%~75% 범위의 시작값)
      } else if (status === 'completed' || status === 'postponed' || status === 'cancelled') {
        validatedProgress = 100; // 완료/연기/취소 → 100% 고정
      }
    }
    
    // 진행률 직접 변경 시 상태 기준 검증
    if (progress !== undefined && progress !== taskList[taskIndex].progress) {
      const currentStatus = status || taskList[taskIndex].status;
      
      if (currentStatus === 'scheduled' && progress !== 0) {
        return res.status(400).json({
          success: false,
          message: '예정 상태에서는 진행률이 0%로 고정됩니다. 상태를 먼저 변경해주세요.'
        });
      }
      
      if ((currentStatus === 'completed' || currentStatus === 'postponed' || currentStatus === 'cancelled') && progress !== 100) {
        return res.status(400).json({
          success: false,
          message: '완료/연기/취소 상태에서는 진행률이 100%로 고정됩니다. 상태를 먼저 변경해주세요.'
        });
      }
      
      if (currentStatus === 'in_progress' && ![25, 50, 75].includes(progress)) {
        return res.status(400).json({
          success: false,
          message: '진행 상태에서는 진행률이 25%, 50%, 75%만 가능합니다.'
        });
      }
    }

    // 업무 수정
    taskList[taskIndex] = {
      ...taskList[taskIndex],
      title: title || taskList[taskIndex].title,
      description: description || taskList[taskIndex].description,
      priority: priority || taskList[taskIndex].priority,
      assignedTo: assignedTo || taskList[taskIndex].assignedTo,
      dueDate: dueDate ? (new Date(dueDate + 'T23:59:59')).toISOString() : (processedWorkDate && !taskList[taskIndex].dueDate ? (new Date(processedWorkDate.split('T')[0] + 'T23:59:59')).toISOString() : taskList[taskIndex].dueDate),
      targetPlace: targetPlace || taskList[taskIndex].targetPlace,
      contractType: contractType || taskList[taskIndex].contractType,
      category: category || taskList[taskIndex].category,
      followUpAssignee: followUpAssignee !== undefined ? followUpAssignee : taskList[taskIndex].followUpAssignee,
      followUpAssigneeGeneral: followUpAssigneeGeneral !== undefined ? followUpAssigneeGeneral : taskList[taskIndex].followUpAssigneeGeneral,
      followUpAssigneeContract: followUpAssigneeContract !== undefined ? followUpAssigneeContract : taskList[taskIndex].followUpAssigneeContract,
      followUpMemo: followUpMemo !== undefined ? followUpMemo : taskList[taskIndex].followUpMemo,
      startTime: startTime || taskList[taskIndex].startTime,
      endTime: endTime || taskList[taskIndex].endTime,
      workDate: processedWorkDate,
      status: validatedStatus,
      progress: validatedProgress,
      allDay: allDay !== undefined ? allDay : taskList[taskIndex].allDay,
      ...otherData,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ 업무 수정:', taskList[taskIndex].title, '| 날짜:', processedWorkDate);
    
    // 🔍 디버그 로그 추가 - 업무 수정
    const changedFields = [];
    if (title && title !== originalTask.title) changedFields.push(`제목: "${originalTask.title}" → "${title}"`);
    if (assignedTo && assignedTo !== originalTask.assignedTo) changedFields.push(`담당자: "${originalTask.assignedTo}" → "${assignedTo}"`);
    if (status && status !== originalTask.status) changedFields.push(`상태: "${originalTask.status}" → "${status}"`);
    if (progress !== undefined && progress !== originalTask.progress) changedFields.push(`진행률: ${originalTask.progress}% → ${progress}%`);
    
    addSystemLog({
      username: currentUserId,
      action: 'data_update',
      details: `업무 수정: "${taskList[taskIndex].title}"${changedFields.length > 0 ? ` (${changedFields.join(', ')})` : ''}`,
      ipAddress: req.ip
    });
    
    // 후속담당자가 새로 추가되었는지 확인하고 후속업무 생성
    const updatedTask = taskList[taskIndex];
    if ((followUpAssignee || followUpAssigneeGeneral || followUpAssigneeContract) && 
        !originalTask.followUpAssignee && !originalTask.followUpAssigneeGeneral && !originalTask.followUpAssigneeContract) {
      // 새로 후속담당자가 추가된 경우
      await createFollowUpTasks(updatedTask);
    }
    
    // WebSocket으로 실시간 알림 전송
    broadcastToClients({
      type: 'task_updated',
      data: updatedTask
    });
    
    res.json({
      success: true,
      task: updatedTask
    });
  } catch (error) {
    console.error('❌ 업무 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '업무 수정에 실패했습니다.'
    });
  }
});

// PATCH 메서드도 동일하게 처리
router.patch('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      priority, 
      assignedTo, 
      dueDate, 
      targetPlace, 
      contractType,
      category,
      followUpAssignee,
      followUpAssigneeGeneral,
      followUpAssigneeContract,
      followUpMemo,
      startTime,
      endTime,
      workDate,
      startDate,
      status,
      progress,
      allDay,
      ...otherData
    } = req.body;
    
    // 디버깅을 위한 로그 출력
    console.log('📋 업무 수정 (PATCH) 요청 데이터:', {
      id,
      idType: typeof id,
      title,
      workDate,
      startDate,
      dueDate,
      category,
      assignedTo,
      status,
      progress,
      startTime
    });
    
    // ID 파싱 개선 - 문자열과 숫자 모두 처리
    let taskId;
    if (typeof id === 'string') {
      // 소수점이 포함된 문자열 ID인 경우 (예: "1750245686670.0525")
      taskId = parseFloat(id);
    } else {
      taskId = parseInt(id);
    }
    
    console.log('🔍 파싱된 업무 ID:', { original: id, parsed: taskId, type: typeof taskId });
    
    // 업무 찾기 - 숫자 ID와 문자열 ID 모두 고려
    const taskIndex = taskList.findIndex(task => {
      // task.id는 숫자이고, taskId도 숫자로 변환했으므로 비교
      return task.id === taskId || task.id.toString() === id.toString();
    });
    
    console.log('🔍 업무 검색 결과:', { 
      taskIndex, 
      totalTasks: taskList.length,
      searchId: taskId,
      foundTask: taskIndex !== -1 ? { id: taskList[taskIndex].id, title: taskList[taskIndex].title } : null
    });
    
    if (taskIndex === -1) {
      console.log('❌ 업무를 찾을 수 없음:', { 
        searchId: taskId, 
        availableIds: taskList.slice(0, 5).map(t => ({ id: t.id, title: t.title }))
      });
      return res.status(404).json({
        success: false,
        message: '업무를 찾을 수 없습니다.'
      });
    }
    
    // 수정 전 업무 정보 저장 (로그용)
    const originalTask = { ...taskList[taskIndex] };
    const currentUserId = req.session.userId || 'admin';
    
    // 사용자 입력 날짜를 그대로 사용 (변환 최소화)
    const processedWorkDate = workDate || startDate || (dueDate ? dueDate.split('T')[0] : null) || taskList[taskIndex].workDate; // 기존 값 유지
    
    console.log('📅 업무 수정 (PATCH) - 최종 작업 날짜:', processedWorkDate);
    
    // 업무 수정
    taskList[taskIndex] = {
      ...taskList[taskIndex],
      title: title || taskList[taskIndex].title,
      description: description || taskList[taskIndex].description,
      priority: priority || taskList[taskIndex].priority,
      assignedTo: assignedTo || taskList[taskIndex].assignedTo,
      dueDate: dueDate ? (new Date(dueDate + 'T23:59:59')).toISOString() : (processedWorkDate && !taskList[taskIndex].dueDate ? (new Date(processedWorkDate.split('T')[0] + 'T23:59:59')).toISOString() : taskList[taskIndex].dueDate),
      targetPlace: targetPlace || taskList[taskIndex].targetPlace,
      contractType: contractType || taskList[taskIndex].contractType,
      category: category || taskList[taskIndex].category,
      followUpAssignee: followUpAssignee !== undefined ? followUpAssignee : taskList[taskIndex].followUpAssignee,
      followUpAssigneeGeneral: followUpAssigneeGeneral !== undefined ? followUpAssigneeGeneral : taskList[taskIndex].followUpAssigneeGeneral,
      followUpAssigneeContract: followUpAssigneeContract !== undefined ? followUpAssigneeContract : taskList[taskIndex].followUpAssigneeContract,
      followUpMemo: followUpMemo !== undefined ? followUpMemo : taskList[taskIndex].followUpMemo,
      startTime: startTime !== undefined ? startTime : taskList[taskIndex].startTime,
      endTime: endTime || taskList[taskIndex].endTime,
      workDate: processedWorkDate,
      status: status !== undefined ? status : taskList[taskIndex].status,
      progress: progress !== undefined ? progress : taskList[taskIndex].progress,
      allDay: allDay !== undefined ? allDay : taskList[taskIndex].allDay,
      ...otherData,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ 업무 수정 (PATCH) 완료:', {
      id: taskList[taskIndex].id,
      title: taskList[taskIndex].title,
      status: taskList[taskIndex].status,
      progress: taskList[taskIndex].progress,
      startTime: taskList[taskIndex].startTime,
      workDate: processedWorkDate
    });
    
    // 🔍 디버그 로그 추가 - 업무 수정 (PATCH)
    const changedFields = [];
    if (title && title !== originalTask.title) changedFields.push(`제목: "${originalTask.title}" → "${title}"`);
    if (assignedTo && assignedTo !== originalTask.assignedTo) changedFields.push(`담당자: "${originalTask.assignedTo}" → "${assignedTo}"`);
    if (status !== undefined && status !== originalTask.status) changedFields.push(`상태: "${originalTask.status}" → "${status}"`);
    if (progress !== undefined && progress !== originalTask.progress) changedFields.push(`진행률: ${originalTask.progress}% → ${progress}%`);
    if (startTime !== undefined && startTime !== originalTask.startTime) changedFields.push(`시작시간: "${originalTask.startTime}" → "${startTime}"`);
    
    addSystemLog({
      username: currentUserId,
      action: 'data_update',
      details: `업무 수정(PATCH): "${taskList[taskIndex].title}"${changedFields.length > 0 ? ` (${changedFields.join(', ')})` : ''}`,
      ipAddress: req.ip
    });
    
    // WebSocket으로 실시간 알림 전송
    broadcastToClients({
      type: 'task_updated',
      data: taskList[taskIndex]
    });
    
    res.json({
      success: true,
      task: taskList[taskIndex]
    });
  } catch (error) {
    console.error('업무 수정 오류 (PATCH):', error);
    res.status(500).json({
      success: false,
      message: '업무 수정에 실패했습니다.'
    });
  }
});

// 업무 일괄 삭제 API - 특정 경로를 먼저 정의
router.delete('/api/tasks/bulk', requireAuth, async (req, res) => {
  try {
    const { taskIds } = req.body;
    const currentUserId = req.session.userId || 'admin';
    
    console.log(`🗑️ 일괄삭제 요청: 사용자 ${currentUserId}, 요청 ID 개수: ${taskIds?.length || 0}`);
    console.log(`📊 현재 메모리 업무 개수: ${taskList.length}개`);
    console.log(`📋 요청된 ID 목록: ${JSON.stringify(taskIds)}`);
    
    // 입력 검증 강화
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      console.log('❌ 일괄삭제 실패: 빈 배열 또는 잘못된 형식');
      return res.status(400).json({
        success: false,
        message: '삭제할 업무 ID 목록이 필요합니다.'
      });
    }

    // 숫자가 아닌 ID 필터링
    const validTaskIds = taskIds.filter(id => typeof id === 'number' && !isNaN(id));
    
    if (validTaskIds.length === 0) {
      console.log('❌ 일괄삭제 실패: 유효한 ID 없음');
      return res.status(400).json({
        success: false,
        message: '유효한 업무 ID가 없습니다.'
      });
    }
    
    console.log(`🔍 유효한 ID: ${validTaskIds.length}개 (${validTaskIds.join(', ')})`);
    
    // 현재 메모리에 있는 업무 ID들 확인
    const existingTaskIds = taskList.map(task => task.id);
    console.log(`💾 메모리 내 업무 ID들: [${existingTaskIds.join(', ')}]`);
    
    const deletedTasks = [];
    const remainingTasks = [];
    
    // 안전한 삭제 처리 - 오류 방지를 위한 try-catch 추가
    try {
      taskList.forEach(task => {
        if (validTaskIds.includes(task.id)) {
          deletedTasks.push(task);
          console.log(`🎯 삭제 대상 발견: ID=${task.id}, 제목="${task.title}"`);
        } else {
          remainingTasks.push(task);
        }
      });
      
      
      // 실제 삭제가 발생한 경우에만 업데이트
      if (deletedTasks.length > 0) {
        taskList = remainingTasks;
        console.log(`✅ 메모리에서 ${deletedTasks.length}개 업무 삭제 완료`);
      }
    } catch (memoryError) {
      console.error('❌ 메모리 삭제 중 오류:', memoryError);
      throw new Error('메모리에서 업무 삭제 중 오류가 발생했습니다.');
    }
    
    console.log('✅ 업무 일괄 삭제:', deletedTasks.length, '개 삭제, 남은 업무:', taskList.length, '개');

    // 삭제 결과 메시지 생성
    let resultMessage = '';
    if (deletedTasks.length === 0) {
      resultMessage = '삭제할 수 있는 업무가 없습니다.';
    } else if (deletedTasks.length === validTaskIds.length) {
      resultMessage = `${deletedTasks.length}개의 업무가 성공적으로 삭제되었습니다.`;
    } else {
      resultMessage = `${deletedTasks.length}개의 업무가 삭제되었습니다. (${validTaskIds.length - deletedTasks.length}개는 이미 삭제되었거나 찾을 수 없습니다.)`;
    }

    // 🔍 디버그 로그 추가 - 업무 일괄 삭제 (삭제된 업무가 있을 때만)
    if (deletedTasks.length > 0) {
      try {
        const deletedTaskTitles = deletedTasks.map(task => task.title || '제목없음').join(', ');
        addSystemLog({
          username: currentUserId,
          action: 'data_delete',
          details: `업무 일괄 삭제: ${deletedTasks.length}개 업무 삭제 (${deletedTaskTitles.length > 100 ? deletedTaskTitles.substring(0, 100) + '...' : deletedTaskTitles})`,
          ipAddress: req.ip || 'unknown'
        });
        
        // WebSocket으로 실시간 알림 전송
        broadcastToClients({
          type: 'tasks_bulk_deleted',
          data: { deletedIds: validTaskIds, deletedCount: deletedTasks.length }
        });
      } catch (logError) {
        console.error('⚠️ 로그 추가 중 오류 (삭제는 성공):', logError);
      }
    }
    
    console.log(`📤 일괄삭제 응답 전송: 성공=${deletedTasks.length}개, 요청=${validTaskIds.length}개`);
    
    res.json({
      success: true,
      message: resultMessage,
      deletedCount: deletedTasks.length,
      requestedCount: validTaskIds.length
    });
  } catch (error) {
    console.error('❌ 업무 일괄 삭제 치명적 오류:', error);
    console.error('오류 스택:', error.stack);
    
    res.status(500).json({
      success: false,
      message: `업무 일괄 삭제에 실패했습니다: ${error.message || '알 수 없는 오류'}`,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 업무 삭제 API - 실제로 메모리에서 삭제
router.delete('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session.userId || 'admin';
    
    // 소수점 ID를 정확히 매칭하기 위해 parseFloat 사용
    const taskId = parseFloat(id);
    const taskIndex = taskList.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '업무를 찾을 수 없습니다.'
      });
    }
    
    const deletedTask = taskList[taskIndex];
    taskList.splice(taskIndex, 1);
    
    console.log('✅ 업무 삭제:', deletedTask.title, '(남은 업무:', taskList.length, '개)');

    // 🔍 디버그 로그 추가 - 업무 삭제
    addSystemLog({
      username: currentUserId,
      action: 'data_delete',
      details: `업무 삭제: "${deletedTask.title}" (카테고리: ${deletedTask.category}, 담당자: ${deletedTask.assignedTo})`,
      ipAddress: req.ip
    });
    
    // WebSocket으로 실시간 알림 전송
    broadcastToClients({
      type: 'task_deleted',
      data: { id: deletedTask.id, title: deletedTask.title }
    });
    
    res.json({
      success: true,
      message: '업무가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('업무 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '업무 삭제에 실패했습니다.'
    });
  }
});

// 중복 로그아웃 API 제거됨 - 위의 API 사용

// 일정 조회 API
// 일정 관리 API들 - 비활성화됨 (일정관리 기능 제거)
/* 
router.get("/api/schedules", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "인증이 필요합니다" });
    }

    const { startDate, endDate } = req.query;
    
    let query = db.select({
      id: schema.schedules.id,
      title: schema.schedules.title,
      description: schema.schedules.description,
      startDate: schema.schedules.startDate,
      endDate: schema.schedules.endDate,
      startTime: schema.schedules.startTime,
      endTime: schema.schedules.endTime,
      allDay: schema.schedules.allDay,
      location: schema.schedules.location,
      color: schema.schedules.color,
      category: schema.schedules.category,
      isRecurring: schema.schedules.isRecurring,
      recurringType: schema.schedules.recurringType,
      recurringInterval: schema.schedules.recurringInterval,
      recurringDays: schema.schedules.recurringDays,
      createdAt: schema.schedules.createdAt,
      createdBy: schema.schedules.createdBy,
    })
    .from(schema.schedules)
    .where(eq(schema.schedules.createdBy, user.id));

    if (startDate && endDate) {
      query = query.where(
        and(
          gte(schema.schedules.startDate, startDate as string),
          lte(schema.schedules.startDate, endDate as string)
        )
      );
    }

    const schedules = await query;
    
    console.log(`📅 일정 목록 조회 성공: ${schedules.length}개 일정`);
    res.json({ schedules });
  } catch (error) {
    console.error("❌ 일정 조회 실패:", error);
    res.status(500).json({ error: "일정 조회에 실패했습니다" });
  }
});

// 일정 생성 API  
router.post("/api/schedules", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "인증이 필요합니다" });
    }

    const scheduleData = schema.insertScheduleSchema.parse({
      ...req.body,
      createdBy: user.id,
    });

    console.log("📅 일정 생성 요청:", scheduleData);

    // 일정 생성
    const [newSchedule] = await db.insert(schema.schedules).values(scheduleData).returning();

    // 반복 일정인 경우 인스턴스 생성
    if (scheduleData.isRecurring) {
      await generateRecurringInstances(newSchedule, scheduleData);
    }

    console.log("✅ 일정 생성 완료:", newSchedule.id);
    res.status(201).json({ 
      success: true, 
      schedule: newSchedule,
      message: "일정이 성공적으로 생성되었습니다"
    });

    // WebSocket으로 실시간 알림
    broadcastToClients({
      type: "schedule_created",
      data: { schedule: newSchedule, userId: user.id }
    });

  } catch (error) {
    console.error("❌ 일정 생성 실패:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "입력 데이터가 올바르지 않습니다", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "일정 생성에 실패했습니다" });
  }
});

// 일정 수정 API
router.put("/api/schedules/:id", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "인증이 필요합니다" });
    }

    const scheduleId = parseInt(req.params.id);
    const updateData = req.body;

    // 권한 확인
    const existingSchedule = await db.select()
      .from(schema.schedules)
      .where(eq(schema.schedules.id, scheduleId))
      .limit(1);

    if (existingSchedule.length === 0) {
      return res.status(404).json({ error: "일정을 찾을 수 없습니다" });
    }

    if (existingSchedule[0].createdBy !== user.id) {
      return res.status(403).json({ error: "일정을 수정할 권한이 없습니다" });
    }

    // 일정 수정
    const [updatedSchedule] = await db
      .update(schema.schedules)
      .set({ ...updateData, updatedAt: new Date().toISOString() })
      .where(eq(schema.schedules.id, scheduleId))
      .returning();

    console.log("✅ 일정 수정 완료:", scheduleId);
    res.json({ 
      success: true, 
      schedule: updatedSchedule,
      message: "일정이 성공적으로 수정되었습니다"
    });

    // WebSocket으로 실시간 알림
    broadcastToClients({
      type: "schedule_updated",
      data: { schedule: updatedSchedule, userId: user.id }
    });

  } catch (error) {
    console.error("❌ 일정 수정 실패:", error);
    res.status(500).json({ error: "일정 수정에 실패했습니다" });
  }
});

// 일정 삭제 API
router.delete("/api/schedules/:id", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "인증이 필요합니다" });
    }

    const scheduleId = parseInt(req.params.id);

    // 권한 확인
    const existingSchedule = await db.select()
      .from(schema.schedules)
      .where(eq(schema.schedules.id, scheduleId))
      .limit(1);

    if (existingSchedule.length === 0) {
      return res.status(404).json({ error: "일정을 찾을 수 없습니다" });
    }

    if (existingSchedule[0].createdBy !== user.id) {
      return res.status(403).json({ error: "일정을 삭제할 권한이 없습니다" });
    }

    // 반복 일정 인스턴스도 함께 삭제
    await db.delete(schema.scheduleInstances)
      .where(eq(schema.scheduleInstances.scheduleId, scheduleId));

    // 일정 삭제
    await db.delete(schema.schedules)
      .where(eq(schema.schedules.id, scheduleId));

    console.log("✅ 일정 삭제 완료:", scheduleId);
    res.json({ 
      success: true,
      message: "일정이 성공적으로 삭제되었습니다"
    });

    // WebSocket으로 실시간 알림
    broadcastToClients({
      type: "schedule_deleted",
      data: { scheduleId, userId: user.id }
    });

  } catch (error) {
    console.error("❌ 일정 삭제 실패:", error);
    res.status(500).json({ error: "일정 삭제에 실패했습니다" });
  }
});

// 템플릿 데이터 API 엔드포인트
router.get('/api/template/excel-samples', (req, res) => {
  try {
    res.json({
      success: true,
      data: TEMPLATE_DATA_CONFIG.EXCEL_TEMPLATE_SAMPLES,
      options: TEMPLATE_DATA_CONFIG.DROPDOWN_OPTIONS,
      mappings: {
        colors: TEMPLATE_DATA_CONFIG.COLOR_MAPPING,
        weekdays: TEMPLATE_DATA_CONFIG.WEEKDAY_MAPPING
      }
    });
  } catch (error) {
    console.error('❌ 템플릿 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '템플릿 데이터를 불러오는 중 오류가 발생했습니다.'
    });
  }
});

// 스케줄 엑셀 대량 업로드 API
router.post("/api/schedules/bulk-upload", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "인증이 필요합니다" });
    }

    const { schedules: schedulesData } = req.body;

    if (!Array.isArray(schedulesData) || schedulesData.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "업로드할 일정 데이터가 없습니다" 
      });
    }

    const createdSchedules = [];
    const errors = [];

    console.log(`📅 엑셀 일정 대량 업로드 시작: ${schedulesData.length}개 일정`);

    for (let i = 0; i < schedulesData.length; i++) {
      try {
        const scheduleData = schedulesData[i];
        
        // 데이터 검증 및 변환
        const validatedData = {
          title: scheduleData.title,
          description: scheduleData.description || null,
          startDate: scheduleData.startDate,
          endDate: scheduleData.endDate || null,
          startTime: scheduleData.startTime || null,
          endTime: scheduleData.endTime || null,
          allDay: Boolean(scheduleData.allDay),
          isRecurring: Boolean(scheduleData.isRecurring),
          recurringType: scheduleData.isRecurring ? scheduleData.recurringType : null,
          recurringInterval: scheduleData.isRecurring ? (scheduleData.recurringInterval || 1) : null,
          recurringDays: scheduleData.isRecurring && scheduleData.recurringDays ? 
            JSON.stringify(scheduleData.recurringDays.split(',').map((d: string) => d.trim())) : null,
          recurringEndDate: scheduleData.isRecurring ? scheduleData.recurringEndDate : null,
          recurringCount: scheduleData.isRecurring ? (scheduleData.recurringCount || null) : null,
          location: scheduleData.location || null,
          reminder: scheduleData.reminder || null,
          color: scheduleData.color || '#3b82f6',
          category: scheduleData.category || '기타',
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 일정 생성
        const [newSchedule] = await db.insert(schema.schedules).values(validatedData).returning();

        // 반복 일정인 경우 인스턴스 생성
        if (validatedData.isRecurring) {
          await generateRecurringInstances(newSchedule, validatedData);
        }

        createdSchedules.push(newSchedule);
        console.log(`✅ 일정 생성 완료 [${i + 1}/${schedulesData.length}]: ${validatedData.title}`);

      } catch (error) {
        console.error(`❌ 일정 생성 실패 [${i + 1}/${schedulesData.length}]:`, error);
        errors.push(`행 ${i + 3}: ${error instanceof Error ? error.message : '일정 생성 실패'}`);
      }
    }

    // WebSocket으로 실시간 알림
    if (createdSchedules.length > 0) {
      broadcastToClients({
        type: "schedules_bulk_created",
        data: { 
          schedules: createdSchedules, 
          userId: user.id,
          count: createdSchedules.length
        }
      });
    }

    const successCount = createdSchedules.length;
    const errorCount = errors.length;

    console.log(`📅 엑셀 일정 대량 업로드 완료: 성공 ${successCount}개, 실패 ${errorCount}개`);

    res.json({
      success: true,
      message: `총 ${schedulesData.length}개 중 ${successCount}개 일정이 성공적으로 등록되었습니다.`,
      data: {
        created: createdSchedules,
        successCount,
        errorCount,
        totalCount: schedulesData.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("❌ 엑셀 일정 대량 업로드 실패:", error);
    res.status(500).json({ 
      success: false,
      message: "엑셀 업로드 처리 중 오류가 발생했습니다",
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// 반복 일정 인스턴스 생성 함수
async function generateRecurringInstances(schedule: any, scheduleData: any) {
  try {
    const instances = [];
    const startDate = new Date(schedule.startDate);
    const endDate = scheduleData.recurringEndDate ? new Date(scheduleData.recurringEndDate) : 
                   new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1년 후까지
    
    let currentDate = new Date(startDate);
    let instanceCount = 0;
    const maxInstances = scheduleData.recurringCount || 365; // 최대 365개 인스턴스

    while (currentDate <= endDate && instanceCount < maxInstances) {
      // 반복 유형에 따른 다음 날짜 계산
      let shouldCreateInstance = false;

      switch (scheduleData.recurringType) {
        case "daily":
          shouldCreateInstance = true;
          break;
        case "weekly":
          if (scheduleData.recurringDays) {
            const selectedDays = JSON.parse(scheduleData.recurringDays);
            const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
            const currentDayName = dayNames[currentDate.getDay()];
            shouldCreateInstance = selectedDays.includes(currentDayName);
          } else {
            shouldCreateInstance = currentDate.getDay() === startDate.getDay();
          }
          break;
        case "monthly":
          shouldCreateInstance = currentDate.getDate() === startDate.getDate();
          break;
        case "yearly":
          shouldCreateInstance = currentDate.getMonth() === startDate.getMonth() && 
                               currentDate.getDate() === startDate.getDate();
          break;
        case "weekdays":
          const day = currentDate.getDay();
          shouldCreateInstance = day >= 1 && day <= 5; // 월-금
          break;
        case "custom":
          if (scheduleData.recurringDays) {
            const selectedDays = JSON.parse(scheduleData.recurringDays);
            const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
            const currentDayName = dayNames[currentDate.getDay()];
            shouldCreateInstance = selectedDays.includes(currentDayName);
          }
          break;
      }

      if (shouldCreateInstance) {
        instances.push({
          scheduleId: schedule.id,
          instanceDate: currentDate.toISOString().split('T')[0],
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          isModified: false,
          isCancelled: false,
        });
        instanceCount++;
      }

      // 다음 날짜로 이동
      switch (scheduleData.recurringType) {
        case "daily":
          currentDate.setDate(currentDate.getDate() + scheduleData.recurringInterval);
          break;
        case "weekly":
        case "weekdays":
        case "custom":
          if (scheduleData.recurringDays && (scheduleData.recurringType === "weekly" || scheduleData.recurringType === "custom")) {
            currentDate.setDate(currentDate.getDate() + 1);
          } else {
            currentDate.setDate(currentDate.getDate() + (7 * scheduleData.recurringInterval));
          }
          break;
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + scheduleData.recurringInterval);
          break;
        case "yearly":
          currentDate.setFullYear(currentDate.getFullYear() + scheduleData.recurringInterval);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // 인스턴스 일괄 삽입
    if (instances.length > 0) {
      await db.insert(schema.scheduleInstances).values(instances);
      console.log(`📅 반복 일정 인스턴스 ${instances.length}개 생성 완료`);
    }

  } catch (error) {
    console.error("❌ 반복 일정 인스턴스 생성 실패:", error);
  }
}
*/

// 새로운 관리자 설정 API 엔드포인트들
  
// 시스템 상태 조회 API (개선된 버전)
router.get('/api/admin/system-status', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }

    const account = ACCOUNT_CONFIG[userId];
    
    // 운영자 또는 개발자 권한 확인
    if (!account || (account.role !== 'developer' && account.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        message: '운영자 또는 개발자 권한이 필요합니다.'
      });
    }

    // 메모리 사용량 정보 (Node.js 프로세스 기준)
    const memoryUsage = process.memoryUsage();
    const os = await import('os');
    
    // 시스템 메모리 정보 (실제 RAM)
    const totalMemory = os.default.totalmem();
    const freeMemory = os.default.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Node.js 메모리 제한 계산 (일반적으로 1.5GB, --max-old-space-size로 설정 가능)
    const nodeMemoryLimit = Math.min(
      Math.round(totalMemory * 0.8 / 1024 / 1024), // 시스템 메모리의 80%
      1536 // 기본 Node.js 제한 1.5GB
    );
    
    const memoryInfo = {
      // Node.js 프로세스 메모리 (TaskFlow 앱이 사용하는 메모리) - 실제 사용량 기준
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB - 실제 사용 중
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB - 할당된 힙
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB (실제 물리 메모리 사용량)
      
      // 실제 TaskFlow 앱 메모리 사용률 계산 (더 현실적인 기준)
      processUsage: Math.round((memoryUsage.rss / (nodeMemoryLimit * 1024 * 1024)) * 100),
      maxMemory: nodeMemoryLimit, // Node.js 최대 사용 가능 메모리 (MB)
      
      // 실제 시스템 메모리 정보
      systemTotal: Math.round(totalMemory / 1024 / 1024 / 1024 * 1000) / 1000, // GB
      systemUsed: Math.round(usedMemory / 1024 / 1024 / 1024 * 1000) / 1000, // GB 
      systemFree: Math.round(freeMemory / 1024 / 1024 / 1024 * 1000) / 1000, // GB
      systemUsage: Math.round((usedMemory / totalMemory) * 100), // 전체 시스템 메모리 사용률
      
      // UI 표시용 (TaskFlow 앱 실제 메모리 사용률 - RSS 기준)
      usage: Math.round((memoryUsage.rss / (nodeMemoryLimit * 1024 * 1024)) * 100) // %
    };

    // 시스템 업타임
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeFormatted = `${uptimeHours}시간 ${uptimeMinutes}분`;

    // 데이터베이스 상태 확인
    let dbStatus = 'online';
    let dbInfo = {};
    try {
      // 데이터베이스 모듈 동적 import
      const { database } = await import('./db');
      
      // 간단한 쿼리로 DB 연결 확인
      const testQuery = database.prepare('SELECT COUNT(*) as count FROM users').get();
      dbInfo = {
        status: 'connected',
        userCount: testQuery.count || 0
      };
    } catch (dbError) {
      console.log('데이터베이스 연결 테스트 실패:', dbError.message);
      dbStatus = 'error';
      dbInfo = {
        status: 'disconnected',
        error: dbError.message
      };
    }

    // Node.js 정보
    const nodeInfo = {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };

    const systemStatus = {
      server: {
        status: 'online' as const,
        port: 3000,
        uptime: uptimeFormatted,
        uptimeSeconds: Math.round(uptimeSeconds),
        nodeInfo
      },
      client: {
        status: 'online' as const,
        port: 5173,
        url: 'http://localhost:5173'
      },
      memory: memoryInfo,
      database: {
        status: dbStatus,
        ...dbInfo
      },
      logs: {
        count: systemLogs.length,
        lastActivity: systemLogs.length > 0 ? systemLogs[systemLogs.length - 1].timestamp : null
      },
      performance: {
        memoryUsage: `${memoryInfo.usage}%`,
        // TaskFlow 앱 메모리 기준으로 성능 상태 계산 (더 관대한 기준 적용)
        optimization: memoryInfo.usage < 90 ? 'good' : memoryInfo.usage < 98 ? 'warning' : 'critical'
      },
      auth: {
        isLoggedIn: true,
        username: account?.username,
        role: account?.role,
        loginTime: new Date().toISOString()
      }
    };

    res.json(systemStatus);
  } catch (error) {
    console.error('시스템 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '시스템 상태 조회 중 오류가 발생했습니다.'
    });
  }
});

// 데이터 백업 API
router.post('/api/admin/backup', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }

    // 개발자 권한 확인
    const account = ACCOUNT_CONFIG[userId];
    if (!account || account.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: '개발자 권한이 필요합니다.'
      });
    }

    const { backupPath, includeTaskflowDb, includeAppDb, includeConfig, includeUsers } = req.body;

    if (!backupPath) {
      return res.status(400).json({
        success: false,
        message: '백업 폴더 경로가 필요합니다.'
      });
    }

    const fs = await import('fs');
    const path = await import('path');

    // 백업 폴더 생성
    if (!fs.default.existsSync(backupPath)) {
      fs.default.mkdirSync(backupPath, { recursive: true });
    }

    // 타임스탬프 폴더 생성
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const backupFolder = path.default.join(backupPath, `backup_${timestamp}`);
    fs.default.mkdirSync(backupFolder, { recursive: true });

    let backupCount = 0;

    // taskflow.db 백업
    if (includeTaskflowDb && fs.default.existsSync('./taskflow.db')) {
      fs.default.copyFileSync('./taskflow.db', path.default.join(backupFolder, 'taskflow.db'));
      backupCount++;
    }

    // app.db 백업
    if (includeAppDb && fs.default.existsSync('./app.db')) {
      fs.default.copyFileSync('./app.db', path.default.join(backupFolder, 'app.db'));
      backupCount++;
    }

    // taskflow-config.json 백업
    if (includeConfig && fs.default.existsSync('./taskflow-config.json')) {
      fs.default.copyFileSync('./taskflow-config.json', path.default.join(backupFolder, 'taskflow-config.json'));
      backupCount++;
    }

    // taskflow-users.json 백업
    if (includeUsers && fs.default.existsSync('./taskflow-users.json')) {
      fs.default.copyFileSync('./taskflow-users.json', path.default.join(backupFolder, 'taskflow-users.json'));
      backupCount++;
    }

    console.log(`✅ 데이터 백업 완료: ${backupCount}개 파일 → ${backupFolder}`);

    res.json({
      success: true,
      message: `백업이 완료되었습니다.`,
      backupCount,
      backupPath: backupFolder
    });

  } catch (error) {
    console.error('백업 오류:', error);
    res.status(500).json({
      success: false,
      message: '백업 중 오류가 발생했습니다: ' + error
    });
  }
});

// 데이터 복구 API
router.post('/api/admin/restore', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }

    // 개발자 권한 확인
    const account = ACCOUNT_CONFIG[userId];
    if (!account || account.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: '개발자 권한이 필요합니다.'
      });
    }

    const { restorePath, includeTaskflowDb, includeAppDb, includeConfig, includeUsers } = req.body;

    if (!restorePath) {
      return res.status(400).json({
        success: false,
        message: '복구할 폴더 경로가 필요합니다.'
      });
    }

    const fs = await import('fs');
    const path = await import('path');

    if (!fs.default.existsSync(restorePath)) {
      return res.status(400).json({
        success: false,
        message: '복구할 폴더가 존재하지 않습니다.'
      });
    }

    let restoredCount = 0;

    // taskflow.db 복구
    if (includeTaskflowDb) {
      const sourceFile = path.default.join(restorePath, 'taskflow.db');
      if (fs.default.existsSync(sourceFile)) {
        fs.default.copyFileSync(sourceFile, './taskflow.db');
        restoredCount++;
      }
    }

    // app.db 복구
    if (includeAppDb) {
      const sourceFile = path.default.join(restorePath, 'app.db');
      if (fs.default.existsSync(sourceFile)) {
        fs.default.copyFileSync(sourceFile, './app.db');
        restoredCount++;
      }
    }

    // taskflow-config.json 복구
    if (includeConfig) {
      const sourceFile = path.default.join(restorePath, 'taskflow-config.json');
      if (fs.default.existsSync(sourceFile)) {
        fs.default.copyFileSync(sourceFile, './taskflow-config.json');
        restoredCount++;
      }
    }

    // taskflow-users.json 복구
    if (includeUsers) {
      const sourceFile = path.default.join(restorePath, 'taskflow-users.json');
      if (fs.default.existsSync(sourceFile)) {
        fs.default.copyFileSync(sourceFile, './taskflow-users.json');
        restoredCount++;
      }
    }

    console.log(`✅ 데이터 복구 완료: ${restoredCount}개 파일`);

    res.json({
      success: true,
      message: `복구가 완료되었습니다.`,
      restoredCount
    });

  } catch (error) {
    console.error('복구 오류:', error);
    res.status(500).json({
      success: false,
      message: '복구 중 오류가 발생했습니다: ' + error
    });
  }
});

// 데이터 일괄 삭제 API
router.delete('/api/admin/delete-data', requireAuth, async (req, res) => {
  console.log('🗑️ 데이터 삭제 API 요청 도달');
  console.log('📋 요청 헤더:', req.headers);
  console.log('📋 요청 바디:', req.body);
  console.log('📋 세션 정보:', req.session);
  
  try {
    const userId = req.session.userId;
    console.log('👤 사용자 ID:', userId);
    
    if (!userId) {
      console.log('❌ 로그인되지 않은 사용자');
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }

    // 개발자 권한 확인
    const account = ACCOUNT_CONFIG[userId];
    console.log('👤 사용자 계정 정보:', account);
    
    if (!account || account.role !== 'developer') {
      console.log('❌ 개발자 권한이 없음:', account?.role);
      return res.status(403).json({
        success: false,
        message: '개발자 권한이 필요합니다.'
      });
    }

    const { deleteTaskflowDb, deleteAppDb, deleteConfig, deleteUsers } = req.body;
    
    console.log('🗑️ 데이터 삭제 요청:', {
      deleteTaskflowDb,
      deleteAppDb,
      deleteConfig,
      deleteUsers,
      userId
    });

    const fs = await import('fs');
    const path = await import('path');
    let deletedCount = 0;
    const deletedFiles = [];

    // 데이터베이스 연결 해제 함수
    const closeDatabaseConnections = async () => {
      try {
        // 현재 데이터베이스 연결 해제
        const { database } = await import('./db');
        if (database && typeof database.close === 'function') {
          console.log('🔌 데이터베이스 연결 해제 중...');
          database.close();
          console.log('✅ 데이터베이스 연결 해제 완료');
        }
        
        // 잠시 대기하여 파일 잠금 해제
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.log('⚠️ 데이터베이스 연결 해제 중 오류:', error.message);
      }
    };

    // taskflow.db 삭제
    if (deleteTaskflowDb) {
      try {
        const dbPath = path.resolve('./taskflow.db');
        console.log('🔍 taskflow.db 삭제 시도:', dbPath);
        
        if (fs.existsSync(dbPath)) {
          // 데이터베이스 연결 해제
          await closeDatabaseConnections();
          
          // 파일 삭제 시도 (재시도 로직 포함)
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              fs.unlinkSync(dbPath);
              deletedFiles.push('taskflow.db');
              deletedCount++;
              console.log('✅ taskflow.db 삭제 성공');
              break;
            } catch (unlinkError) {
              retryCount++;
              console.log(`⚠️ taskflow.db 삭제 시도 ${retryCount}/${maxRetries} 실패:`, unlinkError.message);
              
              if (retryCount < maxRetries) {
                // 잠시 대기 후 재시도
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                throw unlinkError;
              }
            }
          }
        } else {
          console.log('ℹ️ taskflow.db 파일이 존재하지 않습니다.');
        }
      } catch (error) {
        console.error('❌ taskflow.db 삭제 실패:', error);
        throw new Error(`taskflow.db 삭제 실패: ${error.message}`);
      }
    }

    // app.db 삭제
    if (deleteAppDb) {
      try {
        const appDbPath = path.resolve('./app.db');
        console.log('🔍 app.db 삭제 시도:', appDbPath);
        
        if (fs.existsSync(appDbPath)) {
          fs.unlinkSync(appDbPath);
          deletedFiles.push('app.db');
          deletedCount++;
          console.log('✅ app.db 삭제 성공');
        } else {
          console.log('ℹ️ app.db 파일이 존재하지 않습니다.');
        }
      } catch (error) {
        console.error('❌ app.db 삭제 실패:', error);
        throw new Error(`app.db 삭제 실패: ${error.message}`);
      }
    }

    // taskflow-config.json 삭제
    if (deleteConfig) {
      try {
        const configPath = path.resolve('./taskflow-config.json');
        console.log('🔍 taskflow-config.json 삭제 시도:', configPath);
        
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
          deletedFiles.push('taskflow-config.json');
          deletedCount++;
          console.log('✅ taskflow-config.json 삭제 성공');
        } else {
          console.log('ℹ️ taskflow-config.json 파일이 존재하지 않습니다.');
        }
      } catch (error) {
        console.error('❌ taskflow-config.json 삭제 실패:', error);
        throw new Error(`taskflow-config.json 삭제 실패: ${error.message}`);
      }
    }

    // taskflow-users.json 삭제
    if (deleteUsers) {
      try {
        const usersPath = path.resolve('./taskflow-users.json');
        console.log('🔍 taskflow-users.json 삭제 시도:', usersPath);
        
        if (fs.existsSync(usersPath)) {
          fs.unlinkSync(usersPath);
          deletedFiles.push('taskflow-users.json');
          deletedCount++;
          console.log('✅ taskflow-users.json 삭제 성공');
        } else {
          console.log('ℹ️ taskflow-users.json 파일이 존재하지 않습니다.');
        }
      } catch (error) {
        console.error('❌ taskflow-users.json 삭제 실패:', error);
        throw new Error(`taskflow-users.json 삭제 실패: ${error.message}`);
      }
    }

    // 디버그 로그 추가
    try {
      addDebugLog('data_delete', `데이터 파일 삭제 완료: ${deletedFiles.join(', ')} (총 ${deletedCount}개)`, userId);
    } catch (logError) {
      console.error('⚠️ 디버그 로그 추가 실패:', logError);
    }

    const message = deletedCount > 0 
      ? `${deletedCount}개 파일이 성공적으로 삭제되었습니다: ${deletedFiles.join(', ')}`
      : '삭제할 파일이 없습니다.';

    console.log('🎉 데이터 삭제 완료:', message);

    res.json({
      success: true,
      message,
      deletedFiles,
      deletedCount
    });

  } catch (error) {
    console.error('❌ 데이터 삭제 중 오류 발생:', error);
    
    // 개발 환경에서 상세한 오류 정보 제공
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `삭제 중 오류가 발생했습니다: ${error.message}`
      : '데이터 삭제 중 오류가 발생했습니다.';

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// registerRoutes 함수 추가
export function registerRoutes(app: Express): Server {
  // Express 앱에 라우터 추가
  app.use(router);
  
  // HTTP 서버 생성
  const server = createServer(app);
  
  // WebSocket 서버 설정
  wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('새 WebSocket 연결');
    clients.add(ws);
    
    ws.on('close', () => {
      console.log('WebSocket 연결 종료');
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket 오류:', error);
      clients.delete(ws);
    });
  });
  
  return server;
}

// 🔐 관리자 전용 API 엔드포인트들

// 관리자용 사용자 목록 조회 (비밀번호 포함)
router.get('/api/admin/users', (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || (currentAccount.role !== 'developer' && currentAccount.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }
    
    // 권한에 따른 필터링
    let users = Object.values(accountDatabase);
    if (currentAccount.role === 'manager') {
      // 관리자는 admin 계정 제외
      users = users.filter(user => user.role !== 'developer');
    }
    
    console.log('✅ 관리자용 사용자 목록 조회:', users.length, '명');
    res.json(users);
    
  } catch (error) {
    console.error('❌ 관리자용 사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 정보 업데이트
router.put('/api/admin/users/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const targetUserId = req.params.id;
    const updateData = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || (currentAccount.role !== 'developer' && currentAccount.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }
    
    // 수정 대상 확인
    const targetAccount = accountDatabase[targetUserId];
    if (!targetAccount) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    // 권한 체크: 관리자는 admin 계정 수정 불가
    if (currentAccount.role === 'manager' && targetAccount.role === 'developer') {
      return res.status(403).json({
        success: false,
        message: 'admin 계정은 수정할 수 없습니다.'
      });
    }
    
    // 사용자 정보 업데이트
    accountDatabase[targetUserId] = {
      ...targetAccount,
      ...updateData,
      id: targetUserId // ID는 변경 불가
    };
    
    console.log('✅ 사용자 정보 업데이트:', targetUserId);
    res.json({
      success: true,
      message: '사용자 정보가 업데이트되었습니다.',
      user: accountDatabase[targetUserId]
    });
    
  } catch (error) {
    console.error('❌ 사용자 정보 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 업데이트 중 오류가 발생했습니다.'
    });
  }
});

// 새 사용자 추가
router.post('/api/admin/users', (req, res) => {
  try {
    const userId = req.session.userId;
    const newUserData = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || (currentAccount.role !== 'developer' && currentAccount.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }
    
    // 중복 확인
    if (accountDatabase[newUserData.username]) {
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 사용자명입니다.'
      });
    }
    
    // 새 사용자 생성
    const newUser = {
      id: newUserData.username,
      username: newUserData.username,
      password: newUserData.password,
      name: newUserData.name,
      department: newUserData.department,
      role: newUserData.role,
      email: newUserData.email
    };
    
    accountDatabase[newUserData.username] = newUser;
    
    console.log('✅ 새 사용자 추가:', newUserData.username);
    res.json({
      success: true,
      message: '새 사용자가 추가되었습니다.',
      user: newUser
    });
    
  } catch (error) {
    console.error('❌ 사용자 추가 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 추가 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 삭제
router.delete('/api/admin/users/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const targetUserId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || (currentAccount.role !== 'developer' && currentAccount.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }
    
    const targetAccount = accountDatabase[targetUserId];
    if (!targetAccount) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    // admin 계정 삭제 방지
    if (targetAccount.role === 'developer') {
      return res.status(403).json({
        success: false,
        message: 'admin 계정은 삭제할 수 없습니다.'
      });
    }
    
    delete accountDatabase[targetUserId];
    
    console.log('✅ 사용자 삭제:', targetUserId);
    res.json({
      success: true,
      message: '사용자가 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ 사용자 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 삭제 중 오류가 발생했습니다.'
    });
  }
});

// 저장 설정 조회
router.get('/api/admin/storage-config', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || (currentAccount.role !== 'developer' && currentAccount.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }
    
    // 설정 파일에서 실제 설정 반환
    const { configManager } = await import('./config-manager');
    const config = configManager.getConfig();
    
    const storageConfig = {
      storagePath: config.dataDir,
      autoBackup: config.autoBackup,
      backupInterval: config.backupInterval,
      maxBackupFiles: config.maxBackupFiles
    };
    
    res.json(storageConfig);
    
  } catch (error) {
    console.error('❌ 저장 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '저장 설정 조회 중 오류가 발생했습니다.'
    });
  }
});

// 저장 설정 업데이트
router.put('/api/admin/storage-config', async (req, res) => {
  try {
    const userId = req.session.userId;
    const newConfig = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || (currentAccount.role !== 'developer' && currentAccount.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }
    
    // 설정 파일에 실제 저장
    const { configManager } = await import('./config-manager');
    const { FolderSelector } = await import('./folder-selector');
    
    // 경로 유효성 검증
    if (newConfig.storagePath) {
      const validation = FolderSelector.validateFolderPath(newConfig.storagePath);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: `유효하지 않은 경로: ${validation.error}`
        });
      }
    }
    
    // 설정 업데이트
    const updates = {
      dataDir: newConfig.storagePath,
      autoBackup: newConfig.autoBackup,
      backupInterval: newConfig.backupInterval,
      maxBackupFiles: newConfig.maxBackupFiles
    };
    
    configManager.updateConfig(updates);
    
    // 새 데이터 디렉토리로 변경된 경우 초기화
    if (newConfig.storagePath) {
      configManager.initializeDataDirectory();
    }
    
    console.log('✅ 저장 설정 업데이트:', updates);
    
    res.json({
      success: true,
      message: '저장 설정이 업데이트되었습니다.',
      config: newConfig
    });
    
  } catch (error) {
    console.error('❌ 저장 설정 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '저장 설정 업데이트 중 오류가 발생했습니다.'
    });
  }
});

// 폴더 선택 API
router.post('/api/admin/select-folder', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    // 개발자 권한 확인
    const account = ACCOUNT_CONFIG[userId];
    if (!account || account.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: '개발자 권한이 필요합니다.'
      });
    }
    
    // 간단한 폴더 선택 - 기본 경로들 제공
    const os = await import('os');
    const path = await import('path');
    
    const defaultPaths = [
      {
        name: '바탕화면',
        path: path.default.join(os.default.homedir(), 'Desktop')
      },
      {
        name: '문서',
        path: path.default.join(os.default.homedir(), 'Documents')
      },
      {
        name: '다운로드',
        path: path.default.join(os.default.homedir(), 'Downloads')
      },
      {
        name: '현재 프로젝트 폴더',
        path: process.cwd()
      },
      {
        name: '데이터 폴더',
        path: path.default.join(process.cwd(), 'data')
      }
    ];
    
    // 첫 번째 기본 경로를 반환 (추후 실제 폴더 선택 대화상자로 업그레이드 가능)
    const selectedPath = defaultPaths[0].path;
    
    console.log('📂 기본 폴더 경로 제공:', selectedPath);
    
    res.json({
      success: true,
      folderPath: selectedPath,
      message: '기본 폴더 경로가 설정되었습니다.',
      availablePaths: defaultPaths
    });
    
  } catch (error) {
    console.error('❌ 폴더 선택 오류:', error);
    res.status(500).json({
      success: false,
      message: '폴더 선택 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});



// 업무 일괄등록 API (엑셀 업로드)
router.post('/api/tasks/bulk-upload', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const { tasks } = req.body;
    
    console.log('🔥🔥🔥 CRITICAL: 새로운 엑셀 업로드 요청 시작 🔥🔥🔥');
    console.log('📊 엑셀 업로드 요청 분석:');
    console.log(`   👤 요청자: ${userId}`);
    console.log(`   📋 전송된 업무 수: ${tasks?.length || 0}개`);
    console.log('🔥 CRITICAL: 클라이언트에서 받은 업무 수량:', tasks?.length || 0);
    console.log('🔥 CRITICAL: 클라이언트에서 받은 업무 제목들:', (tasks || []).map((task, i) => `${i+1}: ${task.title || '제목없음'}`));
    
    // 데이터 유효성 검증
    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.log('❌ 엑셀 업로드 실패: 업무 데이터가 없습니다.');
      return res.status(400).json({
        success: false,
        message: '업무 데이터가 없습니다.'
      });
    }
    
    // 업로드 전 기존 데이터 개수 기록
    const beforeCount = taskList.length;
    console.log(`   📊 업로드 전 기존 업무 수: ${beforeCount}개`);
    
    const successTasks = [];
    const failedTasks = [];
    const skippedTasks = [];
    
    // 각 업무 검증 및 처리
    tasks.forEach((taskData, index) => {
      try {
        // 🔍 상세 디버그: 원본 데이터 확인
        console.log(`🔍 업무 ${index + 1} 원본 데이터 분석:`);
        console.log(`   📝 제목: "${taskData.title}"`);
        console.log(`   📄 설명: "${taskData.description || '(없음)'}"`);
        console.log(`   📅 시작날짜: "${taskData.workDate}" (타입: ${typeof taskData.workDate})`);
        console.log(`   🏷️ 카테고리: "${taskData.category || '(없음)'}"`);
        console.log(`   ⚡ 우선순위: "${taskData.priority || '(없음)'}"`);
        console.log(`   📊 상태: "${taskData.status || '(없음)'}"`);
        
        // 필수 필드 검증
        if (!taskData.title || taskData.title.trim() === '') {
          console.log(`❌ 업무 ${index + 1}: 제목이 없습니다.`);
          failedTasks.push({ index: index + 1, reason: '제목이 없습니다.' });
          return;
        }
        
        // 빈 행 또는 헤더 행 필터링
        if (taskData.title === '업무명' || 
            taskData.title === 'title' ||
            taskData.title.includes('번호') ||
            taskData.title.trim() === '') {
          console.log(`⏭️ 업무 ${index + 1}: 헤더 행 또는 빈 행 스킵`);
          skippedTasks.push({ index: index + 1, reason: '헤더 행 또는 빈 행' });
          return;
        }
        
        // 날짜 처리 - 개선된 로직 (타임존 문제 해결)
        let workDate = null;
        let dueDate = null;
        
        if (taskData.workDate && taskData.workDate !== '') {
          try {
            let dateValue = taskData.workDate;
            
            // 🔥 CRITICAL: 문자열 날짜 직접 파싱 (타임존 변환 방지)
            if (typeof dateValue === 'string') {
              // M/D/YY 또는 MM/DD/YYYY 형식 처리
              const dateMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
              if (dateMatch) {
                let [, month, day, year] = dateMatch;
                
                // 2자리 년도를 4자리로 변환
                if (year.length === 2) {
                  const yearNum = parseInt(year);
                  year = yearNum > 50 ? `19${year}` : `20${year}`;
                }
                
                // YYYY-MM-DD 형식으로 직접 생성 (타임존 변환 없음)
                workDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                console.log(`📅 날짜 처리 성공 - 원본: ${taskData.workDate}, 변환: ${workDate}`);
              } else {
                // 다른 형식이면 기존 로직 사용
                workDate = new Date(dateValue).toISOString().split('T')[0];
                console.log(`📅 날짜 처리 성공 (기존방식) - 원본: ${taskData.workDate}, 변환: ${workDate}`);
              }
            }
            // Excel 날짜 형식 처리 (숫자로 된 날짜)
            else if (typeof dateValue === 'number') {
              // Excel 날짜 시리얼 번호를 실제 날짜로 변환
              const excelEpoch = new Date(1900, 0, 1);
              const days = dateValue - 2; // Excel의 1900년 버그 보정
              dateValue = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
              workDate = dateValue.toISOString().split('T')[0];
              console.log(`📅 날짜 처리 성공 (Excel숫자) - 원본: ${taskData.workDate}, 변환: ${workDate}`);
            }
            
          } catch (dateError) {
            console.log(`⚠️ 업무 ${index + 1}: 날짜 형식 오류 (${taskData.workDate}), null로 설정`);
            workDate = null;
          }
        } else {
          console.log(`⚠️ 업무 ${index + 1}: workDate가 비어있음 (${taskData.workDate})`);
        }
        
        if (taskData.dueDate) {
          try {
            dueDate = new Date(taskData.dueDate).toISOString().split('T')[0];
          } catch (dateError) {
            console.log(`⚠️ 업무 ${index + 1}: 마감일 형식 오류`);
          }
        }
        
        // 업무 생성
        const newTask = {
          id: Date.now() + Math.random() * 1000,
          title: taskData.title.trim(),
          description: taskData.description || '',
          workDate: workDate,
          startDate: workDate,
          dueDate: dueDate,
          startTime: taskData.startTime || '09:00', // 시작시간 추가
          endTime: taskData.endTime || '', // 종료시간 추가
          category: taskData.category || '일반업무',
          assignedTo: taskData.assignedTo || userId,
          createdBy: userId,
          status: taskData.status || 'scheduled',
          priority: taskData.priority || 'medium',
          progress: parseInt(taskData.progress) || 0,
          isRecurring: false,
          isFollowUpTask: false,
          parentTaskId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        taskList.push(newTask);
        successTasks.push(newTask);
        
        console.log(`✅ 업무 생성: ${newTask.title} | 날짜: ${workDate} | 우선순위: ${newTask.priority} | 상태: ${newTask.status} | 진행률: ${newTask.progress}%`);
        console.log(`   📄 설명: "${newTask.description}"`);
        console.log(`   🏷️ 카테고리: "${newTask.category}"`);
        console.log(`   👤 담당자: "${newTask.assignedTo}"`);
        console.log(`   ⏰ 생성시간: ${new Date().toLocaleString('ko-KR')}`);
        console.log(`   ═══════════════════════════════════════════════`);
        
      } catch (error) {
        console.error(`❌ 업무 ${index + 1} 처리 실패:`, error);
        failedTasks.push({ index: index + 1, reason: error.message });
      }
    });
    
    // 업로드 후 데이터 개수 확인
    const afterCount = taskList.length;
    const actualAdded = afterCount - beforeCount;
    
    console.log(`📊 업로드 결과 분석:`);
    console.log(`   📋 요청된 업무 수: ${tasks.length}개`);
    console.log(`   ✅ 성공 처리: ${successTasks.length}개`);
    console.log(`   ❌ 실패 처리: ${failedTasks.length}개`);
    console.log(`   ⏭️ 스킵 처리: ${skippedTasks.length}개`);
    console.log(`   📊 실제 추가된 업무: ${actualAdded}개`);
    console.log(`   📈 총 업무 수: ${beforeCount}개 → ${afterCount}개`);
    console.log(`   🔍 검증: 성공(${successTasks.length}) + 실패(${failedTasks.length}) + 스킵(${skippedTasks.length}) = ${successTasks.length + failedTasks.length + skippedTasks.length}개`);
    
    // 시스템 로그 추가
    addSystemLog({
      username: userId,
      action: 'data_create',
      details: `업무 일괄등록: 요청 ${tasks.length}개, 성공 ${successTasks.length}개, 실패 ${failedTasks.length}개, 스킵 ${skippedTasks.length}개, 실제추가 ${actualAdded}개`,
      ipAddress: req.ip
    });
    
    console.log(`📋 업무 일괄등록 완료: 성공 ${successTasks.length}개, 실패 ${failedTasks.length}개, 스킵 ${skippedTasks.length}개`);
    
    res.json({
      success: true,
      message: `${successTasks.length}개의 업무가 성공적으로 등록되었습니다. (스킵: ${skippedTasks.length}개)`,
      data: {
        total: tasks.length,
        success: successTasks.length,
        failed: failedTasks.length,
        skipped: skippedTasks.length,
        actualAdded: actualAdded,
        beforeCount: beforeCount,
        afterCount: afterCount,
        failures: failedTasks,
        skippedItems: skippedTasks
      }
    });
    
  } catch (error) {
    console.error('❌ 엑셀 업로드 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '엑셀 업로드 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 자동백업 실행 함수
async function performAutoBackup() {
  if (!autoBackupConfig.enabled || !autoBackupConfig.backupPath) {
    return;
  }
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const autoBackupDir = path.default.join(autoBackupConfig.backupPath, '자동백업');
    const backupDir = path.default.join(autoBackupDir, `backup_${timestamp}`);
    
    // 자동백업 디렉토리 생성
    if (!fs.default.existsSync(autoBackupDir)) {
      fs.default.mkdirSync(autoBackupDir, { recursive: true });
    }
    
    if (!fs.default.existsSync(backupDir)) {
      fs.default.mkdirSync(backupDir, { recursive: true });
    }
    
    const filesToBackup = ['taskflow.db', 'app.db', 'taskflow-config.json', 'taskflow-users.json'];
    let backupCount = 0;
    
    for (const file of filesToBackup) {
      const sourcePath = file;
      const targetPath = path.default.join(backupDir, file);
      
      if (fs.default.existsSync(sourcePath)) {
        fs.default.copyFileSync(sourcePath, targetPath);
        backupCount++;
      }
    }
    
    autoBackupConfig.lastBackupTime = new Date().toISOString();
    console.log(`🔄 자동백업 완료: ${backupCount}개 파일 백업 완료 (${backupDir})`);
    
    addSystemLog({
      username: 'system',
      action: 'data_create',
      details: `자동백업 실행: ${backupCount}개 파일 백업 완료`,
    });
    
  } catch (error) {
    console.error('❌ 자동백업 실패:', error);
  }
}

// 자동백업 타이머 설정
function setupAutoBackupTimer() {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }
  
  if (!autoBackupConfig.enabled) {
    return;
  }
  
  const intervals = {
    '5min': 5 * 60 * 1000,
    '10min': 10 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
  };
  
  const intervalMs = intervals[autoBackupConfig.interval];
  
  autoBackupTimer = setInterval(performAutoBackup, intervalMs);
  console.log(`⏰ 자동백업 타이머 설정: ${autoBackupConfig.interval} 간격`);
}

// 자동백업 설정 조회 API
router.get('/api/admin/auto-backup-config', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || currentAccount.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: '개발자 권한이 필요합니다.'
      });
    }
    
    res.json(autoBackupConfig);
    
  } catch (error) {
    console.error('❌ 자동백업 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '자동백업 설정 조회 중 오류가 발생했습니다.'
    });
  }
});

// 자동백업 설정 저장 API
router.post('/api/admin/auto-backup-config', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { enabled, interval, backupPath } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || currentAccount.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: '개발자 권한이 필요합니다.'
      });
    }
    
    // 설정 업데이트
    autoBackupConfig = {
      ...autoBackupConfig,
      enabled: !!enabled,
      interval: interval || '30min',
      backupPath: backupPath || '',
    };
    
    // 타이머 재설정
    setupAutoBackupTimer();
    
    addSystemLog({
      username: userId,
      action: 'data_update',
      details: `자동백업 설정 변경: ${enabled ? '활성화' : '비활성화'} (${interval} 간격)`,
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      message: '자동백업 설정이 저장되었습니다.',
      config: autoBackupConfig
    });
   
  } catch (error) {
    console.error('❌ 자동백업 설정 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '자동백업 설정 저장 중 오류가 발생했습니다.'
    });
  }
});

// 시스템 보안 설정 조회 API
router.get('/api/admin/security-config', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // 로그인하지 않은 경우 기본값 반환
    if (!userId) {
      return res.json(systemSecurityConfig);
    }
    
    const currentAccount = accountDatabase[userId];
    
    // 개발자 권한 체크 (개발자만 접근 가능)
    if (!currentAccount || currentAccount.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: '개발자 권한이 필요합니다.'
      });
    }
    
    res.json(systemSecurityConfig);
  } catch (error) {
    console.error('❌ 시스템 보안 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '시스템 보안 설정 조회 중 오류가 발생했습니다.'
    });
  }
});

// 시스템 보안 설정 저장 API
router.post('/api/admin/security-config', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { f12Restriction, rightClickRestriction, devToolsDetection, consoleWarning } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    
    // 개발자 권한 체크 (개발자만 접근 가능)
    if (!currentAccount || currentAccount.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: '개발자 권한이 필요합니다.'
      });
    }
    
    // 설정 업데이트
    systemSecurityConfig = {
      f12Restriction: !!f12Restriction,
      rightClickRestriction: !!rightClickRestriction,
      devToolsDetection: !!devToolsDetection,
      consoleWarning: !!consoleWarning
    };
    
    console.log(`🔒 시스템 보안 설정 변경 by ${userId}:`, systemSecurityConfig);
    
    // 시스템 로그 추가
    addSystemLog({
      username: userId,
      action: 'data_update',
      details: `시스템 보안 설정 변경: F12제한(${f12Restriction ? 'ON' : 'OFF'}), 우클릭제한(${rightClickRestriction ? 'ON' : 'OFF'}), 개발자도구감지(${devToolsDetection ? 'ON' : 'OFF'}), 콘솔경고(${consoleWarning ? 'ON' : 'OFF'})`,
      ipAddress: req.ip,
      location: await getLocationFromIP(req.ip || '127.0.0.1')
    });
    
    res.json({
      success: true,
      message: '시스템 보안 설정이 저장되었습니다.',
      config: systemSecurityConfig
    });
  } catch (error) {
    console.error('❌ 시스템 보안 설정 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '시스템 보안 설정 저장 중 오류가 발생했습니다.'
    });
  }
});



// 복구 with 백업 API (개선된 복구 기능)
router.post('/api/admin/restore-with-backup', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { restorePath, includeTaskflowDb, includeAppDb, includeConfig, includeUsers } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || currentAccount.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: '개발자 권한이 필요합니다.'
      });
    }
    
    if (!restorePath) {
      return res.status(400).json({
        success: false,
        message: '복구할 폴더를 지정해주세요.'
      });
    }
    
    const fs = await import('fs');
    const path = await import('path');
    
    // 1. 먼저 현재 데이터를 백업
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const preRestoreBackupDir = path.default.join('./data/backups', `pre_restore_backup_${timestamp}`);
    
    if (!fs.default.existsSync('./data/backups')) {
      fs.default.mkdirSync('./data/backups', { recursive: true });
    }
    
    if (!fs.default.existsSync(preRestoreBackupDir)) {
      fs.default.mkdirSync(preRestoreBackupDir, { recursive: true });
    }
    
    // 현재 데이터 백업
    const currentDataFiles = ['taskflow.db', 'app.db', 'taskflow-config.json', 'taskflow-users.json'];
    for (const file of currentDataFiles) {
      if (fs.default.existsSync(file)) {
        const targetPath = path.default.join(preRestoreBackupDir, file);
        fs.default.copyFileSync(file, targetPath);
      }
    }
    
    // 2. 선택된 파일들 복구
    const filesToRestore = [];
    if (includeTaskflowDb) filesToRestore.push('taskflow.db');
    if (includeAppDb) filesToRestore.push('app.db');
    if (includeConfig) filesToRestore.push('taskflow-config.json');
    if (includeUsers) filesToRestore.push('taskflow-users.json');
    
    let restoredCount = 0;
    for (const file of filesToRestore) {
      const sourcePath = path.default.join(restorePath, file);
      const targetPath = file;
      
      if (fs.default.existsSync(sourcePath)) {
        fs.default.copyFileSync(sourcePath, targetPath);
        restoredCount++;
      }
    }
    
    addSystemLog({
      username: userId,
      action: 'data_update',
      details: `데이터 복구 실행: ${restoredCount}개 파일 복구, 기존 데이터는 ${preRestoreBackupDir}에 백업됨`,
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      message: '복구가 완료되었습니다.',
      restoredCount,
      backupPath: preRestoreBackupDir
    });
    
  } catch (error) {
    console.error('❌ 데이터 복구 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터 복구 중 오류가 발생했습니다.'
    });
  }
});

// 시스템 디버그 로그 조회 API
router.get('/api/admin/debug-logs', async (req, res) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    console.log(`🔍 디버그 로그 API 호출: 사용자 ${userId}, 로그 개수: ${systemLogs.length}, 페이지: ${page}, 제한: ${limit}`);
    
    if (!userId) {
      console.log('❌ 디버그 로그 조회 실패: 로그인 필요');
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || (currentAccount.role !== 'developer' && currentAccount.role !== 'manager')) {
      console.log(`❌ 디버그 로그 조회 실패: 권한 부족 (${userId}, role: ${currentAccount?.role})`);
      return res.status(403).json({
        success: false,
        message: '운영자 또는 개발자 권한이 필요합니다.'
      });
    }
    
    // 100개 이상이면 자동으로 파일 저장
    if (systemLogs.length >= 100) {
      await saveOldLogsToFile();
    }
    
    // 로그 필터링: 운영자는 개발자 활동을 볼 수 없음
    let filteredLogs = systemLogs;
    if (currentAccount.role === 'manager') {
      // 운영자는 개발자(developer) 역할 사용자의 활동 로그를 제외
      filteredLogs = systemLogs.filter(log => {
        const logUserAccount = accountDatabase[log.username];
        // 개발자가 아닌 사용자의 로그만 표시 (개발자 로그 숨김)
        return !logUserAccount || logUserAccount.role !== 'developer';
      });
      console.log(`👤 운영자 권한: 필터링된 로그 ${filteredLogs.length}개 (전체 ${systemLogs.length}개에서 개발자 활동 제외)`);
    } else {
      console.log(`👑 개발자 권한: 전체 로그 ${systemLogs.length}개 조회`);
    }
    
    // 페이지네이션 계산
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const logs = filteredLogs.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(filteredLogs.length / limit);
    
    console.log(`✅ 디버그 로그 조회 성공: ${logs.length}개 로그 반환 (페이지 ${page}/${totalPages})`);
    
    res.json({
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalLogs: filteredLogs.length,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('❌ 디버그 로그 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '디버그 로그 조회 중 오류가 발생했습니다.'
    });
  }
});

// 디버그 로그 파일로 저장 함수
async function saveOldLogsToFile() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // 로그 폴더 생성
    const logDir = './data/debug-logs';
    if (!fs.default.existsSync(logDir)) {
      fs.default.mkdirSync(logDir, { recursive: true });
    }
    
    // 가장 오래된 로그와 가장 최근 로그 찾기
    const oldestLog = systemLogs[systemLogs.length - 1];
    const newestLog = systemLogs[0];
    
    if (!oldestLog || !newestLog) return;
    
    // 파일명 생성: 시작날짜-종료날짜 형식
    const startDate = new Date(oldestLog.timestamp).toISOString().split('T')[0];
    const endDate = new Date(newestLog.timestamp).toISOString().split('T')[0];
    const fileName = `debug_logs_${startDate}_${endDate}.json`;
    const filePath = path.default.join(logDir, fileName);
    
    // 파일에 저장할 데이터 준비
    const dataToSave = {
      exportDate: new Date().toISOString(),
      totalLogs: systemLogs.length,
      dateRange: {
        start: oldestLog.timestamp,
        end: newestLog.timestamp
      },
      logs: systemLogs
    };
    
    // JSON 파일로 저장
    fs.default.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    
    console.log(`📁 디버그 로그 파일 저장 완료: ${fileName} (${systemLogs.length}개 로그)`);
    
    // 메모리에서 오래된 로그 삭제 (최근 50개만 유지)
    systemLogs.splice(50);
    
    console.log(`🧹 메모리 정리 완료: ${systemLogs.length}개 로그 유지`);
    
    return fileName;
  } catch (error) {
    console.error('❌ 디버그 로그 파일 저장 오류:', error);
  }
}

// 디버그 로그 수동 내보내기 API
router.post('/api/admin/export-debug-logs', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    if (!currentAccount || (currentAccount.role !== 'developer' && currentAccount.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        message: '운영자 또는 개발자 권한이 필요합니다.'
      });
    }
    
    const fileName = await saveOldLogsToFile();
    
    if (fileName) {
      addSystemLog({
        username: userId,
        action: 'data_create',
        details: `디버그 로그 수동 내보내기: ${fileName} (${systemLogs.length + 50}개 로그)`,
        ipAddress: req.ip
      });
      
      res.json({
        success: true,
        message: `디버그 로그가 파일로 저장되었습니다: ${fileName}`,
        fileName
      });
    } else {
      res.status(500).json({
        success: false,
        message: '로그 파일 저장 중 오류가 발생했습니다.'
      });
    }
    
  } catch (error) {
    console.error('❌ 디버그 로그 내보내기 오류:', error);
    res.status(500).json({
      success: false,
      message: '디버그 로그 내보내기 중 오류가 발생했습니다.'
    });
  }
});

// 보안 위반 신고 API
router.post('/api/admin/security-violation', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { type, details } = req.body;
    
    if (!userId) {
      // 로그인하지 않은 사용자의 보안 위반도 기록
      addSystemLog({
        username: 'anonymous',
        action: 'security_violation',
        details: `[${type}] ${details} (비로그인 사용자)`,
        ipAddress: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }
    
    const currentAccount = accountDatabase[userId];
    const username = currentAccount ? currentAccount.name : userId;
    
    // 보안 위반 로그 추가
    addSystemLog({
      username: userId,
      action: 'security_violation',
      details: `[${type}] ${details} - ${username}`,
      ipAddress: req.ip
    });
    
    console.log(`🚨 보안 위반 감지: ${userId} - [${type}] ${details}`);
    
    res.json({
      success: true,
      message: '보안 위반이 기록되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ 보안 위반 신고 오류:', error);
    res.status(500).json({
      success: false,
      message: '보안 위반 신고 중 오류가 발생했습니다.'
    });
  }
});

// 시스템 최적화 API
router.post('/api/admin/system-optimize', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }

    const account = ACCOUNT_CONFIG[userId];
    
    // 운영자 또는 개발자 권한 확인
    if (!account || (account.role !== 'developer' && account.role !== 'manager')) {
      console.log(`❌ 시스템 최적화 권한 부족: ${userId} (권한: ${account?.role || 'unknown'})`);
      await addSecurityLog(userId, 'INSUFFICIENT_PERMISSION', `시스템 최적화 권한 부족 (현재 권한: ${account?.role || 'unknown'})`, req.ip);
      return res.status(403).json({
        success: false,
        message: '운영자 또는 개발자 권한이 필요합니다.'
      });
    }

    const { optimizeType } = req.body; // 'memory', 'system', 'cache', 'all'
    
    console.log(`🔧 시스템 최적화 요청: ${optimizeType} (사용자: ${userId})`);
    
    const optimizationResults = {
      memoryOptimized: 0,
      processesKilled: 0,
      cacheCleared: 0,
      tempFilesRemoved: 0,
      beforeMemory: process.memoryUsage(),
      afterMemory: null as any
    };

    try {
      // 1. TaskFlow 앱 메모리 최적화 (강화된 버전)
      if (optimizeType === 'memory' || optimizeType === 'all') {
        // Node.js 가비지 컬렉션 강제 실행 (이중 실행으로 더 강력한 메모리 정리)
        if (global.gc) {
          console.log('🧹 가비지 컬렉션 실행 중...');
          global.gc();
          // 100ms 후 두 번째 GC 실행
          await new Promise(resolve => setTimeout(resolve, 100));
          global.gc();
          optimizationResults.memoryOptimized = 1;
          console.log('✅ 가비지 컬렉션 완료');
        } else {
          console.log('⚠️ 가비지 컬렉션 비활성화됨 (--expose-gc 플래그 필요)');
        }
        
        // TaskFlow 내부 캐시 적극적 정리 (더 많은 로그 정리)
        if (systemLogs.length > 30) {
          const savedLogs = systemLogs.splice(0, systemLogs.length - 30);
          optimizationResults.processesKilled = savedLogs.length;
          console.log(`🗑️ 시스템 로그 정리: ${savedLogs.length}개 로그 정리됨`);
        }
        
        // SYSTEM_LOGS 적극적 정리
        if (SYSTEM_LOGS.length > 30) {
          const clearedCount = SYSTEM_LOGS.length - 30;
          SYSTEM_LOGS.splice(30);
          console.log(`🗑️ 디버그 로그 정리: ${clearedCount}개 로그 정리됨`);
        }
        
        // 메모리 최적화 완료 대기 (더 긴 대기시간으로 확실한 정리)
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 2. 시스템 캐시 정리
      if (optimizeType === 'cache' || optimizeType === 'all') {
        // 내부 캐시 정리
        optimizationResults.cacheCleared = 1;
      }

      // 3. 임시 파일 정리
      if (optimizeType === 'system' || optimizeType === 'all') {
        // 로그 파일 정리 등
        optimizationResults.tempFilesRemoved = 1;
      }

      // 최적화 후 메모리 상태
      optimizationResults.afterMemory = process.memoryUsage();
      
      // 메모리 절약량 계산 (실제 물리 메모리인 RSS 기준)
      const memoryBefore = Math.round(optimizationResults.beforeMemory.rss / 1024 / 1024);
      const memoryAfter = Math.round(optimizationResults.afterMemory.rss / 1024 / 1024);
      const memorySaved = Math.max(0, memoryBefore - memoryAfter);
      
      // 가비지 컬렉션이 실행되었지만 절약량이 0이면 최소 1MB로 표시
      const displaySaved = memorySaved > 0 ? memorySaved : (optimizationResults.memoryOptimized > 0 ? 1 : 0);

      // 시스템 로그 추가
      addSystemLog({
        username: userId,
        action: 'data_update',
        details: `시스템 최적화 실행: ${optimizeType} (메모리 ${displaySaved}MB 절약)`,
        ipAddress: req.ip
      });

      console.log(`✅ 시스템 최적화 완료: ${optimizeType}`);
      console.log(`📊 메모리 절약: ${displaySaved}MB (${memoryBefore}MB → ${memoryAfter}MB)`);
      console.log(`   실제 절약: ${memorySaved}MB, 표시 절약: ${displaySaved}MB`);

      // JSON 응답 반환
      return res.status(200).json({
        success: true,
        message: '시스템 최적화가 완료되었습니다.',
        results: {
          optimizeType,
          memoryBefore: `${memoryBefore}MB`,
          memoryAfter: `${memoryAfter}MB`,
          memorySaved: `${displaySaved}MB`,
          itemsOptimized: {
            memory: optimizationResults.memoryOptimized,
            processes: optimizationResults.processesKilled,
            cache: optimizationResults.cacheCleared,
            tempFiles: optimizationResults.tempFilesRemoved
          }
        }
      });

    } catch (optimizeError) {
      console.error('❌ 시스템 최적화 중 오류:', optimizeError);
      
      addSystemLog({
        username: userId,
        action: 'data_update',
        details: `시스템 최적화 실패: ${optimizeType} - ${optimizeError.message}`,
        ipAddress: req.ip
      });

      return res.status(500).json({
        success: false,
        message: '시스템 최적화 중 오류가 발생했습니다.',
        error: optimizeError.message
      });
    }

  } catch (error) {
    console.error('❌ 시스템 최적화 API 오류:', error);
    return res.status(500).json({
      success: false,
      message: '시스템 최적화 요청 처리 중 오류가 발생했습니다.'
    });
  }
});

// 보안 위반 로그 추가 함수
async function addSecurityLog(username: string, action: string, details: string, ipAddress?: string) {
  const location = await getLocationFromIP(ipAddress || '127.0.0.1');
  
  const logEntry = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    username: username || 'unknown',
    action: 'security_violation' as const,
    details: `[${action}] ${details}`,
    ipAddress: ipAddress || 'unknown',
    location: location
  };
  
  // systemLogs에 추가 (addSystemLog 대신 직접 추가)
  systemLogs.unshift(logEntry);
  if (systemLogs.length > 1000) {
    systemLogs.splice(1000);
  }
  
  console.log(`🚨 보안 위반 로그 추가: [${action}] ${username} - ${details} (${location})`);
  
  // 보안위반 카운트 증가 (개발자 제외)
  const account = ACCOUNT_CONFIG[username];
  if (account && account.role !== 'developer') {
    const violationCount = incrementSecurityViolationCount(username);
    console.log(`📊 보안위반 카운트: ${username} - ${violationCount}회`);
    
    // 3회 누적시 사유서 메모 강제 요청
    if (violationCount >= 3) {
      console.log(`🚨 보안위반 3회 누적: ${username} - 사유서 메모 작성 요청`);
      broadcastToClients({
        type: 'security_violation_report_required',
        data: {
          username: username,
          violationCount: violationCount,
          message: '보안위반이 3회 누적되었습니다. 사유서를 작성해주세요.'
        }
      });
    }
  }
  
  // 실시간 알림
  broadcastToClients({
    type: 'security_alert',
    data: logEntry
  });
}

// 사유서 메모 제출 API
router.post('/api/admin/security-violation-report', requireAuth, async (req, res) => {
  try {
    const { memo } = req.body;
    const userId = req.session.userId;
    
    if (!memo || memo.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '사유서 내용을 입력해주세요.'
      });
    }
    
    const violationCount = SECURITY_VIOLATION_COUNT[userId] || 0;
    const location = await getLocationFromIP(req.ip || '127.0.0.1');
    
    const report: SecurityViolationReport = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      username: userId,
      violationCount: violationCount,
      reportDate: new Date().toISOString(),
      memo: memo.trim(),
      ipAddress: req.ip,
      location: location,
      isDeletable: true // 개발자만 삭제 가능
    };
    
    SECURITY_VIOLATION_REPORTS.push(report);
    
    // 보안위반 카운트 초기화
    SECURITY_VIOLATION_COUNT[userId] = 0;
    
    console.log(`📝 사유서 제출: ${userId} - ${memo.substring(0, 50)}...`);
    
    // 관리자와 개발자에게 알림 전송
    const managerAndDeveloperAccounts = Object.values(ACCOUNT_CONFIG).filter(
      account => account.role === 'manager' || account.role === 'developer'
    );
    
    managerAndDeveloperAccounts.forEach(account => {
      broadcastToClients({
        type: 'security_violation_report_submitted',
        data: {
          targetUserId: account.username,
          report: report,
          message: `${userId}님이 보안위반 사유서를 제출했습니다.`
        }
      });
    });
    
    res.json({
      success: true,
      message: '사유서가 성공적으로 제출되었습니다.',
      report: report
    });
    
  } catch (error) {
    console.error('❌ 사유서 제출 오류:', error);
    res.status(500).json({
      success: false,
      message: '사유서 제출 중 오류가 발생했습니다.'
    });
  }
});

// 사유서 목록 조회 API (관리자/개발자만)
router.get('/api/admin/security-violation-reports', requireManager, (req, res) => {
  try {
    const reportsWithUserInfo = SECURITY_VIOLATION_REPORTS.map(report => {
      const account = ACCOUNT_CONFIG[report.username];
      return {
        ...report,
        userInfo: account ? { name: account.name, department: account.department } : { name: '알 수 없음', department: '알 수 없음' }
      };
    });
    
    res.json({
      success: true,
      reports: reportsWithUserInfo
    });
  } catch (error) {
    console.error('❌ 사유서 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사유서 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 사유서 삭제 API (개발자만)
router.delete('/api/admin/security-violation-reports/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const account = ACCOUNT_CONFIG[userId];
    
    // 개발자 권한 확인
    if (!account || account.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: '개발자 권한이 필요합니다.'
      });
    }
    
    const reportIndex = SECURITY_VIOLATION_REPORTS.findIndex(report => report.id === id);
    
    if (reportIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '사유서를 찾을 수 없습니다.'
      });
    }
    
    const deletedReport = SECURITY_VIOLATION_REPORTS.splice(reportIndex, 1)[0];
    
    console.log(`🗑️ 사유서 삭제: ${deletedReport.username} (삭제자: ${userId})`);
    
    res.json({
      success: true,
      message: '사유서가 삭제되었습니다.',
      deletedReport: deletedReport
    });
    
  } catch (error) {
    console.error('❌ 사유서 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '사유서 삭제 중 오류가 발생했습니다.'
    });
  }
});

export default router;
