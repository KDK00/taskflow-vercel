// 🌐 Core API Client - 모든 모듈에서 사용하는 독립적 API 클라이언트

import { ModuleConfig, ApiResponse, ModuleError } from '../types/module';

export class ModuleAPIClient {
  private config: ModuleConfig;
  private cache = new Map<string, { data: any; timestamp: Date; ttl: number }>();
  private retryCount = new Map<string, number>();
  
  constructor(config: ModuleConfig) {
    this.config = config;
  }
  
  // 메인 요청 메서드
  async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryAttempts: number = 3
  ): Promise<ApiResponse<T>> {
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
    
    // 캐시 확인
    if (this.config.features?.cache && this.isValidCache(cacheKey)) {
      return {
        success: true,
        data: this.cache.get(cacheKey)!.data,
        timestamp: new Date()
      };
    }
    
    const urls = [
      this.config.endpoints.primary,
      ...(this.config.endpoints.fallback || [])
    ];
    
    let lastError: Error | null = null;
    
    for (const baseUrl of urls) {
      for (let attempt = 0; attempt < retryAttempts; attempt++) {
        try {
          const response = await this.executeRequest(baseUrl, endpoint, options);
          
          // 성공 시 캐시 저장
          if (this.config.features?.cache && response.success) {
            this.setCache(cacheKey, response.data, 300000); // 5분 TTL
          }
          
          // 재시도 카운터 리셋
          this.retryCount.delete(cacheKey);
          
          return response;
        } catch (error) {
          lastError = error as Error;
          
          // 재시도 전 지연
          if (attempt < retryAttempts - 1) {
            await this.delay(Math.pow(2, attempt) * 1000); // 지수 백오프
          }
        }
      }
    }
    
    // 모든 시도 실패
    const moduleError: ModuleError = {
      name: 'ModuleAPIError',
      message: lastError?.message || 'All endpoints failed',
      moduleId: this.config.id,
      code: 'REQUEST_FAILED',
      timestamp: new Date()
    };
    
    throw moduleError;
  }
  
  // 실제 HTTP 요청 실행
  private async executeRequest<T>(
    baseUrl: string, 
    endpoint: string, 
    options: RequestInit
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Module-ID': this.config.id,
          'X-Module-Version': this.config.version,
          ...options.headers
        }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data,
        timestamp: new Date(),
        metadata: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
  
  // HTTP 메서드 래퍼들
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>(endpoint + queryString, { method: 'GET' });
  }
  
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }
  
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
  
  // 캐시 관리
  private isValidCache(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp.getTime();
    return age < cached.ttl;
  }
  
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    });
  }
  
  // 캐시 클리어
  clearCache(): void {
    this.cache.clear();
  }
  
  // 지연 유틸리티
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 설정 업데이트
  updateConfig(newConfig: Partial<ModuleConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  // 상태 확인
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export default ModuleAPIClient;

// 🎯 싱글턴 패턴 구현
let apiClientInstance: ModuleAPIClient | null = null;

export function getAPIClient(config: ModuleConfig): ModuleAPIClient {
  if (!apiClientInstance) {
    apiClientInstance = new ModuleAPIClient(config);
    console.log('🚀 APIClient 싱글턴 인스턴스 생성됨');
  }
  return apiClientInstance;
}

// 인스턴스 재설정 함수 (필요시 사용)
export function resetAPIClient(): void {
  apiClientInstance = null;
  console.log('🔄 APIClient 싱글턴 인스턴스 재설정');
}

// 🏭 팩토리 함수
export function createApiClient(config: ModuleConfig, baseURL?: string): ModuleAPIClient {
  return new ModuleAPIClient(config);
}

// 🎯 특화된 API 클라이언트들
export class TaskApiClient extends ModuleAPIClient {
  async getTasks(): Promise<ApiResponse<any[]>> {
    return this.get('/api/tasks');
  }

  async createTask(task: any): Promise<ApiResponse<any>> {
    return this.post('/api/tasks', task);
  }

  async updateTask(id: number, task: any): Promise<ApiResponse<any>> {
    return this.put(`/api/tasks/${id}`, task);
  }

  async deleteTask(id: number): Promise<ApiResponse<any>> {
    return this.delete(`/api/tasks/${id}`);
  }
}

export class StatsApiClient extends ModuleAPIClient {
  async getUserStats(): Promise<ApiResponse<any>> {
    return this.get('/api/users/me/stats');
  }

  async getTeamStats(): Promise<ApiResponse<any>> {
    return this.get('/api/team/stats');
  }
}

export class NotificationApiClient extends ModuleAPIClient {
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.get('/api/notifications');
  }

  async markAsRead(id: number): Promise<ApiResponse<any>> {
    return this.put(`/api/notifications/${id}/read`);
  }
} 