import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// 스톱워치 상태에 대한 타입 정의
interface StopwatchState {
  time: number;
  isRunning: boolean;
  startTime: number | null;
  start: () => void;
  pause: () => void;
  reset: () => void;
  toggle: () => void;
  setTime: (time: number) => void;
}

// 스톱워치 Context 생성
const StopwatchContext = createContext<StopwatchState | undefined>(undefined);

// 스톱워치 Provider 컴포넌트
export const StopwatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const requestRef = useRef<number>();

  // localStorage에서 상태 불러오기 (최초 1회)
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('stopwatchState');
      if (savedState) {
        const { time: savedTime, isRunning: savedIsRunning, startTime: savedStartTime } = JSON.parse(savedState);
        setTime(savedTime);
        setIsRunning(savedIsRunning);
        setStartTime(savedStartTime);
      }
    } catch (error) {
      console.error("Failed to parse stopwatch state from localStorage", error);
    }
  }, []);

  // 상태 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('stopwatchState', JSON.stringify({ time, isRunning, startTime }));
    } catch (error) {
      console.error("Failed to save stopwatch state to localStorage", error);
    }
  }, [time, isRunning, startTime]);

  const animate = useCallback((timestamp: number) => {
    if (startTime === null) return;
    setTime(prevTime => prevTime + (timestamp - (startTime || timestamp)) / 1000);
    setStartTime(timestamp);
    requestRef.current = requestAnimationFrame(animate);
  }, [startTime]);
  
  // isRunning 상태에 따라 애니메이션 프레임 제어
  useEffect(() => {
    if (isRunning) {
      setStartTime(performance.now());
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning, animate]);

  const start = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      setStartTime(performance.now());
    }
  }, [isRunning]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTime(0);
    setStartTime(null);
  }, []);
  
  const toggle = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  const value = { time, isRunning, startTime, start, pause, reset, toggle, setTime };

  return (
    <StopwatchContext.Provider value={value}>
      {children}
    </StopwatchContext.Provider>
  );
};

// 커스텀 훅: useStopwatch
export const useStopwatch = () => {
  const context = useContext(StopwatchContext);
  if (context === undefined) {
    throw new Error('useStopwatch must be used within a StopwatchProvider');
  }
  return context;
}; 