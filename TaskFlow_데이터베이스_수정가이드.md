# TaskFlow 데이터베이스 수정 가이드

## 🔍 현재 문제 상황

**발견된 오류:**
```
❌ 일간업무 목록 조회 실패: SqliteError: no such table: daily_tasks
❌ 데이터베이스 초기화 실패: SqliteError: no such table: users
```

**문제 원인:**
1. `daily_tasks` 테이블이 제대로 생성되지 않음
2. 테이블 초기화 로직에서 거짓 성공 메시지 출력
3. 기존 데이터베이스 스키마와 코드 불일치

## 🔧 1단계: 데이터베이스 스키마 확인

### 1-1. 현재 스키마 조사

**`server/db/schema.ts` 확인:**
```typescript
// 현재 스키마에서 dailyTasks와 daily_tasks 불일치 확인
export const dailyTasks = sqliteTable('daily_tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  assignedTo: text('assigned_to').notNull(),
  // ... 기타 필드들
});
```

### 1-2. API 코드와 스키마 매핑 확인

**문제가 되는 부분:**
- 스키마: `daily_tasks` (언더스코어)
- 코드: `dailyTasks` (카멜케이스)

## 🛠️ 2단계: 데이터베이스 수정

### 2-1. 스키마 통일

**`server/db/schema.ts` 수정:**
```typescript
// 테이블명 통일: daily_tasks로 고정
export const dailyTasks = sqliteTable('daily_tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  assignedTo: text('assigned_to').notNull(),
  status: text('status').default('pending'),
  priority: text('priority').default('medium'),
  dueDate: text('due_date'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  isFollowUpTask: integer('is_follow_up_task', { mode: 'boolean' }).default(false),
  parentTaskId: text('parent_task_id'),
  createdBy: text('created_by').notNull()
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email'),
  role: text('role').default('user'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

// 다른 테이블들도 동일하게 통일
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  message: text('message').notNull(),
  type: text('type').default('info'),
  userId: text('user_id'),
  read: integer('read', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
});
```

### 2-2. 데이터베이스 초기화 로직 수정

**`server/db/init.ts` 생성:**
```typescript
import { db } from './database';
import { users, dailyTasks, notifications } from './schema';
import { sql } from 'drizzle-orm';

export async function initializeDatabase() {
  try {
    console.log('🔧 데이터베이스 테이블 생성 시작...');
    
    // 각 테이블 개별 생성 및 검증
    await createTableIfNotExists('users', `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createTableIfNotExists('daily_tasks', `
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        assigned_to TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        due_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_follow_up_task INTEGER DEFAULT 0,
        parent_task_id TEXT,
        created_by TEXT NOT NULL
      )
    `);

    await createTableIfNotExists('notifications', `
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        user_id TEXT,
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ 모든 테이블 생성 완료');
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
    throw error;
  }
}

async function createTableIfNotExists(tableName: string, createSQL: string) {
  try {
    // 테이블 생성
    await db.run(sql.raw(createSQL));
    
    // 테이블 존재 확인
    const result = await db.get(sql`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=${tableName}
    `);
    
    if (!result) {
      throw new Error(`테이블 ${tableName} 생성 실패`);
    }
    
    console.log(`✅ 테이블 ${tableName} 확인 완료`);
  } catch (error) {
    console.error(`❌ 테이블 ${tableName} 생성 실패:`, error);
    throw error;
  }
}
```

### 2-3. API 엔드포인트 수정

**`server/routes/tasks.ts` 수정:**
```typescript
import { db } from '../db/database';
import { dailyTasks, users } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';

// 업무 목록 조회 API 수정
app.get('/api/tasks', async (req, res) => {
  try {
    console.log('📋 일간업무 목록 조회 시작');
    
    // 테이블 존재 확인
    const tableExists = await db.get(sql`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='daily_tasks'
    `);
    
    if (!tableExists) {
      console.error('❌ daily_tasks 테이블이 존재하지 않음');
      return res.status(500).json({
        success: false,
        error: 'Daily tasks table not found'
      });
    }

    // 업무 목록 조회
    const tasks = await db.select().from(dailyTasks);
    
    console.log(`✅ 업무 목록 조회 성공: ${tasks.length}개`);
    res.json({
      success: true,
      tasks,
      meta: {
        total: tasks.length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ 업무 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

## 🔄 3단계: 가비아 배포용 환경 설정

### 3-1. 프로덕션 데이터베이스 설정

**`server/config/database.ts`:**
```typescript
export const databaseConfig = {
  development: {
    filename: './taskflow.db',
    verbose: console.log
  },
  production: {
    filename: './data/taskflow_production.db',
    verbose: null // 프로덕션에서는 로그 비활성화
  }
};

export const getDatabaseConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return databaseConfig[env] || databaseConfig.development;
};
```

### 3-2. 환경변수 설정

**`.env.production`:**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=./data/taskflow_production.db
JWT_SECRET=your-super-secure-jwt-secret-key
CORS_ORIGIN=https://taskflow.co.kr,https://www.taskflow.co.kr,tauri://localhost
```

### 3-3. Docker 환경에서의 데이터베이스

**`docker-compose.yml` 수정:**
```yaml
version: '3.8'

services:
  taskflow-server:
    build: .
    container_name: taskflow-production
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=/app/data/taskflow_production.db
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 🧪 4단계: 데이터베이스 테스트

### 4-1. 로컬 테스트 스크립트

**`scripts/test-database.js`:**
```javascript
const { db } = require('../server/db/database');
const { dailyTasks, users } = require('../server/db/schema');

async function testDatabase() {
  try {
    console.log('🧪 데이터베이스 테스트 시작...');
    
    // 테이블 존재 확인
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('users', 'daily_tasks', 'notifications')
    `);
    
    console.log('📋 발견된 테이블:', tables.map(t => t.name));
    
    // 샘플 사용자 생성
    const testUser = {
      id: 'test-user-' + Date.now(),
      username: 'testuser',
      password: 'hashed-password',
      role: 'user'
    };
    
    await db.insert(users).values(testUser);
    console.log('✅ 테스트 사용자 생성 완료');
    
    // 샘플 업무 생성
    const testTask = {
      id: 'test-task-' + Date.now(),
      title: '테스트 업무',
      description: '데이터베이스 테스트용 업무',
      assignedTo: testUser.id,
      createdBy: testUser.id,
      status: 'pending'
    };
    
    await db.insert(dailyTasks).values(testTask);
    console.log('✅ 테스트 업무 생성 완료');
    
    // 데이터 조회 테스트
    const allTasks = await db.select().from(dailyTasks);
    console.log(`✅ 업무 조회 성공: ${allTasks.length}개`);
    
    console.log('🎉 데이터베이스 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 데이터베이스 테스트 실패:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testDatabase();
}

module.exports = { testDatabase };
```

### 4-2. 배치파일로 테스트 실행

**`test-database.bat`:**
```batch
@echo off
echo 🧪 TaskFlow 데이터베이스 테스트
echo ═══════════════════════════════════

echo 1. 기존 테스트 DB 삭제...
if exist "taskflow.db" del "taskflow.db"
if exist "app.db" del "app.db"

echo 2. 데이터베이스 테스트 실행...
node scripts/test-database.js

echo 3. 서버 시작 테스트...
start "테스트 서버" cmd /k "npm run dev:server"

timeout /t 10

echo 4. API 테스트...
curl http://localhost:3000/api/health
curl http://localhost:3000/api/tasks

echo ✅ 테스트 완료!
pause
```

## 🚀 5단계: 가비아 배포용 준비

### 5-1. 마이그레이션 스크립트

**`scripts/migrate-production.js`:**
```javascript
// 기존 데이터를 새로운 스키마로 마이그레이션
const fs = require('fs');
const path = require('path');

async function migrateToProduction() {
  console.log('🔄 프로덕션 데이터베이스 마이그레이션 시작...');
  
  // 기존 데이터 백업
  if (fs.existsSync('taskflow.db')) {
    fs.copyFileSync('taskflow.db', `taskflow_backup_${Date.now()}.db`);
    console.log('✅ 기존 데이터베이스 백업 완료');
  }
  
  // 새로운 스키마로 재생성
  await initializeDatabase();
  
  console.log('🎉 마이그레이션 완료!');
}
```

### 5-2. 헬스체크 API 추가

**`server/routes/health.ts`:**
```typescript
import express from 'express';
import { db } from '../db/database';
import { sql } from 'drizzle-orm';

const router = express.Router();

router.get('/api/health', async (req, res) => {
  try {
    // 데이터베이스 연결 테스트
    await db.get(sql`SELECT 1`);
    
    // 주요 테이블 존재 확인
    const tables = await db.all(sql`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('users', 'daily_tasks', 'notifications')
    `);
    
    const requiredTables = ['users', 'daily_tasks', 'notifications'];
    const existingTables = tables.map(t => t.name);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }
    
    res.json({
      status: 'healthy',
      database: 'connected',
      tables: existingTables,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
```

## ✅ 완료 체크리스트

- [ ] 데이터베이스 스키마 통일 (daily_tasks)
- [ ] 초기화 로직 수정 및 검증 강화
- [ ] API 엔드포인트 오류 처리 개선
- [ ] 프로덕션 환경 설정 추가
- [ ] Docker 컨테이너 데이터베이스 설정
- [ ] 헬스체크 API 구현
- [ ] 데이터베이스 테스트 스크립트 작성
- [ ] 마이그레이션 도구 준비

이 가이드를 따라하면 현재 `daily_tasks` 테이블 오류를 해결하고 가비아 배포에 최적화된 데이터베이스 구조를 만들 수 있습니다! 