import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image, Save, RotateCcw, Eye } from "lucide-react";

interface BrandingConfig {
  loginTitle: string;
  headerTitle: string;
  logoUrl: string;
}

export function BrandingSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<BrandingConfig>({
    loginTitle: "NARA 업무관리시스템",
    headerTitle: "NARA 업무관리",
    logoUrl: "/nara-logo.png"
  });
  const [originalConfig, setOriginalConfig] = useState<BrandingConfig>(config);
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // 설정 로드
  useEffect(() => {
    loadBrandingConfig();
  }, []);

  const loadBrandingConfig = async () => {
    try {
      const response = await fetch('/api/admin/branding-config', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig(data.config);
          setOriginalConfig(data.config);
        }
      }
    } catch (error) {
      console.error('브랜딩 설정 로드 실패:', error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "파일 형식 오류",
        description: "이미지 파일만 업로드 가능합니다."
      });
      return;
    }

    // 파일 크기 검증 (2MB 제한)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "파일 크기 초과",
        description: "파일 크기는 2MB 이하로 제한됩니다."
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setConfig(prev => ({ ...prev, logoUrl: data.logoUrl }));
        toast({
          title: "✅ 로고 업로드 성공",
          description: data.message || "로고가 성공적으로 업로드되었습니다."
        });
      } else {
        throw new Error(data.message || '로고 업로드 실패');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "❌ 로고 업로드 실패",
        description: "로고 업로드 중 오류가 발생했습니다."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/branding-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOriginalConfig(config);
        
        // 전역 이벤트 발생으로 다른 컴포넌트들에 변경사항 알림
        window.dispatchEvent(new CustomEvent('brandingConfigChanged', { 
          detail: config 
        }));
        
        toast({
          title: "✅ 브랜딩 설정 저장",
          description: data.message || "브랜딩 설정이 성공적으로 저장되었습니다."
        });
      } else {
        throw new Error(data.message || '설정 저장 실패');
      }
    } catch (error) {
      console.error('브랜딩 설정 저장 오류:', error);
      toast({
        variant: "destructive",
        title: "❌ 설정 저장 실패",
        description: error instanceof Error ? error.message : "브랜딩 설정 저장 중 오류가 발생했습니다."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setConfig(originalConfig);
    toast({
      title: "🔄 설정 초기화",
      description: "변경사항이 초기화되었습니다."
    });
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          브랜딩 설정
          {hasChanges && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
              변경사항 있음
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 로고 설정 */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">시스템 로고</Label>
          
          {/* 현재 로고 미리보기 */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              {config.logoUrl ? (
                <img 
                  src={config.logoUrl} 
                  alt="현재 로고" 
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.png';
                  }}
                />
              ) : (
                <Image className="h-8 w-8 text-gray-400" />
              )}
            </div>
            
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isLoading}
                className="hidden"
                id="logo-upload"
              />
              <Label 
                htmlFor="logo-upload" 
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                로고 업로드 (PNG, JPG)
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                권장 크기: 64x64px, 최대 2MB
              </p>
            </div>
          </div>
        </div>

        {/* 제목 설정 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loginTitle" className="text-sm font-medium">
              로그인 페이지 제목
            </Label>
            <Input
              id="loginTitle"
              value={config.loginTitle}
              onChange={(e) => setConfig(prev => ({ ...prev, loginTitle: e.target.value }))}
              placeholder="예: NARA 업무관리시스템"
              className="max-w-md"
            />
            <p className="text-xs text-gray-500">
              로그인 페이지에 표시되는 큰 제목입니다.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headerTitle" className="text-sm font-medium">
              상단 헤더 제목
            </Label>
            <Input
              id="headerTitle"
              value={config.headerTitle}
              onChange={(e) => setConfig(prev => ({ ...prev, headerTitle: e.target.value }))}
              placeholder="예: NARA 업무관리"
              className="max-w-md"
            />
            <p className="text-xs text-gray-500">
              상단 고정 탭에 표시되는 제목입니다.
            </p>
          </div>
        </div>

        {/* 미리보기 섹션 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">미리보기</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {previewMode ? '미리보기 닫기' : '미리보기 보기'}
            </Button>
          </div>
          
          {previewMode && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              {/* 헤더 미리보기 */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <img 
                    src={config.logoUrl} 
                    alt="로고" 
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                  <span className="font-bold">{config.headerTitle}</span>
                </div>
              </div>
              
              {/* 로그인 페이지 미리보기 */}
              <div className="bg-white border rounded-lg p-6 text-center">
                <img 
                  src={config.logoUrl} 
                  alt="로고" 
                  className="w-16 h-16 mx-auto mb-4 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.png';
                  }}
                />
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {config.loginTitle}
                </h2>
                <p className="text-gray-600 text-sm">계정 정보를 입력하여 로그인하세요</p>
              </div>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? '저장 중...' : '설정 저장'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            변경사항 취소
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 