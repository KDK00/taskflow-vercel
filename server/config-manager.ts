import fs from 'fs';
import path from 'path';

export interface TaskFlowConfig {
  dataDir: string;
  autoBackup: boolean;
  backupInterval: number;
  maxBackupFiles: number;
  systemName: string;
  version: string;
}

export class ConfigManager {
  private configPath: string;
  private config: TaskFlowConfig;

  constructor() {
    // 초기 설정 파일은 프로젝트 루트에 위치
    this.configPath = path.join(process.cwd(), 'taskflow-config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): TaskFlowConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const parsedConfig = JSON.parse(configData);
        
        // 기본값 병합
        return {
          dataDir: parsedConfig.dataDir || path.join(process.cwd(), 'data'),
          autoBackup: parsedConfig.autoBackup ?? true,
          backupInterval: parsedConfig.backupInterval || 24,
          maxBackupFiles: parsedConfig.maxBackupFiles || 10,
          systemName: parsedConfig.systemName || 'TaskFlowMaster',
          version: parsedConfig.version || '1.0.0'
        };
      }
    } catch (error) {
      console.warn('⚠️ 설정 파일 로드 실패, 기본값 사용:', error);
    }

    // 기본 설정 반환
    return {
      dataDir: path.join(process.cwd(), 'data'),
      autoBackup: true,
      backupInterval: 24,
      maxBackupFiles: 10,
      systemName: 'TaskFlowMaster',
      version: '1.0.0'
    };
  }

  public getConfig(): TaskFlowConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<TaskFlowConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  public setDataDir(newDataDir: string): void {
    // 이전 데이터 디렉토리
    const oldDataDir = this.config.dataDir;
    
    // 새 데이터 디렉토리 생성
    if (!fs.existsSync(newDataDir)) {
      fs.mkdirSync(newDataDir, { recursive: true });
      console.log(`📁 새 데이터 폴더 생성: ${newDataDir}`);
    }

    // 설정 업데이트
    this.config.dataDir = newDataDir;
    this.saveConfig();

    // 새 위치에 설정 파일도 복사
    const newConfigPath = path.join(newDataDir, 'taskflow-config.json');
    this.saveConfigToPath(newConfigPath);

    console.log(`✅ 데이터 폴더 변경: ${oldDataDir} → ${newDataDir}`);
  }

  private saveConfig(): void {
    this.saveConfigToPath(this.configPath);
  }

  private saveConfigToPath(filePath: string): void {
    try {
      const configDir = path.dirname(filePath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2), 'utf8');
      console.log(`💾 설정 파일 저장: ${filePath}`);
    } catch (error) {
      console.error('❌ 설정 파일 저장 실패:', error);
    }
  }

  // 데이터 관련 파일 경로들
  public getMainDbPath(): string {
    return path.join(this.config.dataDir, 'taskflow.db');
  }

  public getStorageDbPath(): string {
    return path.join(this.config.dataDir, 'app.db');
  }

  public getUsersConfigPath(): string {
    return path.join(this.config.dataDir, 'taskflow-users.json');
  }

  public getBackupDir(): string {
    return path.join(this.config.dataDir, 'backups');
  }

  // 데이터 디렉토리 초기화
  public initializeDataDirectory(): void {
    const dataDir = this.config.dataDir;
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 데이터 폴더 생성: ${dataDir}`);
    }

    // 백업 폴더도 생성
    const backupDir = this.getBackupDir();
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 백업 폴더 생성: ${backupDir}`);
    }

    console.log(`✅ 데이터 디렉토리 초기화 완료: ${dataDir}`);
  }
}

// 싱글톤 인스턴스
export const configManager = new ConfigManager(); 