// 🚀 NARA 로그인 시스템 - 완전 모듈화 버전
// 이 파일을 복사하면 다른 프로젝트에서도 즉시 사용 가능

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Lock, Crown } from "lucide-react";

// 🎯 설정 가능한 Props 타입
export interface LoginSystemConfig {
  // 브랜딩
  title?: string;
  subtitle?: string;
  logoSrc?: string;
  logoAlt?: string;
  
  // 색상 (CSS 변수로 오버라이드 가능)
  primaryColor?: string;
  secondaryColor?: string;
  
  // API 엔드포인트
  apiEndpoints?: {
    login: string;
    logout: string;
    me: string;
  };
  
  // 테스트 계정 설정
  testAccounts?: TestAccount[];
  showTestAccounts?: boolean;
  
  // 콜백 함수들
  onLoginSuccess?: (user: User) => void;
  onLoginError?: (error: string) => void;
  onLogout?: () => void;
  
  // 커스텀 검증 함수
  customValidation?: (username: string, password: string) => Promise<User | null>;
  
  // 스타일 커스터마이징
  className?: string;
  cardClassName?: string;
  testPanelClassName?: string;
}

// 🎯 기본 타입 정의
export interface LoginData {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'manager' | 'employee' | string;
  department: string;
  [key: string]: any; // 확장 가능
}

export interface TestAccount extends User {
  password: string;
}

// 🎯 기본 설정값
const DEFAULT_CONFIG: Required<LoginSystemConfig> = {
  title: "NARA 업무관리시스템",
  subtitle: "계정 정보를 입력하여 로그인하세요",
  logoSrc: "/nara-logo.png",
  logoAlt: "NARA Logo",
  primaryColor: "#667eea",
  secondaryColor: "#764ba2",
  apiEndpoints: {
    login: "/api/login",
    logout: "/api/logout",
    me: "/api/me"
  },
  testAccounts: [
    {
      id: "admin",
      username: "admin",
      password: "admin",
      name: "김동규",
      role: "manager",
      department: "개발자"
    },
    {
      id: "nara0",
      username: "nara0",
      password: "nara0",
      name: "관리자",
      role: "manager",
      department: "경영지원팀"
    },
    {
      id: "nara1",
      username: "nara1",
      password: "nara1",
      name: "송나영",
      role: "employee",
      department: "경영지원팀"
    }
  ],
  showTestAccounts: true,
  onLoginSuccess: () => {},
  onLoginError: () => {},
  onLogout: () => {},
  customValidation: async () => null,
  className: "",
  cardClassName: "",
  testPanelClassName: ""
};

// 🎯 기본 API 함수들
class LoginAPI {
  private endpoints: Required<LoginSystemConfig>['apiEndpoints'];
  
  constructor(endpoints: Required<LoginSystemConfig>['apiEndpoints']) {
    this.endpoints = endpoints;
  }
  
  async login(credentials: LoginData): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const response = await fetch(this.endpoints.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: '네트워크 오류가 발생했습니다.'
      };
    }
  }
  
  async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(this.endpoints.logout, {
        method: 'POST',
        credentials: 'include'
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: '로그아웃 중 오류가 발생했습니다.'
      };
    }
  }
  
  async getUser(): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const response = await fetch(this.endpoints.me, {
        credentials: 'include'
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: '사용자 정보를 가져올 수 없습니다.'
      };
    }
  }
}

// 🎯 플로팅 도형 컴포넌트
const FloatingShapes: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-pulse delay-1000"></div>
    <div className="absolute top-3/4 left-1/2 w-32 h-32 bg-white/7 rounded-full blur-2xl animate-pulse delay-500"></div>
  </div>
);

// 🎯 테스트 계정 패널 컴포넌트
interface TestAccountPanelProps {
  accounts: TestAccount[];
  onAccountSelect: (account: TestAccount) => void;
  selectedAccountId: string | null;
  isLoading: boolean;
  className?: string;
}

const TestAccountPanel: React.FC<TestAccountPanelProps> = ({
  accounts,
  onAccountSelect,
  selectedAccountId,
  isLoading,
  className = ""
}) => (
  <div className={`w-full max-w-md ${className}`}>
    <div className="animate-slideUp">
      {/* 헤더 */}
      <div className="bg-white/10 backdrop-blur-sm text-white p-4 text-center rounded-t-xl border border-white/20">
        <h2 className="font-bold text-white text-lg">테스트 계정</h2>
      </div>
      
      {/* 계정 목록 */}
      <div className="bg-white/5 backdrop-blur-sm p-6 space-y-3 border-l border-r border-white/20">
        {accounts.map((account) => (
          <Button
            key={account.id}
            variant="ghost"
            onClick={() => onAccountSelect(account)}
            disabled={isLoading}
            className={`
              w-full h-auto p-4 bg-white/5 hover:bg-white/10 border border-white/10 
              hover:border-white/20 rounded-xl transition-all duration-200
              ${selectedAccountId === account.id ? 'bg-white/15 border-white/30' : ''}
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}
              group
            `}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  {account.role === 'manager' ? (
                    <Crown className="w-5 h-5 text-red-400" />
                  ) : (
                    <User className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                
                <div className="text-left">
                  <div className="font-semibold text-white text-sm">
                    {account.name}
                  </div>
                  <div className="text-white/60 text-xs">
                    {account.department}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-1">
                <span className={`
                  px-2 py-1 rounded-md text-xs font-medium
                  ${account.role === 'developer' 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : account.role === 'manager' 
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }
                `}>
                  {account.role === 'developer' ? '개발자' : account.role === 'manager' ? '관리자' : '직원'}
                </span>
                <span className="text-white/40 text-xs">
                  ID: {account.username}
                </span>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* 안내 메시지 */}
      <div className="bg-white/5 backdrop-blur-sm px-6 pb-6 rounded-b-xl border-l border-r border-b border-white/20">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white/70 text-xs text-center leading-relaxed">
            계정을 클릭하면 자동 로그인됩니다
          </p>
        </div>
      </div>
    </div>
  </div>
);

// 🎯 메인 로그인 시스템 컴포넌트
export const LoginSystem: React.FC<LoginSystemConfig> = (props) => {
  const config = { ...DEFAULT_CONFIG, ...props };
  const [formData, setFormData] = useState<LoginData>({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTestAccount, setSelectedTestAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const api = new LoginAPI(config.apiEndpoints);

  // CSS 변수 설정
  const cssVariables = {
    '--login-primary': config.primaryColor,
    '--login-secondary': config.secondaryColor,
  } as React.CSSProperties;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (credentials: LoginData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let result;
      
      // 커스텀 검증 함수가 있으면 사용
      if (config.customValidation) {
        const user = await config.customValidation(credentials.username, credentials.password);
        if (user) {
          result = { success: true, user };
        } else {
          result = { success: false, message: '사용자명 또는 비밀번호가 올바르지 않습니다.' };
        }
      } else {
        // 기본 API 사용
        result = await api.login(credentials);
      }
      
      if (result.success && result.user) {
        config.onLoginSuccess(result.user);
      } else {
        const errorMessage = result.message || '로그인에 실패했습니다.';
        setError(errorMessage);
        config.onLoginError(errorMessage);
      }
    } catch (error) {
      const errorMessage = '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
      config.onLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError('사용자명과 비밀번호를 모두 입력해주세요.');
      return;
    }
    handleLogin(formData);
  };

  const handleTestAccountLogin = (account: TestAccount) => {
    setSelectedTestAccount(account.id);
    setFormData({ username: account.username, password: account.password });
    handleLogin({ username: account.username, password: account.password });
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 overflow-hidden ${config.className}`}
      style={{
        background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`,
        ...cssVariables
      }}
    >
      <FloatingShapes />
      
      <div className="relative z-10 w-full max-w-6xl flex items-center justify-center gap-8">
        {/* 메인 로그인 카드 */}
        <div className="w-full max-w-md relative">
          <div className={`glassmorphism rounded-2xl overflow-hidden animate-slideUp ${config.cardClassName}`}>
            {/* 헤더 섹션 */}
            <div 
              className="text-white p-8 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
              
              <div className="relative z-10">
                {/* 로고 */}
                <div className="flex items-center justify-center mx-auto mb-6">
                  <img 
                    src={config.logoSrc} 
                    alt={config.logoAlt} 
                    className="h-12 w-auto object-contain"
                  />
                </div>
                
                {/* 제목 */}
                <h1 className="font-bold mb-2 tracking-tight text-white text-[25px]">
                  {config.title}
                </h1>
                
                {/* 부제목 */}
                <p className="text-white/90 text-sm">
                  {config.subtitle}
                </p>
              </div>
            </div>

            {/* 폼 섹션 */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 에러 메시지 */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* 사용자명 입력 */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                    사용자명
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="사용자명을 입력하세요"
                      className="input-glass pl-10"
                      required
                    />
                  </div>
                </div>

                {/* 비밀번호 입력 */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                    비밀번호
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="비밀번호를 입력하세요"
                      className="input-glass pl-10 pr-12"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 로그인 버튼 */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary"
                  style={{
                    background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      로그인 중...
                    </div>
                  ) : (
                    "로그인"
                  )}
                </Button>

                {/* 테스트 계정 안내 */}
                {config.showTestAccounts && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <p className="text-xs text-gray-600 text-center">
                      <strong>테스트 계정:</strong> 오른쪽 계정 목록에서 클릭하여 자동 로그인
                    </p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* 테스트 계정 패널 */}
        {config.showTestAccounts && (
          <TestAccountPanel
            accounts={config.testAccounts}
            onAccountSelect={handleTestAccountLogin}
            selectedAccountId={selectedTestAccount}
            isLoading={isLoading}
            className={config.testPanelClassName}
          />
        )}
      </div>
    </div>
  );
};

// 🎯 필수 CSS 스타일 (이것을 index.css에 추가해야 함)
export const LOGIN_SYSTEM_CSS = `
/* 글래스모피즘 효과 */
.glassmorphism {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 입력 필드 글래스 효과 */
.input-glass {
  height: 56px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  font-size: 16px;
  padding: 0 16px;
  transition: all 0.3s ease;
}

.input-glass:focus {
  background: rgba(255, 255, 255, 1);
  border-color: var(--login-primary, #667eea);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 기본 버튼 스타일 */
.btn-primary {
  height: 56px;
  border: none;
  border-radius: 16px;
  color: white;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

/* 슬라이드업 애니메이션 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slideUp {
  animation: slideUp 0.6s ease-out;
}

/* 반짝임 효과 */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-shimmer {
  animation: shimmer 3s infinite;
}
`;

export default LoginSystem; 