import { db, initializeTables } from "./db";
import { users, dailyTasks, weeklyTasks, notifications } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function initializeDatabase() {
  try {
    console.log("🔄 데이터베이스 초기화 시작...");

    // 먼저 테이블 생성
    await initializeTables();

    // SQLite용 테이블 정리 (TRUNCATE 대신 DELETE 사용)
    try {
      await db.delete(notifications);
      await db.delete(dailyTasks);
      await db.delete(weeklyTasks);
      await db.delete(users);
      console.log("✅ 기존 데이터 정리 완료");
    } catch (error) {
      console.log("ℹ️  기존 데이터 없음 - 새로 시작");
    }

    // 🔐 초기 테스트 계정 3개 (기본값)
    const realUsers = [
      {
        username: "admin",
        email: "admin@nara.go.kr",
        password: await hashPassword("admin"),
        name: "김동규",
        department: "개발자",
        role: "developer" as const,
      },
      {
        username: "nara0",
        email: "manager@nara.go.kr",
        password: await hashPassword("nara0"),
        name: "관리자",
        department: "경영지원팀",
        role: "manager" as const,
      },
      {
        username: "nara1",
        email: "employee@nara.go.kr",
        password: await hashPassword("nara1"),
        name: "송나영",
        department: "경영지원팀",
        role: "employee" as const,
      },
    ];

    console.log("👥 사용자 계정 생성 중...");
    const createdUsers = await db.insert(users).values(realUsers).returning();
    console.log(`✅ ${createdUsers.length}개 사용자 계정 생성 완료`);

    const admin = createdUsers.find(u => u.username === "admin")!;
    const manager1 = createdUsers.find(u => u.username === "nara0")!;
    const manager2 = createdUsers.find(u => u.username === "nara1")!;

    // 3개 계정만으로 구성된 샘플 일간업무
    const teamDailyTasks = [
      {
        title: "시스템 관리 업무",
        description: "TaskFlowMaster 시스템 관리 및 유지보수",
        assignedTo: admin.id,
        createdBy: admin.id,
        category: "시스템관리",
        status: "in_progress" as const,
        priority: "high" as const,
        progress: 85,
        workDate: "2025-01-20",
        startTime: "09:00",
        endTime: "18:00",
        estimatedHours: 8,
        actualHours: 7,
      },
      {
        title: "업무팀 월간 보고서",
        description: "업무팀의 월간 업무 보고서 작성 및 제출",
        assignedTo: manager1.id,
        createdBy: admin.id,
        category: "보고서작성",
        status: "in_progress" as const,
        priority: "high" as const,
        progress: 60,
        workDate: "2025-01-20",
        startTime: "10:00",
        endTime: "16:00",
        estimatedHours: 6,
        actualHours: 4,
      },
      {
        title: "업무 프로세스 개선안 작성",
        description: "업무팀 업무 프로세스 개선안 작성",
        assignedTo: manager2.id,
        createdBy: admin.id,
        category: "프로세스개선",
        status: "scheduled" as const,
        priority: "medium" as const,
        progress: 0,
        workDate: "2025-01-21",
        startTime: "09:00",
        endTime: "17:00",
        estimatedHours: 8,
      },
      {
        title: "업무팀 예산 계획",
        description: "업무팀 2025년 예산 계획 수립 및 검토",
        assignedTo: manager1.id,
        createdBy: manager2.id,
        category: "예산관리",
        status: "completed" as const,
        priority: "high" as const,
        progress: 100,
        workDate: "2025-01-19",
        startTime: "09:00",
        endTime: "15:00",
        estimatedHours: 6,
        actualHours: 6,
        completedAt: "2025-01-19T15:00:00.000Z",
      },
      {
        title: "팀 회의 준비",
        description: "정기 관리팀 회의 자료 준비 및 회의실 예약",
        assignedTo: manager1.id,
        createdBy: admin.id,
        category: "회의관리",
        status: "completed" as const,
        priority: "low" as const,
        progress: 100,
        workDate: "2025-01-18",
        startTime: "14:00",
        endTime: "16:00",
        estimatedHours: 2,
        actualHours: 2,
        completedAt: "2025-01-18T16:00:00.000Z",
      },
      {
        title: "직원 교육 계획 수립",
        description: "신입 직원 및 기존 직원 교육 계획 수립",
        assignedTo: manager2.id,
        createdBy: admin.id,
        category: "교육",
        status: "in_progress" as const,
        priority: "medium" as const,
        progress: 40,
        workDate: "2025-01-20",
        startTime: "13:00",
        endTime: "17:00",
        estimatedHours: 4,
        actualHours: 2,
      }
    ];
    
    console.log("📋 샘플 일간업무 생성 중...");
    const createdDailyTasks = await db.insert(dailyTasks).values(teamDailyTasks).returning();
    console.log(`✅ ${createdDailyTasks.length}개 샘플 일간업무 생성 완료`);

    console.log("🎉 데이터베이스 초기화 완전 성공!");
    console.log("📊 생성된 데이터:");
    console.log(`   👥 사용자: ${createdUsers.length}명`);
    console.log(`   📋 일간업무: ${createdDailyTasks.length}개`);
    
  } catch (error) {
    console.error("❌ 데이터베이스 초기화 실패:", error);
    throw error;
  }
}

// 직접 실행 시에만 초기화 수행
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log("✅ 데이터베이스 초기화 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ 데이터베이스 초기화 실패:", error);
      process.exit(1);
    });
}