// 🔐 인증 헤더 컴포넌트

import React from 'react';
import { Building2 } from "lucide-react";

export function AuthHeader() {
  return (
    <div className="relative glass-header-gradient py-12 px-8 text-center text-white overflow-hidden">
      {/* 배경 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/90 via-indigo-600/90 to-purple-800/90 backdrop-blur-xl"></div>
      
      {/* 반짝임 효과 */}
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      
      {/* 로고와 텍스트 */}
      <div className="relative z-10">
        <div className="mb-6 transform hover:scale-110 transition-transform duration-300">
          <Building2 className="h-16 w-16 mx-auto text-white drop-shadow-2xl" />
        </div>
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent">
          NARA 업무관리시스템
        </h1>
        <p className="text-purple-100 text-base font-medium tracking-wide">
          계정 정보를 입력하여 로그인하세요
        </p>
      </div>
      
      {/* 장식적 요소들 */}
      <div className="absolute top-4 left-4 w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
      <div className="absolute top-6 right-6 w-1 h-1 bg-white/40 rounded-full animate-pulse"></div>
      <div className="absolute bottom-4 left-6 w-1.5 h-1.5 bg-white/25 rounded-full animate-bounce"></div>
    </div>
  );
} 