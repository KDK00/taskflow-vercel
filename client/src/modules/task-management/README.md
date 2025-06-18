# 📋 Task Management 모듈

완전히 모듈화된 작업 관리 시스템으로, 새 업무 추가와 후속담당자 지정 기능을 제공합니다.

## 🚀 주요 기능

### ✨ 핵심 기능
- ✅ **새 업무 생성**: 완전한 업무 생성 인터페이스
- 🔄 **반복 일정**: 일간/주간/월간/연간 반복 옵션
- 📊 **활동 유형 분류**: 경영일반 vs 계약업무 그룹
- 👥 **후속담당자 지정**: 경영일반/계약업무별 후속담당자 설정
- 🔔 **자동 확인요청**: 후속담당자에게 자동 확인요청 업무 생성
- ⚠️ **계약해지 확인**: 계약해지 시 필수 확인 절차

### 🎯 후속담당자 시스템
- **경영일반 후속담당자**: 경영일반 활동에 대한 확인 담당자
- **계약업무 후속담당자**: 신규계약/계약관리/계약해지에 대한 확인 담당자
- **자동 후속업무 생성**: 원본 업무 생성 시 자동으로 확인요청 업무 생성
- **확인/반려 시스템**: 후속담당자가 확인완료 또는 반려 처리 가능

## 📁 구조

```
client/src/modules/task-management/
├── components/
│   ├── task-create-modal.tsx          # 업무 생성 모달 (메인 컴포넌트)
│   ├── follow-up-assignee-selector.tsx # 후속담당자 선택 컴포넌트
│   └── index.ts                       # 컴포넌트 내보내기
├── index.ts                           # 모듈 내보내기
└── README.md                          # 문서화
```

## 🔧 사용법

### 기본 사용법

```tsx
import { TaskCreateModal } from '@/modules/task-management/components';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <TaskCreateModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      selectedDate={new Date()}
    />
  );
}
```

### 편집 모드

```tsx
import { TaskCreateModal } from '@/modules/task-management/components';

function EditTaskExample() {
  const [editingTask, setEditingTask] = useState(null);
  
  return (
    <TaskCreateModal
      isOpen={!!editingTask}
      onClose={() => setEditingTask(null)}
      editingTaskId={editingTask?.id}
      selectedDate={editingTask?.dueDate}
    />
  );
}
```

### 후속담당자 선택기

```tsx
import { FollowUpAssigneeSelector } from '@/modules/task-management/components';

function FollowUpExample() {
  const [assignee, setAssignee] = useState(null);
  
  return (
    <FollowUpAssigneeSelector
      type="general" // 또는 "contract"
      value={assignee}
      onChange={setAssignee}
      users={userList}
    />
  );
}
```

## 📊 데이터 구조

### Task 인터페이스 확장

```typescript
interface Task {
  // 기본 필드
  id: number;
  title: string;
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  category: string;
  
  // 후속담당자 필드 (새로 추가됨)
  followUpAssigneeGeneral?: number | null;     // 경영일반 후속담당자
  followUpAssigneeContract?: number | null;    // 계약업무 후속담당자
  isFollowUpTask?: boolean;                    // 후속업무 여부
  parentTaskId?: number | null;                // 원본 업무 ID
  followUpType?: 'general' | 'contract' | null; // 후속업무 타입
  
  // 반복 일정 필드
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringDays?: string[];
  recurringEndDate?: string;
  recurringCount?: number;
}
```

## 🎨 활동 유형 구성

### 📊 경영일반 그룹
- **경영일반**: 일반적인 경영 업무
- **색상**: Indigo 테마
- **후속담당자**: 경영일반 후속담당자 지정 가능

### 📋 계약업무 그룹
- **신규계약**: Green 테마
- **계약관리**: Blue 테마  
- **계약해지**: Red 테마 + 필수 확인 절차
- **후속담당자**: 계약업무 후속담당자 지정 가능

## 🔄 후속담당자 워크플로우

### 1. 업무 생성 단계
```
1. 사용자가 새 업무 생성
2. 활동 유형 선택 (경영일반 또는 계약업무)
3. 해당 유형의 후속담당자 선택 (선택사항)
4. 업무 저장
```

### 2. 자동 후속업무 생성
```
1. 원본 업무 저장 시 createFollowUpTasks() 함수 실행
2. 후속담당자가 지정된 경우 자동으로 "[확인요청] 제목" 형태의 업무 생성
3. 후속업무는 isFollowUpTask: true로 마킹
4. 후속담당자에게 실시간 알림 전송
```

### 3. 확인요청 처리
```
1. 후속담당자가 대시보드에서 확인요청 카드 확인
2. "확인완료" 또는 "반려" 선택
3. 확인완료: status를 'completed'로 변경
4. 반려: status를 'cancelled'로 변경 + 반려 사유 기록
5. 원본 업무 작성자에게 결과 알림 전송
```

## 🎛️ API 엔드포인트

### 후속업무 관련 API

```typescript
// 후속업무 목록 조회
GET /api/tasks/follow-up
Response: { success: boolean, followUpTasks: Task[] }

// 후속업무 확인완료
PATCH /api/tasks/:id/confirm
Response: { success: boolean, task: Task }

// 후속업무 반려
PATCH /api/tasks/:id/reject
Body: { reason: string }
Response: { success: boolean, task: Task }

// 업무 생성 (확장됨)
POST /api/tasks
Body: {
  // 기존 필드들...
  followUpAssigneeGeneral?: number,
  followUpAssigneeContract?: number
}
```

## 🔔 알림 시스템

### 새로운 알림 타입
- `follow_up_task_created`: 후속업무 생성됨
- `follow_up_task_confirmed`: 후속업무 확인완료됨
- `follow_up_task_rejected`: 후속업무 반려됨

## 🎯 컴포넌트 상세

### TaskCreateModal
- **Props**: `isOpen`, `onClose`, `editingTaskId?`, `selectedDate?`
- **기능**: 완전한 업무 생성/편집 인터페이스
- **특징**: 반복일정, 후속담당자, 활동유형 분류 지원

### FollowUpAssigneeSelector  
- **Props**: `type`, `value`, `onChange`, `users`, `disabled?`
- **기능**: 후속담당자 선택 드롭다운
- **타입**: `'general'` | `'contract'`

### ConfirmationRequestCard
- **Props**: `followUpTasks`, `onConfirm`, `onReject`, `loading?`
- **기능**: 확인요청 업무 목록 및 처리 인터페이스
- **위치**: 대시보드 상단에 자동 표시

## 🛠️ 개발 가이드

### 새로운 활동 유형 추가
1. `TaskCreateModal`의 활동 유형 설정에 새 버튼 추가
2. 해당 유형의 색상 테마 정의
3. 필요시 후속담당자 로직 확장

### 새로운 반복 패턴 추가
1. `recurringType` enum에 새 타입 추가
2. `generateRecurringDates` 함수에 로직 추가
3. UI에서 새 옵션 추가

### 후속담당자 로직 커스터마이징
1. `createFollowUpTasks` 함수 수정
2. 새로운 후속업무 생성 규칙 정의
3. 알림 메시지 커스터마이징

## 📈 향후 개선 계획

### Phase 1 (완료됨)
- ✅ 기본 업무 생성 모듈
- ✅ 반복 일정 시스템
- ✅ 활동 유형 분류
- ✅ 후속담당자 시스템

### Phase 2 (계획)
- 🔄 업무 템플릿 시스템
- 🔄 일괄 업무 생성
- 🔄 업무 종속성 관리
- 🔄 고급 알림 설정

### Phase 3 (계획)
- 🔄 업무 분석 대시보드
- 🔄 성과 지표 추적
- 🔄 자동 업무 할당
- 🔄 ML 기반 업무 추천

## 🤝 기여 가이드

1. 새로운 기능 개발 시 모듈화 원칙 준수
2. TypeScript 타입 정의 필수
3. 컴포넌트 테스트 코드 작성
4. README 문서 업데이트

## 📄 라이선스

이 모듈은 TaskFlowMaster 프로젝트의 일부로 MIT 라이선스 하에 제공됩니다. 