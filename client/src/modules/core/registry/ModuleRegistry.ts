// 🎯 Module Registry - 모든 모듈을 중앙에서 관리하는 레지스트리

import { Module, ModuleConfig, ModuleManifest, ModuleContext } from '../types';
import { ModuleInstance, ModuleEvent, ModuleProps } from '../types/module';

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<string, ModuleInstance> = new Map();
  private manifests: Map<string, ModuleManifest> = new Map();
  private initialized: Set<string> = new Set();
  private loadingPromises = new Map<string, Promise<ModuleInstance>>();
  private eventListeners = new Map<string, ((event: ModuleEvent) => void)[]>();

  private constructor() {
    console.log('🏭 ModuleRegistry 초기화');
  }

  // 🏗️ 싱글톤 패턴
  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  // 📦 모듈 등록
  register(config: ModuleConfig, component: React.ComponentType<ModuleProps>): void {
    console.log(`📦 모듈 등록: ${config.id} v${config.version}`);
    
    const instance: ModuleInstance = {
      config,
      component,
      isLoaded: true,
      isActive: false,
      loadedAt: new Date()
    };
    
    this.modules.set(config.id, instance);
    this.validateDependencies(config);
    this.emitEvent('load', config.id);
  }

  // 🔓 모듈 해제
  unregister(name: string): void {
    const module = this.modules.get(name);
    if (module) {
      // 의존하는 다른 모듈이 있는지 확인
      const dependents = this.getDependents(name);
      if (dependents.length > 0) {
        throw new Error(`Cannot unregister '${name}': modules ${dependents.join(', ')} depend on it`);
      }

      // 정리 작업 수행
      if (module.cleanup) {
        module.cleanup();
      }

      this.modules.delete(name);
      this.manifests.delete(name);
      this.initialized.delete(name);

      console.log(`🗑️ Module unregistered: ${name}`);
    }
  }

  // 📋 모듈 조회
  get(name: string): ModuleInstance | undefined {
    return this.modules.get(name);
  }

  // 📋 모든 모듈 조회
  getAll(): ModuleInstance[] {
    return Array.from(this.modules.values());
  }

  // 📋 매니페스트 조회
  getManifest(name: string): ModuleManifest | undefined {
    return this.manifests.get(name);
  }

  // ✅ 등록 여부 확인
  isRegistered(name: string): boolean {
    return this.modules.has(name);
  }

  // ✅ 초기화 여부 확인
  isInitialized(name: string): boolean {
    return this.initialized.has(name);
  }

  // 🚀 모듈 초기화
  async initialize(name: string, context: ModuleContext): Promise<void> {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module '${name}' not found`);
    }

    if (this.initialized.has(name)) {
      console.warn(`Module '${name}' already initialized`);
      return;
    }

    try {
      // 의존성 먼저 초기화
      if (module.dependencies) {
        for (const dep of module.dependencies) {
          if (!this.isInitialized(dep)) {
            await this.initialize(dep, context);
          }
        }
      }

      // 모듈 초기화
      if (module.init) {
        await module.init(context);
      }

      this.initialized.add(name);
      console.log(`🚀 Module initialized: ${name}`);
    } catch (error) {
      console.error(`❌ Failed to initialize module '${name}':`, error);
      throw error;
    }
  }

  // 🔄 모든 모듈 초기화
  async initializeAll(context: ModuleContext): Promise<void> {
    const modules = Array.from(this.modules.keys());
    
    for (const moduleName of modules) {
      if (!this.isInitialized(moduleName)) {
        await this.initialize(moduleName, context);
      }
    }
  }

  // 🔍 의존성 조회
  getDependencies(name: string): string[] {
    const module = this.modules.get(name);
    return module?.dependencies || [];
  }

  // 🔍 종속 모듈 조회
  getDependents(name: string): string[] {
    const dependents: string[] = [];
    
    for (const [moduleName, module] of this.modules) {
      if (module.dependencies?.includes(name)) {
        dependents.push(moduleName);
      }
    }
    
    return dependents;
  }

  // 📊 레지스트리 상태
  getStatus() {
    return {
      totalModules: this.modules.size,
      initializedModules: this.initialized.size,
      modules: Array.from(this.modules.entries()).map(([name, module]) => ({
        name,
        version: module.config.version,
        initialized: this.initialized.has(name),
        dependencies: module.dependencies || [],
        dependents: this.getDependents(name)
      }))
    };
  }

  // 🧹 전체 정리
  clear(): void {
    // 모든 모듈 정리
    for (const [name, module] of this.modules) {
      if (module.cleanup) {
        try {
          module.cleanup();
        } catch (error) {
          console.error(`Error cleaning up module '${name}':`, error);
        }
      }
    }

    this.modules.clear();
    this.manifests.clear();
    this.initialized.clear();

    console.log('🧹 Module registry cleared');
  }

  // 🔧 설정 업데이트
  updateConfig(name: string, newConfig: Partial<ModuleConfig>): void {
    const module = this.modules.get(name);
    if (module) {
      module.config = { ...module.config, ...newConfig };
      console.log(`🔧 Config updated for module: ${name}`);
    }
  }

  // 📈 통계
  getStatistics() {
    const modules = Array.from(this.modules.values());
    
    return {
      total: modules.length,
      initialized: this.initialized.size,
      byVersion: modules.reduce((acc, module) => {
        acc[module.config.version] = (acc[module.config.version] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      dependencyGraph: modules.map(module => ({
        name: module.config.id,
        dependencies: module.dependencies || [],
        dependents: this.getDependents(module.config.id)
      }))
    };
  }

  // 모듈 동적 로딩
  async load(moduleId: string): Promise<ModuleInstance> {
    console.log(`🔄 모듈 로딩 시작: ${moduleId}`);
    
    // 이미 로딩된 모듈 확인
    if (this.modules.has(moduleId)) {
      const instance = this.modules.get(moduleId)!;
      if (!instance.isActive) {
        instance.isActive = true;
        instance.lastActivity = new Date();
        this.emitEvent('activate', moduleId);
      }
      return instance;
    }
    
    // 로딩 중인 모듈 확인
    if (this.loadingPromises.has(moduleId)) {
      return this.loadingPromises.get(moduleId)!;
    }
    
    // 새로운 모듈 로딩
    const loadPromise = this.loadModule(moduleId);
    this.loadingPromises.set(moduleId, loadPromise);
    
    try {
      const instance = await loadPromise;
      this.modules.set(moduleId, instance);
      instance.isActive = true;
      instance.lastActivity = new Date();
      this.emitEvent('activate', moduleId);
      return instance;
    } catch (error) {
      this.emitEvent('error', moduleId, { error });
      throw error;
    } finally {
      this.loadingPromises.delete(moduleId);
    }
  }
  
  // 실제 모듈 로딩 구현
  private async loadModule(moduleId: string): Promise<ModuleInstance> {
    try {
      // 동적 import로 모듈 로딩
      const moduleImport = await import(`../${moduleId}/index.tsx`);
      const configImport = await import(`../${moduleId}/config.ts`);
      
      const config = configImport.default || configImport.config;
      const component = moduleImport.default;
      
      console.log(`✅ 모듈 로딩 완료: ${moduleId}`);
      
      return {
        config,
        component,
        isLoaded: true,
        isActive: false,
        loadedAt: new Date()
      };
    } catch (error) {
      console.error(`❌ 모듈 로딩 실패: ${moduleId}`, error);
      
      // 에러 모듈 생성
      return {
        config: { 
          id: moduleId, 
          name: moduleId, 
          version: '0.0.0', 
          endpoints: { primary: '' } 
        },
        component: this.createErrorComponent(moduleId, error as Error),
        isLoaded: false,
        isActive: false,
        error: error as Error,
        loadedAt: new Date()
      };
    }
  }
  
  // 모듈 언로드
  unload(moduleId: string): boolean {
    const instance = this.modules.get(moduleId);
    if (!instance) {
      console.warn(`⚠️ 언로드할 모듈을 찾을 수 없음: ${moduleId}`);
      return false;
    }
    
    instance.isActive = false;
    this.emitEvent('deactivate', moduleId);
    console.log(`📤 모듈 비활성화: ${moduleId}`);
    return true;
  }
  
  // 모듈 완전 제거
  remove(moduleId: string): boolean {
    if (this.modules.has(moduleId)) {
      this.unload(moduleId);
      this.modules.delete(moduleId);
      this.emitEvent('unload', moduleId);
      console.log(`🗑️ 모듈 제거: ${moduleId}`);
      return true;
    }
    return false;
  }
  
  // 모듈 목록 조회
  list(): ModuleInstance[] {
    return Array.from(this.modules.values());
  }
  
  // 활성 모듈 목록
  getActiveModules(): ModuleInstance[] {
    return this.list().filter(instance => instance.isActive);
  }
  
  // 모듈 존재 확인
  has(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }
  
  // 모듈 가져오기
  get(moduleId: string): ModuleInstance | undefined {
    return this.modules.get(moduleId);
  }
  
  // 의존성 검증
  private validateDependencies(config: ModuleConfig): void {
    if (!config.dependencies) return;
    
    const missingDependencies: string[] = [];
    
    for (const dep of config.dependencies) {
      if (!this.modules.has(dep)) {
        missingDependencies.push(dep);
      }
    }
    
    if (missingDependencies.length > 0) {
      console.warn(`⚠️ 모듈 ${config.id}의 의존성 누락:`, missingDependencies);
    }
  }
  
  // 에러 컴포넌트 생성
  private createErrorComponent(moduleId: string, error: Error): React.ComponentType<ModuleProps> {
    return ({ className = '', style = {} }) => {
      return React.createElement('div', 
        { 
          className: `module-error ${className}`,
          style: {
            padding: '20px',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            ...style
          }
        },
        [
          React.createElement('h3', { key: 'title' }, `모듈 로딩 실패: ${moduleId}`),
          React.createElement('p', { key: 'message' }, error.message),
          React.createElement('pre', { key: 'stack', style: { fontSize: '12px', opacity: 0.7 } }, error.stack)
        ]
      );
    };
  }
  
  // 이벤트 시스템
  on(event: ModuleEvent['type'], listener: (event: ModuleEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }
  
  off(event: ModuleEvent['type'], listener: (event: ModuleEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  private emitEvent(type: ModuleEvent['type'], moduleId: string, data?: any): void {
    const event: ModuleEvent = {
      type,
      moduleId,
      timestamp: new Date(),
      data
    };
    
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`이벤트 리스너 오류:`, error);
        }
      });
    }
  }
  
  // 모듈 정보 요약
  getSummary(): {
    total: number;
    loaded: number;
    active: number;
    failed: number;
  } {
    const modules = this.list();
    return {
      total: modules.length,
      loaded: modules.filter(m => m.isLoaded).length,
      active: modules.filter(m => m.isActive).length,
      failed: modules.filter(m => m.error).length
    };
  }
  
  // 모듈 상태 진단
  diagnose(): void {
    const summary = this.getSummary();
    console.log('📊 모듈 레지스트리 진단:');
    console.log(`   총 모듈: ${summary.total}`);
    console.log(`   로딩됨: ${summary.loaded}`);
    console.log(`   활성화: ${summary.active}`);
    console.log(`   실패: ${summary.failed}`);
    
    if (summary.failed > 0) {
      const failedModules = this.list().filter(m => m.error);
      console.log('❌ 실패한 모듈들:');
      failedModules.forEach(module => {
        console.log(`   - ${module.config.id}: ${module.error?.message}`);
      });
    }
  }
}

// 🎯 전역 인스턴스
export const moduleRegistry = ModuleRegistry.getInstance();

// 🔧 헬퍼 함수들
export function registerModule(config: ModuleConfig, component: React.ComponentType<ModuleProps>) {
  return moduleRegistry.register(config, component);
}

export function getModule(name: string) {
  return moduleRegistry.get(name);
}

export function isModuleRegistered(name: string) {
  return moduleRegistry.isRegistered(name);
}

export function initializeModule(name: string, context: ModuleContext) {
  return moduleRegistry.initialize(name, context);
}

export function getModuleStatus() {
  return moduleRegistry.getStatus();
}

// 🏭 배치 등록 헬퍼
export function registerModules(modules: { config: ModuleConfig; component: React.ComponentType<ModuleProps> }[]) {
  for (const { config, component } of modules) {
    registerModule(config, component);
  }
}

// 🎯 의존성 기반 정렬
export function sortModulesByDependencies(moduleNames: string[]): string[] {
  const sorted: string[] = [];
  const visited: Set<string> = new Set();
  const visiting: Set<string> = new Set();

  function visit(name: string) {
    if (visiting.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }
    
    if (visited.has(name)) {
      return;
    }

    visiting.add(name);
    
    const dependencies = moduleRegistry.getDependencies(name);
    for (const dep of dependencies) {
      if (moduleNames.includes(dep)) {
        visit(dep);
      }
    }

    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  }

  for (const name of moduleNames) {
    visit(name);
  }

  return sorted;
}

// React 임포트 (동적 임포트 대응)
let React: any;
try {
  React = require('react');
} catch {
  // React가 없는 환경에서는 기본 구현 사용
  React = {
    createElement: (type: string, props: any, ...children: any[]) => ({
      type,
      props: { ...props, children: children.length === 1 ? children[0] : children }
    })
  };
}

export default moduleRegistry; 