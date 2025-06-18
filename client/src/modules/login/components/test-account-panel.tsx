// 🎯 테스트 계정 패널 - 미니멀 디자인

import React from "react";
import { Button } from "@/components/ui/button";
import { Crown, User } from "lucide-react";
import { TestAccount } from "../types/auth";
import { testAccounts } from "../config/test-accounts";

interface TestAccountPanelProps {
  onAccountSelect: (account: TestAccount) => void;
  selectedAccountId: string | null;
  isLoading: boolean;
}

export function TestAccountPanel({
  onAccountSelect,
  selectedAccountId,
  isLoading,
}: TestAccountPanelProps) {
  return (
    <div className="animate-slideUp">
      {/* 헤더 - 미니멀 */}
      <div className="bg-white/10 backdrop-blur-sm text-white p-4 text-center rounded-t-xl border border-white/20">
        <h2 className="font-bold text-white text-lg">테스트 계정</h2>
      </div>

      {/* 계정 목록 */}
      <div className="bg-white/5 backdrop-blur-sm p-6 space-y-3 border-l border-r border-white/20">
        {testAccounts.map((account) => (
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
              {/* 왼쪽: 아이콘과 정보 */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  {account.username === 'admin' ? (
                    <Crown className="w-5 h-5 text-red-400" />
                  ) : account.role === 'manager' ? (
                    <Crown className="w-5 h-5 text-yellow-400" />
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

              {/* 오른쪽: 역할 배지 */}
              <div className="flex flex-col items-end space-y-1">
                <span className={`
                  px-2 py-1 rounded-md text-xs font-medium
                  ${account.username === 'admin' 
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : account.role === 'manager' 
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }
                `}>
                  {account.username === 'admin' ? '개발자' : account.role === 'manager' ? '관리자' : '직원'}
                </span>
                <span className="text-white/40 text-xs">
                  ID: {account.username}
                </span>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* 안내 메시지 - 간소화 */}
      <div className="bg-white/5 backdrop-blur-sm px-6 pb-6 rounded-b-xl border-l border-r border-b border-white/20">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white/70 text-xs text-center leading-relaxed">
            계정을 클릭하면 자동 로그인됩니다
          </p>
        </div>
      </div>
    </div>
  );
} 