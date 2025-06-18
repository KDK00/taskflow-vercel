# TaskFlowMaster 카드섹션 구조 분석

## 📋 전체 카드섹션 개요

TaskFlowMaster는 다음과 같은 주요 카드섹션들로 구성되어 있습니다:

1. **요약 카드 (Summary Cards)**
2. **업무 목록 카드 (Task List Card)**
3. **일정 관리 카드 (Calendar Card)**
4. **주간 보고서 카드 (Weekly Report Card)**
5. **팀 채팅 카드 (Team Chat Card)**
6. **관리자 뷰 카드 (Manager View Card)**

---

## 1. 📊 요약 카드 (Summary Cards)

### 🏗️ 구조
- **파일 위치**: `client/src/components/dashboard/summary-cards.tsx`
- **컴포넌트명**: `SummaryCards`

### 🔧 변수 및 Props
```typescript
interface SummaryCardsProps {
  userRole: "employee" | "manager";
  onFilterChange?: (filter: string) => void;
  activeFilter?: string;
}
```

### 🌐 API 엔드포인트
```typescript
// 관리자용
endpoint: "/api/team/stats"
queryKey: ["/api/team/stats"]

// 직원용  
endpoint: "/api/users/me/stats"
queryKey: ["/api/users", "me", "stats"]
```

### 📦 데이터 구조
```typescript
interface DashboardStats {
  totalTasks: number;        // 전체 업무
  completedTasks: number;    // 완료된 업무
  inProgressTasks: number;   // 진행중 업무
  overdueTasks: number;      // 지연된 업무
  pendingTasks: number;      // 대기중 업무
  reviewTasks: number;       // 검토중 업무
}
```

### 🎨 카드 구성 (4개)
```typescript
const cards = [
  {
    title: "전체 업무",
    value: stats?.totalTasks || 0,
    icon: BarChart3,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    change: "+12%",
    changeLabel: "지난 주 대비",
    filter: "all"
  },
  {
    title: "진행 중", 
    value: stats?.inProgressTasks || 0,
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    progress: "계산된 진행률",
    progressLabel: "진행중",
    filter: "progress"
  },
  {
    title: "완료",
    value: stats?.completedTasks || 0,
    icon: CheckCircle,
    color: "text-green-600", 
    bgColor: "bg-green-100",
    change: "+2 오늘",
    changeLabel: "완료됨",
    filter: "completed"
  },
  {
    title: "지연",
    value: stats?.overdueTasks || 0,
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100", 
    alert: true,
    filter: "overdue"
  }
];
```

### 🎭 스타일링
- **기본 클래스**: `glass-card task-card`
- **호버 효과**: `hover:scale-105 hover:shadow-lg`
- **활성 상태**: `ring-2 ring-purple-500 bg-purple-50`
- **그리드 레이아웃**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

---

## 2. 📝 업무 목록 카드 (Task List Card)

### 🏗️ 구조
- **파일 위치**: `client/src/pages/dashboard.tsx` (내부 컴포넌트)
- **컴포넌트명**: `TaskList`

### 🔧 Props 및 함수
```typescript
interface TaskListProps {
  onCreateTask: () => void;
  onEditTask: (taskId: number) => void;
}
```

### 🌐 API 엔드포인트
```typescript
endpoint: "/api/tasks"
queryKey: ["/api/tasks"]
select: (data: any) => data?.tasks || []
```

### 📦 업무 데이터 구조
```typescript
interface TaskFormData {
  title: string;
  description: string;
  category: string;
  priority: PriorityType;
  assignedTo: number;
  startDate: string;
  dueDate: string;
  targetPlace?: string;
  contractType?: string;
}

type PriorityType = 'low' | 'medium' | 'high' | 'urgent';
type StatusType = 'pending' | 'progress' | 'review' | 'completed' | 'overdue';
```

### 🎨 업무 상태별 스타일
```typescript
const statusColors = {
  completed: 'bg-green-500',
  progress: 'bg-blue-500', 
  overdue: 'bg-red-500',
  default: 'bg-gray-400'
};

const priorityBadges = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary'
};
```

### 📊 표시 로직
- **최대 표시**: 5개 업무 (슬라이싱)
- **빈 상태**: 📋 아이콘과 안내 메시지
- **전체 개수**: 헤더에 `({safeTasks.length}개)` 표시

---

## 3. 📅 일정 관리 카드 (Calendar Card)

### 🏗️ 구조
- **파일 위치**: `client/src/pages/dashboard.tsx` (내부 컴포넌트)
- **컴포넌트명**: `CalendarView`

### 🔧 상태 변수
```typescript
const [selectedDate, setSelectedDate] = useState(new Date());
const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
```

### 🎨 UI 구성
- **아이콘**: `Calendar` (purple-600)
- **빈 상태**: 📅 아이콘과 안내 메시지
- **모달 연동**: `ScheduleModal` 컴포넌트

### 🔗 연결된 모달
```typescript
<ScheduleModal
  isOpen={isScheduleModalOpen}
  onClose={() => setIsScheduleModalOpen(false)}
  selectedDate={selectedDate}
  mode="schedule"  // 일정 모드
/>
```

---

## 4. 📄 주간 보고서 카드 (Weekly Report Card)

### 🏗️ 구조
- **파일 위치**: `client/src/components/dashboard/weekly-report.tsx`
- **컴포넌트명**: `WeeklyReport`

### 🌐 관련 기능
- **Excel 업로드**: `ScheduleExcelUpload` 컴포넌트 연동
- **보고서 생성**: 주간 단위 업무 보고서

---

## 5. 💬 팀 채팅 카드 (Team Chat Card)

### 🏗️ 구조
- **파일 위치**: `client/src/components/dashboard/team-chat.tsx`
- **컴포넌트명**: `TeamChat`

### 🔔 실시간 기능
- **WebSocket 연동**: 실시간 메시지
- **알림 배지**: 읽지 않은 메시지 개수 표시

---

## 6. 👥 관리자 뷰 카드 (Manager View Card)

### 🏗️ 구조
- **파일 위치**: `client/src/components/dashboard/manager-view.tsx`
- **컴포넌트명**: `ManagerView`

### 🌐 팀 통계 API
```typescript
endpoint: "/api/team/stats"
queryKey: ["/api/team/stats"]
```

---

## 🔧 공통 시스템 구조

### 🎯 메인 탭 시스템
```typescript
const tabs = [
  { value: "tasks", icon: CheckSquare, label: "업무관리" },
  { value: "reports", icon: FileText, label: "주간보고서" },
  { value: "calendar", icon: Calendar, label: "일정관리" },
  { value: "chat", icon: MessageCircle, label: "팀채팅" }
];
```

### 🎨 공통 스타일 클래스
```css
.glass-card {
  /* 유리 효과 카드 */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.task-card {
  /* 업무 카드 전용 스타일 */
  transition: all 0.2s ease;
}

.gradient-bg {
  /* 배경 그라데이션 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### 🔌 WebSocket 시스템
```typescript
interface WebSocketMessage {
  type: 'task_created' | 'task_updated' | 'comment_added' | 'notification';
  data: any;
}
```

### 🛡️ 인증 시스템
```typescript
// 임시 사용자 (세션 기반)
const validUsers = ['admin', 'nara1', 'nara2', 'nara3', 'nara4', 'nara5', 'nara6'];

// 사용자 역할
type UserRole = 'employee' | 'manager';
```

---

## 📊 서버 API 엔드포인트 전체 목록

### 👤 사용자 관련
- `POST /api/login` - 로그인
- `GET /api/me` - 현재 사용자 정보
- `GET /api/user` - 사용자 정보 (별칭)
- `GET /api/users` - 사용자 목록
- `GET /api/users/me/stats` - 개인 통계

### 📋 업무 관련
- `GET /api/tasks` - 업무 목록
- `POST /api/tasks` - 업무 생성
- `PUT /api/tasks/:id` - 업무 수정
- `DELETE /api/tasks/:id` - 업무 삭제

### 📈 통계 관련
- `GET /api/team/stats` - 팀 통계 (관리자용)

### 🔔 알림 관련
- `GET /api/notifications` - 알림 목록

### 📁 파일 관련
- `POST /api/excel/upload` - Excel 파일 업로드
- `POST /api/excel/parse` - Excel 파일 파싱

---

## 🎯 카테고리 시스템

### 📊 업무 카테고리
```typescript
const taskCategories = ["일반업무", "신규계약", "계약관리", "계약해지"];
```

### 🔥 우선순위 시스템
```typescript
const priorities = [
  { value: "low", label: "낮음", color: "bg-gray-100 text-gray-600" },
  { value: "medium", label: "보통", color: "bg-blue-100 text-blue-600" },
  { value: "high", label: "높음", color: "bg-orange-100 text-orange-600" },
  { value: "urgent", label: "긴급", color: "bg-red-100 text-red-600" }
];
```

### 📋 활동 구분
```typescript
const contractTypes = ['신규계약', '계약관리', '계약해지'];
```

이 문서는 TaskFlowMaster 프로젝트의 모든 카드섹션 구조를 상세히 설명합니다. 각 섹션은 독립적으로 작동하며, 공통 API와 상태 관리 시스템을 통해 연동됩니다. 