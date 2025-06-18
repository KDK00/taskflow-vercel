# 🔧 PC 앱 (Tauri) + 가비아 클라우드 호스팅 전환 가이드

## 📋 **현재 프로젝트 상황 분석**

### **현재 아키텍처**
- **프론트엔드**: React 18 + TypeScript + Vite (포트 5173)
- **백엔드**: Express.js + SQLite + Drizzle ORM (포트 3000)
- **데이터베이스**: taskflow.db, app.db (SQLite 파일)
- **실행 방식**: `npm run dev:all` (클라이언트 + 서버 동시 실행)

### **목표 아키텍처**
- **프론트엔드**: Tauri 데스크톱 앱 (React 코드 그대로 활용)
- **백엔드**: Express.js + PostgreSQL (가비아 클라우드)
- **데이터베이스**: PostgreSQL (가비아 DB 호스팅)
- **실행 방식**: PC 앱 단독 실행 (서버는 클라우드)

---

## 🔧 **STEP 1: 현재 시스템 문제 해결**

### **1.1 데이터베이스 오류 진단**
첨부된 로그에서 확인된 문제:
```
❌ 일간업무 목록 조회 실패: SqliteError: no such table: daily_tasks
✅ 데이터베이스 초기화 완료 (거짓 성공 메시지)
```

According to a memory from a past conversation, TaskFlow 시스템에서 daily_tasks 테이블 생성이 실패하는 근본 원인은 거짓 성공 메시지와 오류 무시 로직이었습니다.

### **1.2 즉시 해결 방법**

```bash
# 현재 서버 중단 (Ctrl+C)

# 데이터베이스 파일 완전 삭제
del taskflow.db
del app.db

# 서버 재시작
npm run dev:all
```

---

## 🛠️ **STEP 2: Tauri 환경 구축**

### **2.1 필수 소프트웨어 설치**

#### **Rust 설치**
```bash
# 1. https://rustup.rs/ 에서 rustup-init.exe 다운로드
# 2. 설치 후 시스템 재부팅
# 3. 설치 확인
rustc --version
cargo --version
```

#### **Visual Studio Build Tools (Windows)**
```bash
# C++ 컴파일러 필요 (Tauri 빌드용)
# Visual Studio Installer에서 "C++ build tools" 설치
```

### **2.2 Tauri CLI 설치**
```bash
npm install --save-dev @tauri-apps/cli
```

---

## 🏗️ **STEP 3: 프로젝트 구조 변경**

### **3.1 Tauri 프로젝트 초기화**
```bash
npx tauri init
```

**설정 입력값:**
```
App name: TaskFlowMaster
Window title: TaskFlow 업무관리시스템
Web assets location: ../dist/public
Dev server URL: http://localhost:5173
Dev command: npm run dev:client
Build command: npm run build
```

### **3.2 package.json 수정**

기존 스크립트에 Tauri 관련 추가:

```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "dev:client": "vite",
    "dev:server": "cross-env NODE_ENV=development tsx server/index.ts",
    "dev:all": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "build": "tsc && vite build",
    "preview": "vite preview",
    
    // 새로 추가되는 Tauri 스크립트
    "dev:tauri": "npx tauri dev",
    "build:tauri": "npm run build && npx tauri build",
    "tauri": "tauri"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^1.5.0",
    // ... 기존 의존성들
  }
}
```

### **3.3 프로젝트 구조 확인**
```
프로젝트 루트/
├── src/                 (기존 React 코드)
├── server/              (기존 Express 서버 코드)
├── src-tauri/          (새로 생성됨 - Tauri 설정)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       └── main.rs
├── dist/               (빌드 결과물)
├── package.json
└── ...
```

---

## 🔄 **STEP 4: 데이터베이스 마이그레이션 (SQLite → PostgreSQL)**

### **4.1 의존성 변경**
```bash
# PostgreSQL 드라이버 설치
npm install pg @types/pg drizzle-orm/pg-core

# SQLite 의존성 제거 (선택사항)
npm uninstall better-sqlite3 drizzle-orm/better-sqlite3
```

### **4.2 데이터베이스 설정 파일 수정**

#### **server/db.ts 수정**
```typescript
// 기존 SQLite 설정 주석 처리하고 PostgreSQL 추가
import { drizzle } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

// 환경변수에서 DB 연결 정보 가져오기
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    'postgresql://username:password@db.gabia.com:5432/dbname'
});

export const db = drizzle(pool);
```

#### **환경변수 설정**
`.env.development` (로컬 개발용):
```env
NODE_ENV=development
DATABASE_URL=sqlite:./taskflow.db
```

`.env.production` (가비아 배포용):
```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@db.gabia.com:5432/dbname
PORT=3000
CORS_ORIGIN=https://yourdomain.com
```

### **4.3 스키마 파일 수정**
현재 SQLite용 스키마를 PostgreSQL 호환으로 수정:

```typescript
// server/schema.ts
import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const dailyTasks = pgTable('daily_tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  assignedTo: text('assigned_to').notNull(),
  status: text('status').default('pending'),
  priority: text('priority').default('medium'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  // ... 기타 필드들
});
```

---

## 🌐 **STEP 5: API 엔드포인트 수정**

### **5.1 클라이언트 API 기본 URL 변경**

#### **src/lib/api.ts 수정**
```typescript
// 환경에 따른 API URL 설정
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-gabia-server.com/api'  // 가비아 서버 URL
  : 'http://localhost:3000/api';         // 로컬 개발 URL

export const api = {
  get: (endpoint: string) => fetch(`${API_BASE_URL}${endpoint}`),
  post: (endpoint: string, data: any) => 
    fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  // ... 기타 HTTP 메서드들
};
```

### **5.2 Vite 환경변수 설정**

#### **vite.config.ts 수정**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 환경변수 접두사 설정
  envPrefix: 'VITE_',
  
  // 빌드 설정
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
  },
  
  // 개발 서버 설정
  server: {
    port: 5173,
    host: true
  }
});
```

---

## 🔧 **STEP 6: Tauri 설정 최적화**

### **6.1 tauri.conf.json 설정**
```json
{
  "build": {
    "beforeDevCommand": "",
    "beforeBuildCommand": "",
    "devPath": "http://localhost:5173",
    "distDir": "../dist/public"
  },
  "package": {
    "productName": "TaskFlow 업무관리시스템",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "http": {
        "all": true,
        "request": true
      },
      "notification": {
        "all": true
      },
      "window": {
        "all": false,
        "close": true,
        "hide": true,
        "show": true,
        "maximize": true,
        "minimize": true
      }
    },
    "bundle": {
      "active": true,
      "category": "Productivity",
      "copyright": "",
      "deb": {
        "depends": []
      },
      "externalBin": [],
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "identifier": "com.taskflow.master",
      "longDescription": "TaskFlow 업무관리시스템 - 효율적인 업무 관리를 위한 데스크톱 애플리케이션",
      "macOS": {
        "entitlements": null,
        "exceptionDomain": "",
        "frameworks": [],
        "providerShortName": null,
        "signingIdentity": null
      },
      "resources": [],
      "shortDescription": "TaskFlow 업무관리시스템",
      "targets": "all",
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": ""
      }
    },
    "security": {
      "csp": null
    },
    "updater": {
      "active": false
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 900,
        "resizable": true,
        "title": "TaskFlow 업무관리시스템",
        "width": 1400,
        "minWidth": 1200,
        "minHeight": 800
      }
    ]
  }
}
```

### **6.2 Rust main.rs 수정**
```rust
// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 앱 시작 시 실행할 코드
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 🚀 **STEP 7: 빌드 및 테스트**

### **7.1 개발 모드 테스트**
```bash
# 1. 로컬 서버 실행 (기존 방식)
npm run dev:server

# 2. 별도 터미널에서 Tauri 앱 실행
npm run dev:tauri
```

### **7.2 프로덕션 빌드**
```bash
# 클라이언트 빌드
npm run build

# Tauri 앱 빌드
npm run build:tauri
```

빌드 완료 후 `src-tauri/target/release/` 폴더에 실행 파일 생성됨.

---

## 📦 **STEP 8: 배포 준비**

### **8.1 서버 코드 가비아 배포**
```bash
# 서버만 별도로 빌드
npm run build:server

# 필요한 파일들을 가비아 서버로 업로드:
# - dist/ (빌드된 서버 코드)
# - package.json
# - .env.production
```

### **8.2 PC 앱 배포**
- `src-tauri/target/release/TaskFlowMaster.exe` 파일을 직원들에게 배포
- 또는 자동 업데이트 서버 구축

---

## ✅ **작업 체크리스트**

### **즉시 해야 할 작업**
- [ ] 현재 데이터베이스 오류 해결 (daily_tasks 테이블)
- [ ] Rust 설치
- [ ] Tauri CLI 설치
- [ ] Tauri 프로젝트 초기화

### **단계별 작업**
- [ ] PostgreSQL 드라이버 설치 및 설정
- [ ] API 엔드포인트 URL 수정
- [ ] Tauri 설정 파일 최적화
- [ ] 개발 모드 테스트
- [ ] 가비아 호스팅 신청
- [ ] 프로덕션 빌드 및 배포

---

## 🚨 **예상 문제점 및 해결책**

### **1. Rust 컴파일 오류**
**문제**: Windows에서 Rust 컴파일 실패
**해결**: Visual Studio Build Tools 설치 필요

### **2. 데이터베이스 마이그레이션**
**문제**: SQLite → PostgreSQL 데이터 이전
**해결**: 기존 데이터 백업 후 수동 또는 스크립트로 이전

### **3. CORS 오류**
**문제**: 데스크톱 앱에서 가비아 서버 API 호출 시 CORS 오류
**해결**: 서버에서 적절한 CORS 설정 필요

### **4. 인증/세션 문제**
**문제**: 데스크톱 앱에서 세션 관리
**해결**: JWT 토큰 기반 인증으로 변경 검토

---

## 📞 **다음 단계 진행 방법**

1. **현재 시스템 안정화**: 데이터베이스 오류 해결
2. **개발 환경 구축**: Rust + Tauri 설치
3. **단계별 테스트**: 각 변경사항마다 충분한 테스트
4. **점진적 전환**: 한 번에 모든 것을 바꾸지 말고 단계적 적용

각 단계에서 문제가 발생하면 즉시 중단하고 해결 후 진행하세요. 