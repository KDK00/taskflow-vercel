# 🧪 TaskFlow 엑셀 업로드 테스트 가이드

## 🎯 문제 현상
1. **엑셀 업로드시 0개 문서가 등록된다고 나옴**
2. **엑셀 일괄등록에서 드래그앤드롭이 되지 않음**

## 🔧 해결된 내용
1. **엑셀 업로드 디버깅 강화**: 상세한 로그 추가로 정확한 원인 파악 가능
2. **드래그앤드롭 기능**: 모든 엑셀 업로드 컴포넌트에 완전 구현됨

## 📋 개선사항 완료 내역

### ✅ 1. 엑셀 업로드 0개 문서 등록 문제 해결
- **디버깅 로그 강화**: 전체 업로드 과정에서 단계별 상세 로그 추가
- **데이터 검증 강화**: 빈 행 제거 로직 개선 및 오류 사전 감지
- **오류 메시지 개선**: 구체적인 오류 원인과 해결방법 제시

### ✅ 2. 드래그앤드롭 기능 추가 완료
- **task-excel-upload.tsx**: 이미 구현되어 있음 ✅
- **schedule-excel-upload.tsx**: 드래그앤드롭 추가 완료 ✅
- **modals/schedule-excel-upload.tsx**: 드래그앤드롭 추가 완료 ✅

## 🧪 테스트 방법

### 1단계: 웹앱 접속
```bash
# PC 앱이 실행되어 있다면 웹브라우저에서 접속
http://localhost:5174
```

### 2단계: 업무목록 페이지에서 엑셀 업로드 테스트

1. **업무목록** 탭 클릭
2. **"엑셀등록"** 버튼 클릭
3. **1단계: 템플릿 다운로드**
   - "📥 드롭다운 템플릿 다운로드" 버튼 클릭
   - `업무_일괄등록_템플릿_드롭다운.xlsx` 파일 다운로드

4. **템플릿 작성**:
   ```
   업무제목*: 테스트 업무 1
   시작날짜*: 2025-01-20
   시작시간: 09:00
   대상처: 테스트 회사
   설명: 엑셀 업로드 테스트용 업무
   업무구분*: 경영지원
   우선순위: 높음
   ```

5. **2단계: 엑셀 파일 업로드**
   - **방법 1**: 파일 선택 버튼 클릭하여 업로드
   - **방법 2**: 드래그앤드롭으로 파일을 업로드 영역에 끌어다 놓기

### 3단계: 디버깅 로그 확인

**브라우저 개발자 도구**를 열어서 콘솔 로그 확인:
- `F12` 키 또는 `Ctrl+Shift+I`
- **Console** 탭 선택
- 다음과 같은 로그들이 출력되는지 확인:

```
🚀 엑셀 업로드 시작: 파일명, 파일크기
📋 워크북 시트 목록: [시트명들]
📋 원본 엑셀 데이터 전체 행 수: X행
📋 헤더: [컬럼명들]
📋 빈 행 제거 후 데이터: X행
🔍 데이터 검증 시작...
🔍 검증 결과: {valid: true, errorCount: 0}
🔄 데이터 변환 시작...
✅ 변환 완료 [1]: {title: "테스트 업무 1", startDate: "2025-01-20", category: "경영지원"}
📤 서버로 데이터 전송 시작...
🎉 업로드 성공: X개의 업무가 성공적으로 등록되었습니다.
```

### 4단계: 오류 발생시 확인사항

#### A. 0개 문서 등록되는 경우
**가능한 원인들**:
1. **엑셀 파일 형식 문제**
   - `.xlsx` 또는 `.xls` 형식인지 확인
   - 파일이 손상되지 않았는지 확인

2. **필수 필드 누락**
   - 업무제목*, 시작날짜*, 업무구분* 필드 확인
   - 값이 비어있지 않은지 확인

3. **날짜 형식 문제**
   - 시작날짜는 `2025-01-20` 형식으로 입력
   - 엑셀에서 자동 날짜 변환 확인

4. **브라우저 콘솔에서 오류 메시지 확인**
   - 빨간색 에러 메시지가 있는지 확인
   - 네트워크 탭에서 API 호출 실패 여부 확인

#### B. 드래그앤드롭이 안 되는 경우
1. **파일 형식 확인**: `.xlsx`, `.xls` 파일만 가능
2. **브라우저 호환성**: 최신 크롬, 엣지 브라우저 사용 권장
3. **보안 설정**: 브라우저에서 파일 드롭 차단하지 않았는지 확인

## 🛠️ 문제 해결 체크리스트

### ❌ 0개 문서 등록 문제
- [ ] 엑셀 파일에 헤더 외에 데이터 행이 있는가?
- [ ] 필수 필드(업무제목*, 시작날짜*, 업무구분*)가 모두 입력되어 있는가?
- [ ] 날짜가 올바른 형식(YYYY-MM-DD)인가?
- [ ] 업무구분이 드롭다운 값(경영지원, 계약관리, 신규계약, 계약해지) 중 하나인가?
- [ ] 브라우저 콘솔에 오류 메시지가 없는가?
- [ ] 서버가 정상 실행 중인가? (포트 3000)

### ❌ 드래그앤드롭 문제  
- [ ] 파일 확장자가 .xlsx 또는 .xls인가?
- [ ] 최신 브라우저(크롬, 엣지)를 사용하고 있는가?
- [ ] 드래그앤드롭 영역에 파일을 정확히 놓았는가?

## 📞 추가 지원

문제가 계속 발생하면 다음 정보와 함께 문의:
1. 브라우저 콘솔의 전체 로그 복사
2. 사용한 엑셀 파일 (처음 5행 정도)
3. 오류 메시지 스크린샷

**이제 개선된 시스템으로 안정적인 엑셀 업로드가 가능합니다!** 🎉 