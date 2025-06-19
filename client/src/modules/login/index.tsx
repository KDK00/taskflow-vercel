// 🎯 TaskFlowMaster 로그인 모듈 - 완전 리뉴얼

import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FloatingShapes } from "@/components/ui/floating-shapes";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 타입 및 설정
import { LoginData } from "./types/auth";

export default function LoginModule() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [formData, setFormData] = useState<LoginData>({
    username: "",
    password: "",
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast({
        title: "입력 오류",
        description: "사용자명과 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(formData);
  };

  const isLoading = loginMutation.isPending;

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 overflow-hidden">
      <FloatingShapes />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="glassmorphism rounded-2xl overflow-hidden animate-slideUp">
          {/* 헤더 섹션 */}
          <div className="gradient-primary text-white p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            
            <div className="relative z-10">
              {/* 로고 섹션 */}
              <div className="flex items-center justify-center mx-auto mb-6">
                <img 
                  src="/nara-logo.png" 
                  alt="NARA Logo" 
                  className="h-12 w-auto object-contain"
                />
              </div>
              
              {/* 제목 */}
              <h1 className="font-bold mb-2 tracking-tight text-white text-[25px]">
                NARA 업무관리시스템
              </h1>
              
              {/* 부제목 */}
              <p className="text-white/90 text-sm">
                계정 정보를 입력하여 로그인하세요
              </p>
            </div>
          </div>

          {/* 폼 섹션 */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* 구분선 */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/80 text-gray-500">또는</span>
                </div>
              </div>

              {/* 회원가입 섹션 */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">계정이 없으신가요?</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 transition-all duration-300 hover:-translate-y-1"
                  onClick={() => toast({
                    title: "회원가입",
                    description: "관리자에게 문의하여 계정을 생성해주세요.",
                  })}
                >
                  회원가입
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 