import { useState, useCallback } from 'react';

interface UseKoreanInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function useKoreanInput({ value, onChange }: UseKoreanInputProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [compositionValue, setCompositionValue] = useState('');

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionUpdate = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    setCompositionValue(e.data);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    setCompositionValue('');
    onChange(e.currentTarget.value);
  }, [onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isComposing) {
      onChange(e.target.value);
    }
  }, [isComposing, onChange]);

  return {
    value: isComposing ? compositionValue : value,
    onChange: handleChange,
    onCompositionStart: handleCompositionStart,
    onCompositionUpdate: handleCompositionUpdate,
    onCompositionEnd: handleCompositionEnd,
    isComposing
  };
} 