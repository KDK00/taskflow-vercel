import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, Users, Clock, Smile, Paperclip, Hash } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";

interface Message {
  id: number;
  content: string;
  userId: number;
  userName: string;
  userDepartment: string;
  channel: string;
  createdAt: string;
  type: "text" | "system" | "file";
}

interface Channel {
  id: string;
  name: string;
  description: string;
  memberCount: number;
}

export function TeamChat() {
  const { user } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState("general");
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // 가상 채널 데이터
  const channels: Channel[] = [
    { id: "general", name: "일반", description: "일반적인 업무 및 공지사항", memberCount: 7 },
    { id: "development", name: "개발팀", description: "개발 관련 논의", memberCount: 4 },
    { id: "design", name: "디자인팀", description: "디자인 및 UI/UX 논의", memberCount: 3 },
    { id: "marketing", name: "홍보팀", description: "마케팅 및 홍보 활동", memberCount: 2 },
    { id: "urgent", name: "긴급", description: "긴급 사안 처리", memberCount: 7 },
  ];

  // 메시지 조회
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/chat", selectedChannel],
    queryFn: async () => {
      // 실제 구현에서는 서버에서 메시지를 가져옴
      // 하드코딩된 샘플 메시지 제거 - 실제 서버 연동 시 구현 예정
      return [];
    },
    refetchInterval: 5000, // 5초마다 새 메시지 확인
  });

  // 메시지 전송
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // 실제 구현에서는 서버로 메시지 전송
      console.log("메시지 전송:", {
        content,
        channel: selectedChannel,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      // 임시로 메시지 추가 (실제로는 서버에서 처리)
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat", selectedChannel] });
    }
  });

  // 메시지 전송 핸들러
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  // 엔터키로 메시지 전송
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 타이핑 상태 관리
  useEffect(() => {
    if (newMessage) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [newMessage]);

  const getMessageTime = (createdAt: string) => {
    const messageDate = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "방금 전";
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return format(messageDate, "HH:mm");
    return format(messageDate, "MM/dd HH:mm");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        <span className="ml-3 text-gray-600">채팅방을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] gap-6">
      {/* 채널 목록 사이드바 */}
      <Card className="w-64 glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Hash className="w-5 h-5 mr-2 text-purple-600" />
            채널
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedChannel === channel.id
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">#{channel.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {channel.memberCount}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 truncate">
                {channel.description}
              </p>
            </button>
          ))}
          
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <Users className="w-4 h-4 mr-2" />
              온라인 사용자
            </div>
            <div className="space-y-2 text-sm">
              {/* 하드코딩된 온라인 사용자 목록 제거 - 실제 서버 연동 시 구현 예정 */}
              <div className="text-gray-500 text-xs">
                온라인 사용자 정보를 불러오는 중...
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메인 채팅 영역 */}
      <Card className="flex-1 flex flex-col glass-card">
        {/* 채팅 헤더 */}
        <CardHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <MessageCircle className="w-6 h-6 mr-2 text-purple-600" />
                #{channels.find(c => c.id === selectedChannel)?.name}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {channels.find(c => c.id === selectedChannel)?.description}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-100 text-green-800">
                <Users className="w-3 h-3 mr-1" />
                {channels.find(c => c.id === selectedChannel)?.memberCount}명 온라인
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* 메시지 목록 */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>채팅을 시작해보세요!</p>
              <p className="text-sm">첫 번째 메시지를 보내서 대화를 시작해보세요.</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={
                      message.type === "system" 
                        ? "bg-blue-100 text-blue-600"
                        : message.userId === user?.id
                        ? "bg-purple-100 text-purple-600"
                        : "bg-gray-100 text-gray-600"
                    }>
                      {message.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {message.userName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.userDepartment}
                      </span>
                      <span className="text-xs text-gray-400">
                        {getMessageTime(message.createdAt)}
                      </span>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      message.type === "system"
                        ? "bg-blue-50 border border-blue-200 text-blue-800"
                        : message.userId === user?.id
                        ? "bg-purple-100 border border-purple-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {sendMessageMutation.isPending && (
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      {user?.name?.charAt(0) || "나"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{user?.name || "나"}</span>
                      <span className="text-xs text-gray-500">{user?.department || "일반"}</span>
                      <span className="text-xs text-gray-400">전송 중...</span>
                    </div>
                    <div className="bg-purple-100 border border-purple-200 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-bounce w-2 h-2 bg-purple-600 rounded-full" />
                        <div className="animate-bounce w-2 h-2 bg-purple-600 rounded-full" style={{ animationDelay: "0.1s" }} />
                        <div className="animate-bounce w-2 h-2 bg-purple-600 rounded-full" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* 메시지 입력 */}
        <div className="border-t border-gray-200 p-4">
          {isTyping && (
            <div className="text-xs text-gray-500 mb-2 flex items-center">
              <div className="flex space-x-1 mr-2">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
              입력 중...
            </div>
          )}
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <Textarea
                placeholder={`#${channels.find(c => c.id === selectedChannel)?.name}에 메시지 보내기...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={2}
                className="resize-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Smile className="w-4 h-4" />
              </Button>
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                className="btn-primary"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 