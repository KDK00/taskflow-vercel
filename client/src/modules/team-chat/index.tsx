// 💬 Team Chat Module - 완전 독립적 팀 채팅 모듈

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ModuleErrorBoundary } from '../core/components/ErrorBoundary';
import { apiClient } from '../core/api/client';
import { ModuleProps } from '../core/types';
import { 
  TEAM_CHAT_CONFIG,
  MESSAGE_STYLES,
  USER_STATUS_COLORS,
  EMOJI_REACTIONS,
  ChatUtils,
  buildTeamChatConfig,
  type MessageType,
  type UserStatus,
  type ChatDisplayConfig,
  type ChatNotificationConfig
} from './config';

// ⚡ 자체 UI 컴포넌트 (완전 독립적)
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md border ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-4 py-3 border-b ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);

const Button = ({ children, onClick, className = '', disabled = false, size = 'sm' }: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${size === 'sm' ? 'px-3 py-1 text-sm' : 'px-4 py-2'} bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors ${className}`}
  >
    {children}
  </button>
);

const Input = ({ placeholder, value, onChange, onKeyPress, className = '' }: {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}) => (
  <input
    type="text"
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    onKeyPress={onKeyPress}
    className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${className}`}
  />
);

const Avatar = ({ name, size = 'sm', color }: {
  name: string;
  size?: 'sm' | 'md';
  color?: string;
}) => (
  <div className={`${size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} 
    ${color || 'bg-green-500'} text-white rounded-full flex items-center justify-center font-medium`}>
    {ChatUtils.getInitials(name)}
  </div>
);

// 💬 메시지 인터페이스
interface ChatMessage {
  id: number;
  content: string;
  type: MessageType;
  userId: number;
  username: string;
  createdAt: string;
  reactions?: Array<{ emoji: string; userId: number; username: string }>;
  edited?: boolean;
  editedAt?: string;
}

// 👤 사용자 인터페이스
interface ChatUser {
  id: number;
  name: string;
  status: UserStatus;
  lastSeen?: string;
  avatar?: string;
}

// 🔧 TeamChat 모듈 Props
interface TeamChatModuleProps extends ModuleProps {
  role?: 'employee' | 'manager' | 'admin';
  environment?: 'development' | 'production' | 'test';
  displayConfig?: Partial<ChatDisplayConfig>;
  notificationConfig?: Partial<ChatNotificationConfig>;
  currentUserId?: number;
  currentUsername?: string;
  height?: string;
  enableWebSocket?: boolean;
}

// 🎯 TeamChat 모듈 내부 컴포넌트
function TeamChatModule({
  config: propConfig,
  role = 'employee',
  environment = 'production',
  displayConfig = {},
  notificationConfig = {},
  currentUserId = 1,
  currentUsername = 'User',
  height = '500px',
  enableWebSocket = true,
  ...props
}: TeamChatModuleProps) {
  // 💬 모듈 설정
  const moduleConfig = propConfig || buildTeamChatConfig({
    role,
    environment,
    display: displayConfig,
    notifications: notificationConfig
  });

  // 📊 상태 관리
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  // 📱 Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // 🌐 API 클라이언트 인스턴스
  const client = new apiClient(moduleConfig);

  // 📥 메시지 조회
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await client.get('/api/team/messages');
      
      if (response.success && response.data) {
        const messageData = response.data.messages || response.data;
        setMessages(Array.isArray(messageData) ? messageData : []);
      } else {
        throw new Error(response.error || '메시지를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('❌ TeamChat 메시지 조회 실패:', err);
      setError(err instanceof Error ? err.message : '메시지 조회 중 오류가 발생했습니다.');
      
      // 모의 데이터로 폴백
      setMessages([
        {
          id: 1,
          content: '안녕하세요! 팀 채팅에 오신 것을 환영합니다.',
          type: 'text',
          userId: 0,
          username: 'System',
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  // 👥 사용자 목록 조회
  const fetchUsers = useCallback(async () => {
    try {
      const response = await client.get('/api/team/users');
      
      if (response.success && response.data) {
        const userData = response.data.users || response.data;
        setUsers(Array.isArray(userData) ? userData : []);
      }
    } catch (err) {
      console.error('❌ TeamChat 사용자 조회 실패:', err);
      
      // 모의 데이터로 폴백
      setUsers([
        { id: currentUserId, name: currentUsername, status: 'online' },
        { id: 2, name: '김동료', status: 'online' },
        { id: 3, name: '이매니저', status: 'away' },
        { id: 4, name: '박팀장', status: 'busy' }
      ]);
    }
  }, [client, currentUserId, currentUsername]);

  // 📤 메시지 전송
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;

    const tempMessage: ChatMessage = {
      id: Date.now(),
      content: newMessage,
      type: 'text',
      userId: currentUserId,
      username: currentUsername,
      createdAt: new Date().toISOString()
    };

    // 즉시 UI 업데이트
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      const response = await client.post('/api/team/messages', {
        content: newMessage,
        type: 'text'
      });

      if (response.success && response.data) {
        // 서버 응답으로 임시 메시지 교체
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id ? { ...response.data, id: response.data.id } : msg
          )
        );
      }
    } catch (err) {
      console.error('❌ 메시지 전송 실패:', err);
      // 실패 시 메시지 제거 또는 오류 표시
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  }, [newMessage, currentUserId, currentUsername, client]);

  // 🎭 이모지 반응 추가
  const addReaction = useCallback(async (messageId: number, emoji: string) => {
    try {
      await client.post(`/api/team/messages/${messageId}/reactions`, {
        emoji,
        userId: currentUserId,
        username: currentUsername
      });

      // 즉시 UI 업데이트
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? {
              ...msg,
              reactions: [
                ...(msg.reactions || []),
                { emoji, userId: currentUserId, username: currentUsername }
              ]
            }
          : msg
      ));
    } catch (err) {
      console.error('❌ 이모지 반응 추가 실패:', err);
    }
  }, [currentUserId, currentUsername, client]);

  // ⌨️ 키보드 이벤트 처리
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 📜 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 🚀 초기 로드 및 주기적 업데이트
  useEffect(() => {
    if (moduleConfig.refreshOnMount) {
      fetchMessages();
    }

    // 자동 새로고침 비활성화: updateInterval이 0이면 setInterval 실행하지 않음
    if (moduleConfig.updateInterval > 0) {
      const interval = setInterval(fetchMessages, moduleConfig.updateInterval);
      return () => clearInterval(interval);
    }
  }, []);

  // 📜 새 메시지 시 자동 스크롤
  useEffect(() => {
    if ((moduleConfig as any).display?.autoScroll !== false) {
      scrollToBottom();
    }
  }, [messages, moduleConfig]);

  // 📱 메시지 렌더링
  const renderMessage = (message: ChatMessage, index: number) => {
    const isOwn = message.userId === currentUserId;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const shouldGroup = ChatUtils.shouldGroupMessage(
      message, 
      prevMessage, 
      (moduleConfig as any).display?.messageGroups || 5
    );

    const styleKey = message.type === 'system' ? 'system' : (isOwn ? 'own' : 'other');
    const messageStyle = MESSAGE_STYLES[styleKey];

    return (
      <div key={message.id} className={`mb-2 ${isOwn ? 'flex justify-end' : 'flex justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
          {!shouldGroup && !isOwn && (
            <div className="flex items-center mb-1">
              <Avatar name={message.username} size="sm" color={ChatUtils.getUserColor(message.userId)} />
              <span className="ml-2 text-sm font-medium text-gray-600">{message.username}</span>
            </div>
          )}
          
          <div className={`px-3 py-2 rounded-lg ${messageStyle.background} ${messageStyle.text} 
            ${isOwn ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
            <div className="text-sm" dangerouslySetInnerHTML={{ 
              __html: ChatUtils.parseLinks(message.content) 
            }} />
            
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(ChatUtils.getReactionCounts(message.reactions)).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    onClick={() => addReaction(message.id, emoji)}
                    className="text-xs bg-white bg-opacity-20 rounded px-2 py-1 hover:bg-opacity-30"
                  >
                    {emoji} {count}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {!shouldGroup && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {ChatUtils.formatTime(message.createdAt)}
              </span>
              
              {!isOwn && (
                <div className="flex gap-1">
                  {EMOJI_REACTIONS.slice(0, 3).map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => addReaction(message.id, emoji)}
                      className="text-xs hover:bg-gray-200 rounded px-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 👥 사용자 목록 렌더링
  const renderUserList = () => (
    <div className="border-l border-gray-200 w-48 p-4">
      <h4 className="font-medium text-gray-900 mb-3">팀 멤버 ({users.length})</h4>
      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className="flex items-center space-x-2">
            <div className="relative">
              <Avatar name={user.name} size="sm" color={ChatUtils.getUserColor(user.id)} />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white 
                ${USER_STATUS_COLORS[user.status]}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
              <div className="text-xs text-gray-500 capitalize">{user.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 📱 메인 렌더링
  return (
    <Card className={`team-chat-module ${moduleConfig.styling?.className || ''}`} style={{ height }}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>💬 팀 채팅</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{users.filter(u => u.status === 'online').length}명 온라인</span>
            <Button onClick={fetchMessages} size="sm">↻</Button>
          </div>
        </div>
      </CardHeader>

      <div className="flex flex-1 overflow-hidden">
        {/* 메시지 영역 */}
        <div className="flex-1 flex flex-col">
          <CardContent className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100% - 120px)' }}>
            {/* ⚠️ 에러 상태 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}

            {/* 🔄 로딩 상태 */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                <span className="ml-2 text-gray-600">메시지를 불러오는 중...</span>
              </div>
            )}

            {/* 💬 메시지 목록 */}
            {!loading && (
              <div className="space-y-1">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    💬 아직 메시지가 없습니다. 첫 메시지를 보내보세요!
                  </div>
                ) : (
                  messages.map(renderMessage)
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* ⌨️ 타이핑 표시 */}
            {typingUsers.length > 0 && (
              <div className="text-sm text-gray-500 italic">
                {typingUsers.join(', ')}님이 입력 중...
              </div>
            )}
          </CardContent>

          {/* 📝 메시지 입력 */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <Input
                ref={messageInputRef}
                placeholder="메시지를 입력하세요..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                보내기
              </Button>
            </div>
          </div>
        </div>

        {/* 👥 사용자 목록 */}
        {(moduleConfig as any).display?.showUserList !== false && renderUserList()}
      </div>
    </Card>
  );
}

// 🛡️ 에러 경계와 함께 내보내기
const TeamChatModuleWithErrorBoundary: React.FC<TeamChatModuleProps> = (props) => (
  <ModuleErrorBoundary moduleName="TeamChat">
    <TeamChatModule {...props} />
  </ModuleErrorBoundary>
);

export default TeamChatModuleWithErrorBoundary;

// 📦 편의 함수들 내보내기
export {
  buildTeamChatConfig,
  MESSAGE_STYLES,
  USER_STATUS_COLORS,
  EMOJI_REACTIONS,
  ChatUtils,
  type MessageType,
  type UserStatus,
  type ChatDisplayConfig,
  type ChatNotificationConfig,
  type ChatMessage,
  type ChatUser
}; 