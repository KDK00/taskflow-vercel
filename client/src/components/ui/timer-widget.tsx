import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Timer, Bell, X } from 'lucide-react';

interface TimerWidgetProps {
  className?: string;
}

interface ActiveTimer {
  id: string;
  duration: number;
  startTime: number;
  endTime: number;
}

export function TimerWidget({ className = '' }: TimerWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [showTimers, setShowTimers] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 현재 시간 업데이트 (1초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 타이머 체크 (1초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveTimers(prev => {
        const remaining = prev.filter(timer => {
          if (now >= timer.endTime) {
            // 타이머 완료 - 알람 실행
            triggerAlarm(timer.duration);
            return false;
          }
          return true;
        });
        return remaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 알람 소리 중지 함수
  const stopAlarmSound = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearTimeout(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  }, []);

  // 알람 닫기 함수
  const closeAlarm = useCallback(() => {
    setIsAlarmActive(false);
    stopAlarmSound();
  }, [stopAlarmSound]);

  // 띵띵띵 알람 소리 생성 함수
  const createAlarmSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 띵띵띵 소리 (높은 주파수)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      // 짧고 강한 소리
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime + 0.01);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      
      return true;
    } catch (error) {
      console.log('Web Audio API 사용 불가:', error);
      return false;
    }
  }, []);

  // 알람 실행 함수
  const triggerAlarm = useCallback((duration: number) => {
    // 알람 활성화 (클릭하여 닫을 때까지 유지)
    setIsAlarmActive(true);

    // 메시지 표시
    const message = `⏰ ${duration}분 타이머가 완료되었습니다!`;
    
    // 브라우저 알림
    if (Notification.permission === 'granted') {
      new Notification('타이머 알람', {
        body: message,
        icon: '/nara-logo.png'
      });
    }

    // 띵띵띵 알람 소리 (6회 반복 - 3초간)
    let count = 0;
    const playAlarm = () => {
      if (count < 6) {
        // Web Audio API로 띵띵띵 소리 생성
        const success = createAlarmSound();
        
        if (!success) {
          // Web Audio API 실패시 기본 오디오 사용
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.volume = 0.5;
            audio.play().catch(console.log);
          } catch (e) {
            console.log('오디오 재생 실패:', e);
          }
        }
        
        count++;
        alarmIntervalRef.current = setTimeout(playAlarm, 500); // 0.5초 간격으로 재생
      }
    };
    playAlarm();

    // 화면에 알람 메시지 표시
    const alertDiv = document.createElement('div');
    alertDiv.className = 'fixed top-4 right-4 z-[9999] bg-red-500 text-white px-6 py-4 rounded-lg shadow-2xl animate-bounce border-2 border-red-300';
    alertDiv.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-2xl animate-pulse">⏰</span>
        <span class="font-bold">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 text-xl">
          ✕
        </button>
      </div>
    `;
    document.body.appendChild(alertDiv);

    // 15초 후 자동 제거
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, 15000);
  }, [createAlarmSound]);

  // 테스트 알람 함수
  const testAlarm = useCallback(() => {
    // 시각적 알람도 함께 표시 (클릭하여 닫을 때까지 유지)
    setIsAlarmActive(true);
    
    // 띵띵띵 소리 재생 (3초간)
    let count = 0;
    const playTestAlarm = () => {
      if (count < 6) {
        createAlarmSound();
        count++;
        alarmIntervalRef.current = setTimeout(playTestAlarm, 500);
      }
    };
    playTestAlarm();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'fixed top-4 right-4 z-[9999] bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg';
    alertDiv.innerHTML = `
      <div class="flex items-center space-x-2">
        <span>🔊</span>
        <span>알람 테스트 완료!</span>
      </div>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 2000);
  }, [createAlarmSound]);

  // 타이머 설정
  const setTimer = useCallback((minutes: number) => {
    const now = Date.now();
    const newTimer: ActiveTimer = {
      id: `timer-${now}`,
      duration: minutes,
      startTime: now,
      endTime: now + (minutes * 60 * 1000)
    };

    setActiveTimers(prev => [...prev, newTimer]);
    
    // 알림 권한 요청
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // 설정 완료 메시지
    const message = `⏱️ ${minutes}분 타이머가 설정되었습니다!`;
    const alertDiv = document.createElement('div');
    alertDiv.className = 'fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg';
    alertDiv.innerHTML = `
      <div class="flex items-center space-x-2">
        <span>⏱️</span>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
  }, []);

  // 타이머 취소
  const cancelTimer = useCallback((timerId: string) => {
    setActiveTimers(prev => prev.filter(timer => timer.id !== timerId));
  }, []);

  // 남은 시간 계산
  const getRemainingTime = useCallback((timer: ActiveTimer) => {
    const remaining = Math.max(0, timer.endTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const timerButtons = [5, 10, 15, 30, 60];

  return (
    <div className={`relative ${className}`}>
      {/* 알람 활성화 시 전체 화면 오버레이 */}
      {isAlarmActive && (
        <div 
          className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-md flex items-center justify-center cursor-pointer"
          onClick={closeAlarm}
        >
          <div className="text-center">
            {/* 떨리는 시계 아이콘 - 화면 중앙에 정확히 배치 */}
            <div className="mb-6 flex justify-center">
              <div className="text-9xl shake-alarm animate-pulse">
                ⏰
              </div>
            </div>
            <div className="text-white text-3xl font-bold animate-pulse mb-2">
              타이머 알람!
            </div>
            <div className="text-white/80 text-xl animate-bounce">
              클릭하여 닫기
            </div>
          </div>
        </div>
      )}

      {/* 배경 흐림 효과 (타이머 패널용) */}
      {showTimers && !isAlarmActive && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setShowTimers(false)}
        />
      )}

      {/* 현재 시간 표시 - 헤더용 컴팩트 버전 (이전 디자인 유지) */}
      <div className="flex items-center space-x-2">
        <div className="text-white font-mono text-sm font-bold px-2 py-1 rounded">
          {currentTime.toLocaleTimeString('ko-KR', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
        
        {/* 타이머 토글 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTimers(!showTimers)}
          className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded relative transition-colors duration-200"
          title="타이머 설정"
        >
          <Timer className="w-4 h-4" />
          {activeTimers.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-medium">
              {activeTimers.length}
            </span>
          )}
        </Button>
      </div>

      {/* 타이머 패널 */}
      {showTimers && !isAlarmActive && (
        <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 p-4 min-w-[280px] z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <Timer className="w-4 h-4 mr-2" />
              타이머 설정
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTimers(false)}
              className="p-1 h-6 w-6"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* 타이머 버튼들 */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {timerButtons.map(minutes => (
              <Button
                key={minutes}
                variant="outline"
                size="sm"
                onClick={() => setTimer(minutes)}
                className="h-10 text-xs font-bold bg-gradient-to-br from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200 text-purple-700"
              >
                {minutes}
              </Button>
            ))}
          </div>

          {/* 알람테스트 버튼 */}
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={testAlarm}
              className="w-full h-8 text-xs bg-gradient-to-r from-blue-50 to-green-50 hover:from-blue-100 hover:to-green-100 border-blue-200 text-blue-700"
            >
              🔊 알람 테스트
            </Button>
          </div>

          {/* 활성 타이머 목록 */}
          {activeTimers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <Bell className="w-3 h-3 mr-1" />
                활성 타이머
              </h4>
              {activeTimers.map(timer => (
                <div key={timer.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {getRemainingTime(timer)}
                    </span>
                    <span className="text-xs text-gray-600">
                      {timer.duration}분 타이머
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelTimer(timer.id)}
                    className="p-1 h-6 w-6 text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeTimers.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-2">
              숫자를 클릭하여 타이머를 설정하세요
            </p>
          )}
        </div>
      )}
    </div>
  );
} 