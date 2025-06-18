# TaskFlow 시스템 가비아 배포 완전 가이드

## 🎯 시스템 구성 개요

**확정된 아키텍처:**
- 🖥️ **클라이언트**: Tauri PC 앱 (현재 개발 완료)
- 🌐 **도메인**: 가비아 도메인 (mmsolutions.kr) ✅ 신청완료
- 🔧 **서버 & DB**: 가비아 컨테이너 호스팅 '스탠더드'

## 🚀 1단계: 가비아 서비스 신청

### 1-1. 가비아 도메인 신청
```
서비스: 도메인 등록
추천 도메인: 
- taskflow.co.kr (연 13,200원)
- taskflow.kr (연 22,000원)
- taskflow.com (연 17,600원)

URL: https://domain.gabia.com
```

### 1-2. 가비아 컨테이너 호스팅 스탠더드 신청
```
서비스: 컨테이너 호스팅 스탠더드
- CPU: 1 Core
- 메모리: 2GB
- 디스크: 20GB SSD
- 트래픽: 무제한
- 월 요금: 22,000원

URL: https://www.gabia.com/service/product/container_hosting
```

## 🔧 2단계: 서버 코드 가비아 배포용 수정

### 2-1. 프로덕션 환경 설정 파일 생성

**`server/config/production.js`**
```javascript
module.exports = {
  port: process.env.PORT || 3000,
  database: {
    type: 'sqlite',
    database: './data/taskflow_production.db',
    synchronize: false,
    logging: false
  },
  cors: {
    origin: [
      'tauri://localhost',
      'https://tauri.localhost',
      'http://localhost',
      'https://mmsolutions.kr',  // 실제 신청한 도메인
      'https://www.mmsolutions.kr'
    ],
    credentials: true
  },
  security: {
    jwt: {
      secret: process.env.JWT_SECRET || 'taskflow-production-secret-key-2024',
      expiresIn: '24h'
    },
    bcrypt: {
      saltRounds: 12
    }
  }
};
```

### 2-2. Dockerfile 생성

**`Dockerfile`**
```dockerfile
# Node.js 18 Alpine 이미지 사용
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필요 패키지 설치
RUN apk update && apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 애플리케이션 코드 복사
COPY . .

# 데이터 디렉토리 생성
RUN mkdir -p /app/data

# 포트 노출
EXPOSE 3000

# 환경변수 설정
ENV NODE_ENV=production
ENV PORT=3000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 애플리케이션 시작
CMD ["npm", "run", "start:production"]
```

### 2-3. docker-compose.yml 생성

**`docker-compose.yml`**
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
      - JWT_SECRET=${JWT_SECRET:-taskflow-production-secret-key-2024}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  taskflow-data:
    driver: local
```

### 2-4. package.json 스크립트 추가

```json
{
  "scripts": {
    "start:production": "cross-env NODE_ENV=production tsx server/index.ts",
    "build:docker": "docker build -t taskflow-server .",
    "deploy:gabia": "docker-compose up -d"
  }
}
```

## 🌐 3단계: 가비아 컨테이너 호스팅 배포

### 3-1. 가비아 컨테이너 호스팅 접속
```bash
# SSH 접속 (가비아에서 제공하는 정보 사용)
ssh username@your-container-host.gabia.com
```

### 3-2. 필요 소프트웨어 설치
```bash
# Docker 설치 확인
docker --version

# Git 설치 확인
git --version

# Node.js 설치 (필요시)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3-3. TaskFlow 코드 배포
```bash
# 프로젝트 클론
git clone https://github.com/your-username/taskflow.git
cd taskflow

# 환경변수 파일 생성
cat > .env << EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-here
DOMAIN=taskflow.co.kr
EOF

# Docker 컨테이너 빌드 및 실행
docker-compose up -d

# 상태 확인
docker ps
docker logs taskflow-production
```

## 🔗 4단계: 도메인 연결

### 4-1. 가비아 DNS 설정
```
가비아 My가비아 > 서비스 관리 > DNS 설정

A 레코드 추가:
- 호스트: @ (또는 비워둠)
- 값: [가비아 컨테이너 호스팅 IP]
- TTL: 300

A 레코드 추가:
- 호스트: www
- 값: [가비아 컨테이너 호스팅 IP]
- TTL: 300

CNAME 레코드 추가:
- 호스트: api
- 값: taskflow.co.kr
- TTL: 300
```

### 4-2. SSL 인증서 설정 (Let's Encrypt)
```bash
# Certbot 설치
sudo apt update
sudo apt install certbot

# SSL 인증서 발급
sudo certbot certonly --standalone -d taskflow.co.kr -d www.taskflow.co.kr

# Nginx 리버스 프록시 설정
sudo apt install nginx

# Nginx 설정 파일 생성
sudo tee /etc/nginx/sites-available/taskflow << EOF
server {
    listen 80;
    server_name taskflow.co.kr www.taskflow.co.kr;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name taskflow.co.kr www.taskflow.co.kr;

    ssl_certificate /etc/letsencrypt/live/taskflow.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/taskflow.co.kr/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Nginx 설정 활성화
sudo ln -s /etc/nginx/sites-available/taskflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🖥️ 5단계: Tauri PC 앱 수정 (프로덕션용)

### 5-1. API 엔드포인트 변경

**`src/config/api.ts`**
```typescript
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000',
    timeout: 10000
  },
  production: {
    baseURL: 'https://taskflow.co.kr',  // 실제 도메인
    timeout: 15000
  }
};

export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? API_CONFIG.production.baseURL 
  : API_CONFIG.development.baseURL;

export const API_TIMEOUT = process.env.NODE_ENV === 'production' 
  ? API_CONFIG.production.timeout 
  : API_CONFIG.development.timeout;
```

### 5-2. Tauri 보안 설정 업데이트

**`src-tauri/tauri.conf.json`**
```json
{
  "tauri": {
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://taskflow.co.kr https://www.taskflow.co.kr; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    }
  },
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  }
}
```

### 5-3. 프로덕션 빌드 생성

```bash
# 웹 애플리케이션 빌드
npm run build

# Tauri 프로덕션 빌드
npm run build:tauri

# 설치 파일 확인
ls src-tauri/target/release/bundle/
```

## 📦 6단계: PC 앱 배포 및 배포

### 6-1. 설치 파일 생성
```bash
# Windows 설치 파일
src-tauri/target/release/bundle/msi/TaskFlow_1.0.0_x64_en-US.msi

# 또는 NSIS 설치 파일
src-tauri/target/release/bundle/nsis/TaskFlow_1.0.0_x64-setup.exe
```

### 6-2. 배포 방법
```
방법 1: 직접 배포
- USB나 네트워크를 통해 직접 설치

방법 2: 웹사이트 배포
- 가비아 호스팅에 다운로드 페이지 생성
- https://taskflow.co.kr/download

방법 3: 자동 업데이트 (고급)
- Tauri 업데이트 기능 활용
```

## 🔒 7단계: 보안 및 모니터링

### 7-1. 방화벽 설정
```bash
# UFW 방화벽 설정
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
```

### 7-2. 모니터링 설정
```bash
# 로그 모니터링
tail -f logs/taskflow.log

# 시스템 리소스 모니터링
htop
docker stats
```

## ✅ 8단계: 테스트 및 검증

### 8-1. 서버 API 테스트
```bash
# 헬스 체크
curl https://taskflow.co.kr/api/health

# 로그인 테스트
curl -X POST https://taskflow.co.kr/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 8-2. PC 앱 테스트
```
1. PC 앱 설치 및 실행
2. 로그인 기능 확인
3. 업무 생성/수정/삭제 확인
4. 네트워크 연결 확인
5. 데이터 동기화 확인
```

## 🎉 완료 체크리스트

- [ ] 가비아 도메인 신청 및 설정
- [ ] 가비아 컨테이너 호스팅 신청
- [ ] 서버 코드 프로덕션 환경 수정
- [ ] Docker 컨테이너 배포
- [ ] 도메인 DNS 연결
- [ ] SSL 인증서 설정
- [ ] Tauri 앱 프로덕션 빌드
- [ ] PC 앱 배포 및 설치
- [ ] 전체 시스템 테스트

## 💰 예상 비용

```
가비아 도메인 (.co.kr): 연 13,200원
가비아 컨테이너 호스팅 스탠더드: 월 22,000원
SSL 인증서: 무료 (Let's Encrypt)

총 월 비용: 약 23,100원
총 연 비용: 약 277,200원
```

## 🔧 문제 해결

### 일반적인 문제들
1. **도메인 연결 안됨**: DNS 전파 대기 (최대 24시간)
2. **SSL 오류**: 인증서 갱신 필요
3. **PC 앱 연결 실패**: 방화벽 또는 CORS 설정 확인
4. **데이터베이스 오류**: 디스크 용량 및 권한 확인

이 가이드를 따라하면 TaskFlow 시스템을 가비아 환경에서 완전히 운영할 수 있습니다! 