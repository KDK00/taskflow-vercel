// 🔐 회원가입 폼 컴포넌트

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Lock, Mail, Building2 } from "lucide-react";
import { RegisterData } from "../types/auth";

interface RegisterFormProps {
  onSubmit: (data: RegisterData) => void;
  isLoading: boolean;
  registerData: RegisterData;
  setRegisterData: (data: RegisterData) => void;
}

export function RegisterForm({ onSubmit, isLoading, registerData, setRegisterData }: RegisterFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(registerData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="register-username">아이디</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="register-username"
              type="text"
              placeholder="아이디"
              value={registerData.username}
              onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
              className="pl-10 h-12 rounded-xl border-gray-200 input-focus"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="register-name">이름</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="register-name"
              type="text"
              placeholder="이름"
              value={registerData.name}
              onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
              className="pl-10 h-12 rounded-xl border-gray-200 input-focus"
              required
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="register-email">이메일</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="register-email"
            type="email"
            placeholder="이메일 주소"
            value={registerData.email}
            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
            className="pl-10 h-12 rounded-xl border-gray-200 input-focus"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="register-password">비밀번호</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="register-password"
            type="password"
            placeholder="비밀번호"
            value={registerData.password}
            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
            className="pl-10 h-12 rounded-xl border-gray-200 input-focus"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="register-department">부서</Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="register-department"
            type="text"
            placeholder="부서명"
            value={registerData.department}
            onChange={(e) => setRegisterData({ ...registerData, department: e.target.value })}
            className="pl-10 h-12 rounded-xl border-gray-200 input-focus"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="register-role">역할</Label>
        <Select 
          value={registerData.role} 
          onValueChange={(value: "employee" | "manager") => 
            setRegisterData({ ...registerData, role: value })
          }
        >
          <SelectTrigger className="h-12 rounded-xl border-gray-200">
            <SelectValue placeholder="역할을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="employee">직원</SelectItem>
            <SelectItem value="manager">관리자</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button 
        type="submit" 
        className="w-full h-12 btn-primary rounded-xl font-semibold"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            계정 생성 중...
          </>
        ) : (
          "계정 생성"
        )}
      </Button>
    </form>
  );
} 