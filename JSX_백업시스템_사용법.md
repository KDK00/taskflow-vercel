# JSX 백업 시스템 사용법

## 🛡️ JSX 파일 백업 규칙

### 1. 백업 생성 규칙
- **모든 JSX/TSX 파일 수정 전에 백업 생성**
- 백업 파일명: `원본파일명.backup`
- 예시: `schedule-modal.tsx` → `schedule-modal.tsx.backup`

### 2. 현재 백업된 파일
- ✅ `schedule-modal.tsx.backup` (정상 작동 버전)

### 3. 백업 생성 방법
```bash
# 새로운 JSX 파일 수정 전
cp 원본파일.tsx 원본파일.tsx.backup
```

### 4. 오류 발생시 복구 방법

#### 4-1. 백업에서 복구
```bash
# 백업 파일에서 원본 복구
cp schedule-modal.tsx.backup schedule-modal.tsx
```

#### 4-2. 현재 정상 작동하는 설정
- **서버**: http://localhost:3003
- **클라이언트**: http://localhost:5173
- **업무 카테고리**: ["일반업무", "신규계약", "계약관리", "계약해지"]
- **일정 탭**: 완전 제거됨 (업무 탭만 존재)

### 5. 웹페이지 접속 방법

#### 5-1. 정상 실행 중인 경우
```
http://localhost:5173 에 바로 접속
```

#### 5-2. 서버 재시작이 필요한 경우
```bash
# 방법 1: 자동 배치파일 실행
✅최종완성_실행.bat
🎯TaskFlowMaster_완전자동실행.bat
웹실행_완전자동.bat

# 방법 2: 수동 실행
npm run dev:all
```

#### 5-3. 터미널 문제 발생시
1. **작업관리자**에서 모든 `node.exe`, `tsx.exe`, `cmd.exe` 프로세스 종료
2. 새 명령 프롬프트 열기
3. 프로젝트 디렉토리로 이동
4. `npm run dev:all` 실행

### 6. 주요 기능 테스트 포인트
- [ ] 새업무추가 버튼 클릭
- [ ] 업무 카테고리 4개 표시 확인
- [ ] 활동 구분 3개 버튼 작동 확인
- [ ] 계약해지 선택시 확인 체크박스 표시
- [ ] 업무 생성 성공

### 7. 백업 파일 관리
- 정상 작동 확인 후 오래된 백업 파일은 삭제 가능
- 중요한 수정사항이 있을 때마다 새로운 백업 생성
- 날짜별 백업: `schedule-modal.tsx.backup.20241209`

---

## 🚨 응급 복구 명령어

```bash
# 긴급 복구 (백업에서 원본 복구)
cp client/src/components/modals/schedule-modal.tsx.backup client/src/components/modals/schedule-modal.tsx

# 서버 완전 재시작
taskkill /f /im node.exe
npm run dev:all

# 웹페이지 접속
start http://localhost:5173
``` 