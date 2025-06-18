import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthResponse, Error, RegisterData>;
  logout: () => void;
};

type LoginData = Pick<InsertUser, "username" | "password">;
type RegisterData = InsertUser;
type AuthResponse = {
  message: string;
  user: SelectUser;
  token: string;
};

// JWT 토큰 관리 유틸리티
const TOKEN_KEY = 'taskflow_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // 현재 사용자 정보 조회 (JWT 토큰 기반)
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user"],
    queryFn: async (): Promise<SelectUser | null> => {
      console.log("🔍 사용자 정보 조회 중...");
      
      const token = getToken();
      if (!token) {
        console.log("🔐 토큰 없음 - 로그인 필요");
        return null;
      }
      
      try {
        const response = await fetch("/api/me", {
          headers: getAuthHeaders()
        });

        // 로그인이 필요한 경우 (401 Unauthorized)
        if (response.status === 401) {
          console.log("🔐 토큰 만료 - 로그인 페이지로");
          removeToken();
          return null;
        }

        if (!response.ok) {
          console.error("❌ 사용자 정보 조회 실패:", response.status, response.statusText);
          
          // 403 Forbidden의 경우 토큰 제거
          if (response.status === 403) {
            removeToken();
            return null;
          }
          
          // 500 오류 등은 재시도하지 않고 null 반환
          if (response.status >= 500) {
            console.log("🚫 서버 오류 - 재시도 중단하고 null 반환");
            return null;
          }
          
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        // JSON 응답 처리
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn("⚠️ JSON이 아닌 응답 형식 - null 반환");
          return null;
        }

        let result;
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error("❌ JSON 파싱 실패:", jsonError);
          return null;
        }
        
        if (!result || !result.success || !result.user) {
          console.warn("⚠️ 사용자 정보 없음");
          return null;
        }

        console.log("✅ 사용자 정보 조회 성공:", result.user.username);
        return result.user;
        
      } catch (fetchError) {
        console.error("❌ 사용자 정보 조회 실패:", fetchError);
        
        // 네트워크 오류의 경우 null 반환
        if (fetchError instanceof Error && 
            (fetchError.message.includes('Failed to fetch') || 
             fetchError.message.includes('Network'))) {
          console.log("🌐 네트워크 오류 - null 반환");
          return null;
        }
        
        // 기타 오류도 null 반환하여 무한반복 방지
        return null;
      }
    },
    retry: (failureCount, error) => {
      console.log(`🔄 재시도 ${failureCount}회`, error);
      
      // 401 오류나 500번대 오류의 경우 재시도하지 않음
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('500')) {
          console.log('🚫 인증 오류 또는 서버 오류 - 재시도 중단');
          return false;
        }
      }
      
      // 최대 1회만 재시도
      return failureCount < 1;
    },
    retryDelay: () => 3000, // 3초 후 재시도
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분 (cacheTime 대신 gcTime 사용)
    refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 새로고침 비활성화
    refetchOnMount: false, // 마운트 시 자동 새로고침 비활성화
    refetchOnReconnect: false, // 재연결 시 자동 새로고침 비활성화
  });

  // 로그인 뮤테이션 (JWT 토큰 기반)
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData): Promise<AuthResponse> => {
      console.log("🔐 로그인 시도:", data.username);
      
      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(data),
        });

        // 500 오류 등의 경우 특별 처리
        if (response.status >= 500) {
          console.error("❌ 서버 오류:", response.status);
          throw new Error("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }

        // JSON 파싱 전에 응답 타입 확인
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error("❌ JSON이 아닌 응답:", contentType);
          throw new Error("서버 응답 형식 오류");
        }

        let result;
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error("❌ JSON 파싱 실패:", jsonError);
          throw new Error("서버 응답을 처리할 수 없습니다.");
        }
        
        if (!response.ok) {
          console.error("❌ 로그인 실패:", result);
          throw new Error(result?.message || `로그인 실패: ${response.status}`);
        }

        console.log("✅ 로그인 성공:", result);
        return result;
        
      } catch (error) {
        console.error("❌ 로그인 요청 오류:", error);
        
        // 네트워크 오류 처리
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          throw new Error("서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
        }
        
        throw error;
      }
    },
    onSuccess: (response) => {
      console.log("🎉 로그인 성공 처리:", response.user.username);
      
      // JWT 토큰 저장
      setToken(response.token);
      
      // 쿼리 캐시 업데이트
      queryClient.setQueryData(["user"], response.user);
      
      toast({
        title: "로그인 성공",
        description: `${response.user.name}님, 환영합니다!`,
      });
    },
    onError: (error: Error) => {
      console.error("❌ 로그인 오류:", error);
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 로그아웃 뮤테이션 (JWT 토큰 제거)
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      console.log("🔐 로그아웃 처리 중...");
      
      // JWT 토큰 제거
      removeToken();
      
      // 서버에 로그아웃 알림 (선택사항)
      try {
        await fetch("/api/logout", {
          method: "POST",
          headers: getAuthHeaders(),
        });
      } catch (error) {
        console.warn("로그아웃 서버 알림 실패:", error);
      }
    },
    onSuccess: () => {
      console.log("✅ 로그아웃 완료");
      
      // 쿼리 캐시 초기화
      queryClient.setQueryData(["user"], null);
      queryClient.clear();
      
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      });
      
      // 로그인 페이지로 이동
      setLocation("/auth");
    },
    onError: (error: Error) => {
      console.error("❌ 로그아웃 오류:", error);
      
      // 오류가 발생해도 로컬 정리는 수행
      removeToken();
      queryClient.setQueryData(["user"], null);
      queryClient.clear();
      setLocation("/auth");
    },
  });

  // 회원가입 뮤테이션
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData): Promise<AuthResponse> => {
      console.log("📝 회원가입 시도:", data.username);
      
      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(data),
        });

        let result;
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error("❌ JSON 파싱 실패:", jsonError);
          throw new Error("서버 응답을 처리할 수 없습니다.");
        }
        
        if (!response.ok) {
          console.error("❌ 회원가입 실패:", result);
          throw new Error(result?.message || `회원가입 실패: ${response.status}`);
        }

        console.log("✅ 회원가입 성공:", result);
        return result;
        
      } catch (error) {
        console.error("❌ 회원가입 요청 오류:", error);
        
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          throw new Error("서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
        }
        
        throw error;
      }
    },
    onSuccess: (response) => {
      console.log("🎉 회원가입 성공 처리:", response.user.username);
      
      // JWT 토큰 저장
      setToken(response.token);
      
      // 쿼리 캐시 업데이트
      queryClient.setQueryData(["user"], response.user);
      
      toast({
        title: "회원가입 성공",
        description: `${response.user.name}님, 환영합니다!`,
      });
    },
    onError: (error: Error) => {
      console.error("❌ 회원가입 오류:", error);
      toast({
        title: "회원가입 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 로그아웃 함수
  const logout = () => {
    logoutMutation.mutate();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// API 요청을 위한 헤더 유틸리티 내보내기
export { getAuthHeaders, getToken };
