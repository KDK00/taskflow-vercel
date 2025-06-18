# 🚀 PC 앱 (Tauri) + 가비아 클라우드 호스팅 완전 초보자 가이드

## 📋 **전체 진행 순서**
1. 현재 시스템 문제 해결 (데이터베이스 오류 수정)
2. Rust 및 Tauri 환경 구축
3. Tauri 프로젝트 초기화 및 설정
4. 가비아 회원가입 및 호스팅 신청
5. 데이터베이스 서비스 신청
6. 서버 배포 설정
7. PC 앱 빌드 및 배포
8. 자동 업데이트 설정

---

## 🔧 **STEP 1: 현재 시스템 문제 해결**

### **1.1 데이터베이스 오류 해결**
현재 `daily_tasks` 테이블이 생성되지 않는 문제를 해결해야 합니다.

```bash
# 방법 1: 문제해결.bat 사용
문제해결.bat
# 메뉴에서 2번 선택 (데이터베이스 오류 해결)

# 방법 2: 수동 삭제
del taskflow.db
del app.db
```

### **1.2 서버 재시작 및 확인**
```bash
# 서버 중단 (Ctrl+C)
# 서버 재시작
npm run dev:all
```

---

## 🛠️ **STEP 2: Rust 및 Tauri 환경 구축**

### **2.1 Rust 설치 (필수)**
1. [https://rustup.rs/](https://rustup.rs/) 접속
2. "rustup-init.exe" 다운로드
3. 실행 후 **"1"** 입력하여 기본 설치
4. 설치 완료 후 **명령프롬프트 재시작**

### **2.2 설치 확인**
```bash
# Rust 버전 확인
rustc --version
cargo --version
```

### **2.3 Tauri CLI 설치**
```bash
# Tauri CLI 설치
npm install --save-dev @tauri-apps/cli

# 설치 확인
npx tauri --version
```

---

## 🏗️ **STEP 3: Tauri 프로젝트 초기화**

### **3.1 Tauri 초기화**
```bash
# Tauri 초기화 명령어
npx tauri init
```

### **3.2 초기화 설정값**
다음과 같이 입력하세요:

| 질문 | 입력값 |
|------|--------|
| App name | `TaskFlowMaster` |
| Window title | `TaskFlow 업무관리시스템` |
| Web assets location | `../dist/public` |
| Dev server URL | `http://localhost:5173` |
| Dev command | `npm run dev:client` |
| Build command | `npm run build` |

### **3.3 package.json 수정**
다음 스크립트를 추가합니다:

```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "dev:client": "vite",
    "dev:server": "cross-env NODE_ENV=development tsx server/index.ts",
    "dev:all": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "build": "tsc && vite build",
    "build:tauri": "npm run build && npx tauri build",
    "dev:tauri": "npx tauri dev"
  }
}
```

---

## 🌐 **STEP 4: 가비아 회원가입 및 호스팅 신청**

### **4.1 가비아 회원가입**
1. [https://www.gabia.com/](https://www.gabia.com/) 접속
2. 우상단 "회원가입" 클릭
3. 개인/법인 선택 후 정보 입력
4. 이메일 인증 완료

### **4.2 컨테이너 호스팅 신청**
1. 로그인 후 "호스팅" → "컨테이너 호스팅" 선택
2. **추천 플랜**: 프리미엄 무제한 (월 60,000원)
   - CPU: 4 Core
   - RAM: 8GB
   - SSD: 100GB
   - 트래픽: 무제한
3. 결제 및 신청 완료

### **4.3 호스팅 정보 확인**
신청 완료 후 이메일로 전송되는 정보:
- **서버 IP**: xxx.xxx.xxx.xxx
- **SSH 접속 정보**: username@서버IP
- **관리자 패널 URL**: https://xxx.xxx.xxx.xxx:8443

---

## 🗄️ **STEP 5: 데이터베이스 서비스 신청**

### **5.1 DB 호스팅 선택**
1. 가비아 로그인 → "호스팅" → "DB 호스팅"
2. **PostgreSQL 스탠더드** 선택 (월 3,500원)
   - 용량: 200MB
   - 동시접속: 30개
   - 백업: 자동

### **5.2 DB 접속 정보 확인**
신청 완료 후 제공되는 정보:
```
DB 서버: db.gabia.com
포트: 5432
데이터베이스명: your_db_name
사용자명: your_username
비밀번호: your_password
```

---

## 🚀 **STEP 6: 서버 배포 설정**

### **6.1 서버 코드 수정**
현재 SQLite를 PostgreSQL로 변경해야 합니다.

#### **6.1.1 의존성 설치**
```bash
npm install pg @types/pg
npm uninstall better-sqlite3
```

#### **6.1.2 데이터베이스 설정 파일 수정**
server/db.ts 파일을 PostgreSQL용으로 수정합니다.

### **6.2 환경변수 설정**
`.env.production` 파일 생성:
```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@db.gabia.com:5432/dbname
PORT=3000
CORS_ORIGIN=https://yourdomain.com
```

### **6.3 서버 배포**
```bash
# 빌드
npm run build

# 서버 파일을 가비아 컨테이너로 업로드
# (FTP 또는 SSH 사용)
```

---

## 💻 **STEP 7: PC 앱 빌드 및 배포**

### **7.1 Tauri 설정 파일 수정**
`src-tauri/tauri.conf.json` 파일에서 서버 URL을 가비아 서버로 변경:

```json
{
  "build": {
    "beforeDevCommand": "",
    "beforeBuildCommand": "",
    "devPath": "http://localhost:5173",
    "distDir": "../dist/public"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "http": {
        "all": true,
        "request": true
      }
    }
  }
}
```

### **7.2 클라이언트 API URL 수정**
모든 API 호출을 가비아 서버로 변경:
```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-gabia-server.com/api'
  : 'http://localhost:3000/api';
```

### **7.3 PC 앱 빌드**
```bash
# 개발 모드 테스트
npm run dev:tauri

# 프로덕션 빌드
npm run build:tauri
```

빌드 완료 후 `src-tauri/target/release/` 폴더에 실행 파일이 생성됩니다.

---

## 🔄 **STEP 8: 자동 업데이트 설정**

### **8.1 Tauri 자동 업데이트 설정**
`src-tauri/tauri.conf.json`에 업데이트 설정 추가:

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://your-update-server.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "your-public-key"
    }
  }
}
```

### **8.2 업데이트 서버 구축**
가비아 서버에 업데이트 파일 배포용 디렉토리 생성 및 API 구축

---

## ✅ **완료 체크리스트**

### **개발 환경**
- [ ] Rust 설치 완료
- [ ] Tauri CLI 설치 완료
- [ ] 현재 시스템 데이터베이스 오류 해결

### **가비아 설정**
- [ ] 가비아 회원가입 완료
- [ ] 컨테이너 호스팅 신청 완료
- [ ] DB 호스팅 신청 완료
- [ ] 서버 접속 정보 확인

### **코드 수정**
- [ ] 데이터베이스를 PostgreSQL로 변경
- [ ] API URL을 가비아 서버로 변경
- [ ] 환경변수 설정 완료

### **배포**
- [ ] 서버 코드 가비아에 배포
- [ ] PC 앱 빌드 완료
- [ ] 자동 업데이트 설정 완료

---

## 🚨 **주의사항**

1. **데이터 백업**: 기존 SQLite 데이터를 PostgreSQL로 마이그레이션하기 전에 반드시 백업
2. **보안**: 데이터베이스 접속 정보는 환경변수로 관리
3. **테스트**: 각 단계마다 충분한 테스트 진행
4. **도메인**: 가비아에서 도메인 연결 시 DNS 설정 필요 (별도 안내)

---

## 📞 **문제 발생 시 대응 방안**

1. **Rust 설치 실패**: Windows 재부팅 후 재시도
2. **Tauri 빌드 실패**: Visual Studio Build Tools 설치 필요
3. **가비아 연결 실패**: 방화벽 및 보안그룹 설정 확인
4. **데이터베이스 연결 실패**: 네트워크 및 인증 정보 재확인

각 단계에서 문제가 발생하면 즉시 문의하여 해결 후 다음 단계로 진행하세요. 