// 💬 Team Chat Module Config - 완전 독립적 설정

import { ModuleConfig } from '../core/types';

export const TEAM_CHAT_CONFIG: ModuleConfig = {
  endpoints: {
    primary: '/api/team/messages',
    fallback: [
      '/api/chat/messages',
      '/api/team/chat'
    ]
  },
  updateInterval: 5000, // 5초마다 업데이트 (실시간 채팅)
  enableRealtime: true,
  retryAttempts: 3,
  timeout: 8000,
  styling: {
    theme: 'auto',
    colorScheme: 'green',
    size: 'md',
    className: 'team-chat-module'
  },
  permissions: ['read:messages', 'write:messages']
};

// 💬 메시지 타입
export type MessageType = 'text' | 'file' | 'image' | 'system' | 'notification';

// 👤 사용자 상태
export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

// 🎨 메시지 스타일 설정
export interface MessageStyleConfig {
  [key: string]: {
    background: string;
    border: string;
    text: string;
    icon?: string;
  };
}

export const MESSAGE_STYLES: MessageStyleConfig = {
  own: {
    background: 'bg-green-500',
    border: 'border-green-600',
    text: 'text-white',
    icon: '👤'
  },
  other: {
    background: 'bg-gray-100',
    border: 'border-gray-200',
    text: 'text-gray-900',
    icon: '💬'
  },
  system: {
    background: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: '🔔'
  },
  notification: {
    background: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: '⚠️'
  },
  file: {
    background: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    icon: '📎'
  },
  image: {
    background: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-800',
    icon: '🖼️'
  }
};

// 👥 사용자 상태 색상
export const USER_STATUS_COLORS = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500'
};

// 📱 이모지 설정
export const EMOJI_REACTIONS = [
  '👍', '👎', '❤️', '😄', '😮', '😢', '😡', '👏', '🎉', '🔥'
];

// 🔧 환경별 설정
export function getTeamChatConfigForEnvironment(env: 'development' | 'production' | 'test'): ModuleConfig {
  const baseConfig = { ...TEAM_CHAT_CONFIG };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        updateInterval: 2000, // 개발 환경에서는 2초마다
        retryAttempts: 1,
        styling: {
          ...baseConfig.styling,
          className: `${baseConfig.styling?.className} dev-mode`
        }
      };

    case 'production':
      return {
        ...baseConfig,
        updateInterval: 10000, // 운영 환경에서는 10초마다
        retryAttempts: 5,
        timeout: 12000
      };

    case 'test':
      return {
        ...baseConfig,
        endpoints: {
          primary: '/api/mock/chat',
          fallback: []
        },
        enableRealtime: false,
        updateInterval: 0
      };

    default:
      return baseConfig;
  }
}

// 🎯 역할별 설정
export function getTeamChatConfigForRole(role: 'employee' | 'manager' | 'admin'): Partial<ModuleConfig> {
  switch (role) {
    case 'manager':
    case 'admin':
      return {
        endpoints: {
          primary: '/api/team/messages/all',
          fallback: ['/api/chat/admin', '/api/messages/manage']
        },
        permissions: ['read:all-messages', 'write:messages', 'delete:messages', 'manage:chat']
      };

    case 'employee':
    default:
      return {
        endpoints: {
          primary: '/api/team/messages',
          fallback: ['/api/chat/messages', '/api/my-messages']
        },
        permissions: ['read:messages', 'write:messages']
      };
  }
}

// 🎨 표시 옵션 설정
export interface ChatDisplayConfig {
  maxMessages?: number;
  showUserList?: boolean;
  showTimestamps?: boolean;
  showAvatars?: boolean;
  showTypingIndicator?: boolean;
  enableEmojis?: boolean;
  enableFileUpload?: boolean;
  enableImageUpload?: boolean;
  autoScroll?: boolean;
  compactMode?: boolean;
  showOnlineStatus?: boolean;
  groupMessages?: boolean;
  messageGroups?: number; // 같은 사용자의 연속 메시지 그룹핑 시간(분)
}

export const DEFAULT_CHAT_DISPLAY_CONFIG: ChatDisplayConfig = {
  maxMessages: 100,
  showUserList: true,
  showTimestamps: true,
  showAvatars: true,
  showTypingIndicator: true,
  enableEmojis: true,
  enableFileUpload: true,
  enableImageUpload: true,
  autoScroll: true,
  compactMode: false,
  showOnlineStatus: true,
  groupMessages: true,
  messageGroups: 5 // 5분 이내 연속 메시지는 그룹핑
};

// 🔔 알림 설정
export interface ChatNotificationConfig {
  enableSound?: boolean;
  enableDesktop?: boolean;
  enableMention?: boolean;
  soundFile?: string;
  mentionKeywords?: string[];
  muteUntil?: Date;
  onlyMentions?: boolean;
}

export const DEFAULT_CHAT_NOTIFICATION_CONFIG: ChatNotificationConfig = {
  enableSound: true,
  enableDesktop: false,
  enableMention: true,
  soundFile: '/sounds/notification.mp3',
  mentionKeywords: [],
  onlyMentions: false
};

// 📊 채팅 통계 설정
export interface ChatStatsConfig {
  showMessageCount?: boolean;
  showActiveUsers?: boolean;
  showLastActivity?: boolean;
  refreshInterval?: number;
}

export const DEFAULT_CHAT_STATS_CONFIG: ChatStatsConfig = {
  showMessageCount: true,
  showActiveUsers: true,
  showLastActivity: true,
  refreshInterval: 30000 // 30초마다 통계 업데이트
};

// 🔧 커스텀 설정 빌더
export function buildTeamChatConfig(options: {
  role?: 'employee' | 'manager' | 'admin';
  environment?: 'development' | 'production' | 'test';
  endpoints?: { primary: string; fallback?: string[] };
  display?: Partial<ChatDisplayConfig>;
  notifications?: Partial<ChatNotificationConfig>;
  stats?: Partial<ChatStatsConfig>;
  realtime?: boolean;
}): ModuleConfig {
  const {
    role = 'employee',
    environment = 'production',
    endpoints,
    display = {},
    notifications = {},
    stats = {},
    realtime = true
  } = options;

  let config = getTeamChatConfigForEnvironment(environment);
  const roleConfig = getTeamChatConfigForRole(role);
  
  // 역할별 설정 병합
  config = { ...config, ...roleConfig };
  
  // 커스텀 엔드포인트 적용
  if (endpoints) {
    config.endpoints = endpoints;
  }

  // 실시간 설정 적용
  config.enableRealtime = realtime;

  // 메타데이터로 표시/알림/통계 설정 저장
  (config as any).display = { ...DEFAULT_CHAT_DISPLAY_CONFIG, ...display };
  (config as any).notifications = { ...DEFAULT_CHAT_NOTIFICATION_CONFIG, ...notifications };
  (config as any).stats = { ...DEFAULT_CHAT_STATS_CONFIG, ...stats };

  return config;
}

// 💬 채팅 유틸리티 함수들
export const ChatUtils = {
  // 🕐 시간 포맷팅
  formatTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return d.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 24 * 7) {
      return d.toLocaleDateString('ko-KR', { 
        weekday: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return d.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  },

  // 👤 사용자 이니셜 생성
  getInitials: (name: string): string => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  },

  // 🎨 사용자별 색상 생성
  getUserColor: (userId: number | string): string => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    
    const index = typeof userId === 'number' 
      ? userId % colors.length 
      : userId.length % colors.length;
    
    return colors[index];
  },

  // 📱 멘션 검사
  hasMention: (message: string, username: string, keywords: string[] = []): boolean => {
    const mentionPattern = new RegExp(`@${username}\\b`, 'i');
    const keywordPattern = keywords.length > 0 
      ? new RegExp(keywords.join('|'), 'i')
      : null;
    
    return mentionPattern.test(message) || (keywordPattern && keywordPattern.test(message));
  },

  // 🔗 링크 검출
  parseLinks: (text: string): string => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');
  },

  // 💬 메시지 그룹핑 검사
  shouldGroupMessage: (
    currentMessage: any, 
    previousMessage: any, 
    groupTimeMinutes: number = 5
  ): boolean => {
    if (!previousMessage || currentMessage.userId !== previousMessage.userId) {
      return false;
    }
    
    const currentTime = new Date(currentMessage.createdAt).getTime();
    const previousTime = new Date(previousMessage.createdAt).getTime();
    const diffInMinutes = (currentTime - previousTime) / (1000 * 60);
    
    return diffInMinutes <= groupTimeMinutes;
  },

  // 📁 파일 크기 포맷팅
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  // 🎭 이모지 반응 카운트
  getReactionCounts: (reactions: any[]): Record<string, number> => {
    return reactions.reduce((acc, reaction) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    }, {});
  }
};

// 🎵 사운드 설정
export const CHAT_SOUNDS = {
  newMessage: '/sounds/message.mp3',
  mention: '/sounds/mention.mp3',
  join: '/sounds/join.mp3',
  leave: '/sounds/leave.mp3',
  notification: '/sounds/notification.mp3'
};

// 🚫 금지어 필터 (기본값)
export const DEFAULT_FORBIDDEN_WORDS = [
  // 기본적인 금지어들 (필요에 따라 추가/수정)
];

// 📝 메시지 템플릿
export const MESSAGE_TEMPLATES = {
  welcome: '👋 {username}님이 팀에 합류했습니다!',
  goodbye: '👋 {username}님이 나갔습니다.',
  taskAssigned: '📋 {username}님에게 새로운 업무가 할당되었습니다: {taskTitle}',
  taskCompleted: '✅ {username}님이 업무를 완료했습니다: {taskTitle}',
  mention: '@{username} {message}',
  reminder: '⏰ 알림: {message}'
};

// 🎯 기본 설정
export const defaultConfig: ModuleConfig = {
  // 📊 데이터 설정
  apiEndpoint: '/api/chat/messages',
  refreshOnMount: true,
  updateInterval: 0, // 자동 새로고침 비활성화

  endpoints: {
    primary: '/api/team/messages',
    fallback: [
      '/api/chat/messages',
      '/api/team/chat'
    ]
  },
  enableRealtime: true,
  retryAttempts: 3,
  timeout: 8000,
  styling: {
    theme: 'auto',
    colorScheme: 'green',
    size: 'md',
    className: 'team-chat-module'
  },
  permissions: ['read:messages', 'write:messages']
}; 