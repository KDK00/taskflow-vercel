// 🔐 로그인 폼 컴포넌트

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Lock } from "lucide-react";
import { LoginData } from "../types/auth";

interface LoginFormProps {
  onSubmit: (data: LoginData) => void;
  isLoading: boolean;
  loginData: LoginData;
  setLoginData: (data: LoginData) => void;
}

export function LoginForm({ onSubmit, isLoading, loginData, setLoginData }: LoginFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(loginData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="login-username">사용자 아이디</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="login-username"
            type="text"
            placeholder="아이디를 입력하세요"
            value={loginData.username}
            onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
            className="pl-10 h-12 rounded-xl border-gray-200 input-focus"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="login-password">비밀번호</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="login-password"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            className="pl-10 h-12 rounded-xl border-gray-200 input-focus"
            required
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full h-12 btn-primary rounded-xl font-semibold"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            로그인 중...
          </>
        ) : (
          "로그인"
        )}
      </Button>
    </form>
  );
} 