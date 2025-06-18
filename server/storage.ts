import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and, gte, lte, desc, asc, sql, isNull, or } from "drizzle-orm";
import * as schema from "../shared/schema.js";
import type { 
  User, InsertUser, 
  DailyTask, InsertDailyTask, DailyTaskWithDetails,
  WeeklyTask, InsertWeeklyTask, WeeklyTaskWithDetails,
  WeeklyReport, InsertWeeklyReport, WeeklyReportWithDetails,
  TaskAnalytics, InsertTaskAnalytics,
  Comment, InsertComment, 
  Attachment, InsertAttachment, 
  Notification, InsertNotification,
  UserWithStats
} from "../shared/schema.js";
import bcrypt from "bcryptjs";

export class DatabaseStorage {
  private db: Database.Database;
  private drizzle;

  constructor() {
    console.log("✅ SQLite 데이터베이스 테이블 초기화 완료");
    this.db = new Database("./taskflow.db");
    this.drizzle = drizzle(this.db, { schema });
    this.init();
  }

  private init() {
    // Enable foreign keys
    this.db.pragma("foreign_keys = ON");
    
    // ❌ 중복 초기화 제거 - index.ts에서 이미 초기화됨
    // this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      console.log("🔄 데이터베이스 초기화 시작...");
      
      // 🔧 테이블 생성 추가
      await this.createTables();
      
      // Clear existing data (only if tables exist)
      try {
        await this.drizzle.delete(schema.notifications);
        console.log("✅ notifications 테이블 정리 완료");
      } catch (e) { console.log("notifications 테이블 초기화 건너뜀"); }
      
      try {
        await this.drizzle.delete(schema.taskAnalytics);
        console.log("✅ taskAnalytics 테이블 정리 완료");
      } catch (e) { console.log("taskAnalytics 테이블 초기화 건너뜀"); }
      
      try {
        await this.drizzle.delete(schema.weeklyReports);
        console.log("✅ weeklyReports 테이블 정리 완료");
      } catch (e) { console.log("weeklyReports 테이블 초기화 건너뜀"); }
      
      try {
        await this.drizzle.delete(schema.comments);
        console.log("✅ comments 테이블 정리 완료");
      } catch (e) { console.log("comments 테이블 초기화 건너뜀"); }
      
      try {
        await this.drizzle.delete(schema.attachments);
        console.log("✅ attachments 테이블 정리 완료");
      } catch (e) { console.log("attachments 테이블 초기화 건너뜀"); }
      
      try {
        await this.drizzle.delete(schema.dailyTasks);
        console.log("✅ dailyTasks 테이블 정리 완료");
      } catch (e) { console.log("dailyTasks 테이블 초기화 건너뜀"); }
      
      try {
        await this.drizzle.delete(schema.weeklyTasks);
        console.log("✅ weeklyTasks 테이블 정리 완료");
      } catch (e) { console.log("weeklyTasks 테이블 초기화 건너뜀"); }
      
      try {
        await this.drizzle.delete(schema.users);
        console.log("✅ users 테이블 정리 완료");
      } catch (e) { console.log("users 테이블 초기화 건너뜀"); }
      
      console.log("✅ 기존 데이터 정리 완료");

      // Create users
      console.log("👥 사용자 계정 생성 중...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      
      // 하드코딩된 계정 데이터 삭제됨 - 실제 사용자 등록 데이터만 사용
      const userList = [] // 빈 배열로 초기화();
      console.log(`✅ ${userList.length}개 사용자 계정 생성 완료`);

      // Create sample weekly tasks
      const currentWeekStart = this.getWeekStartDate(new Date());
      const currentWeekEnd = this.getWeekEndDate(new Date());
      const nextWeekStart = this.getWeekStartDate(new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000));
      const nextWeekEnd = this.getWeekEndDate(new Date(currentWeekEnd.getTime() + 7 * 24 * 60 * 60 * 1000));

      console.log("📅 주간업무 생성 중...");
      const weeklyTaskList = await this.drizzle.insert(schema.weeklyTasks).values([
        {
          title: "프로젝트 기획서 작성",
          description: "새로운 프로젝트의 기획서를 작성합니다",
          assignedTo: userList[1].id, // nara0
          createdBy: userList[0].id, // admin
          category: "기획",
          status: "in_progress",
          priority: "high",
          weekStartDate: currentWeekStart.toISOString().split('T')[0],
          weekEndDate: currentWeekEnd.toISOString().split('T')[0],
          estimatedHours: 16,
          actualHours: 8,
          completionRate: 50,
          memo: "기본 구조 완료, 세부 내용 작성 중"
        },
        {
          title: "마케팅 전략 수립",
          description: "Q2 마케팅 전략을 수립합니다",
          assignedTo: userList[2].id, // nara1
          createdBy: userList[0].id, // admin
          category: "마케팅",
          status: "planned",
          priority: "medium",
          weekStartDate: currentWeekStart.toISOString().split('T')[0],
          weekEndDate: currentWeekEnd.toISOString().split('T')[0],
          estimatedHours: 12,
          actualHours: 0,
          completionRate: 0
        },
        {
          title: "다음주 개발 계획",
          description: "다음주 개발 작업 계획을 수립합니다",
          assignedTo: userList[1].id, // nara0
          createdBy: userList[0].id, // admin
          category: "개발",
          status: "planned",
          priority: "medium",
          weekStartDate: nextWeekStart.toISOString().split('T')[0],
          weekEndDate: nextWeekEnd.toISOString().split('T')[0],
          estimatedHours: 20,
          actualHours: 0,
          completionRate: 0,
          isNextWeekPlanned: true,
          targetWeekStartDate: nextWeekStart.toISOString().split('T')[0]
        }
      ]).returning();
      console.log(`✅ ${weeklyTaskList.length}개 주간업무 생성 완료`);

      // Create sample daily tasks
      console.log("📋 일간업무 생성 중...");
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const dailyTaskList = await this.drizzle.insert(schema.dailyTasks).values([
        {
          title: "기획서 목차 작성",
          description: "프로젝트 기획서의 목차를 작성합니다",
          assignedTo: userList[1].id, // nara0
          createdBy: userList[0].id, // admin
          category: "기획",
          status: "completed",
          priority: "high",
          progress: 100,
          workDate: today,
          startTime: "09:00",
          endTime: "11:00",
          estimatedHours: 2,
          actualHours: 2,
          weeklyTaskId: weeklyTaskList[0].id,
          memo: "목차 구성 완료",
          completedAt: new Date().toISOString()
        },
        {
          title: "기획서 내용 작성",
          description: "프로젝트 기획서의 세부 내용을 작성합니다",
          assignedTo: userList[1].id, // nara0
          createdBy: userList[0].id, // admin
          category: "기획",
          status: "in_progress",
          priority: "high",
          progress: 60,
          workDate: today,
          startTime: "14:00",
          endTime: "18:00",
          estimatedHours: 4,
          actualHours: 3,
          weeklyTaskId: weeklyTaskList[0].id,
          memo: "배경 및 목적 작성 완료, 상세 계획 작성 중"
        },
        {
          title: "시장 조사 분석",
          description: "타겟 시장에 대한 분석을 수행합니다",
          assignedTo: userList[2].id, // nara1
          createdBy: userList[0].id, // admin
          category: "마케팅",
          status: "scheduled",
          priority: "medium",
          progress: 0,
          workDate: tomorrow,
          startTime: "10:00",
          endTime: "15:00",
          estimatedHours: 5,
          weeklyTaskId: weeklyTaskList[1].id
        },
        {
          title: "경쟁사 분석",
          description: "주요 경쟁사들을 분석합니다",
          assignedTo: userList[2].id, // nara1
          createdBy: userList[0].id, // admin
          category: "마케팅",
          status: "scheduled",
          priority: "medium",
          progress: 0,
          workDate: tomorrow,
          startTime: "15:30",
          endTime: "17:30",
          estimatedHours: 2,
          weeklyTaskId: weeklyTaskList[1].id
        }
      ]).returning();
      console.log(`✅ ${dailyTaskList.length}개 일간업무 생성 완료`);

      console.log("🎉 데이터베이스 초기화 완전 성공!");
      console.log("📊 생성된 데이터:");
      console.log(`   👥 사용자: ${userList.length}명`);
      console.log(`   📋 일간업무: ${dailyTaskList.length}개`);

      // 📋 테이블 존재 및 데이터 검증
      await this.verifyDatabaseIntegrity();
      
    } catch (error) {
      console.error("❌ 데이터베이스 초기화 실패:", error);
      throw error;
    }
  }

  private async verifyDatabaseIntegrity() {
    console.log("🔍 데이터베이스 무결성 검증 시작...");
    
    // 테이블 존재 확인
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('users', 'daily_tasks', 'weekly_tasks')
    `).all();
    
    if (tables.length < 3) {
      console.error("❌ 필수 테이블이 생성되지 않았습니다:", tables);
      throw new Error("테이블 생성 실패");
    }
    
    // 데이터 조회 테스트
    const userCount = await this.drizzle.select().from(schema.users).then(r => r.length);
    const taskCount = await this.drizzle.select().from(schema.dailyTasks).then(r => r.length);
    
    console.log(`✅ 테이블 검증 완료: users(${userCount}), daily_tasks(${taskCount})`);
    console.log("✅ 데이터베이스 무결성 검증 성공!");
  }

  private async createTables() {
    console.log("🔧 데이터베이스 테이블 생성 시작...");
    
    // 사용자 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        department TEXT,
        role TEXT DEFAULT 'employee',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 일간업무 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        status TEXT DEFAULT 'scheduled',
        priority TEXT DEFAULT 'medium',
        progress INTEGER DEFAULT 0,
        assigned_to INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        work_date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        estimated_hours INTEGER,
        actual_hours INTEGER,
        memo TEXT,
        weekly_task_id INTEGER,
        follow_up_assignee_general INTEGER,
        follow_up_assignee_contract INTEGER,
        follow_up_memo TEXT,
        is_follow_up_task INTEGER DEFAULT 0,
        parent_task_id INTEGER,
        follow_up_type TEXT,
        is_recurring INTEGER DEFAULT 0,
        recurring_type TEXT,
        recurring_days TEXT,
        recurring_end_date TEXT,
        is_indefinite INTEGER DEFAULT 0,
        is_recurring_task INTEGER DEFAULT 0,
        recurring_parent_id INTEGER,
        recurring_sequence INTEGER,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // 주간업무 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weekly_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        status TEXT DEFAULT 'planned',
        priority TEXT DEFAULT 'medium',
        assigned_to INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        week_start_date TEXT NOT NULL,
        week_end_date TEXT NOT NULL,
        estimated_hours INTEGER DEFAULT 8,
        actual_hours INTEGER DEFAULT 0,
        completion_rate INTEGER DEFAULT 0,
        is_next_week_planned INTEGER DEFAULT 0,
        target_week_start_date TEXT,
        memo TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // 알림 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        task_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 댓글 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        daily_task_id INTEGER,
        weekly_task_id INTEGER,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (daily_task_id) REFERENCES daily_tasks(id),
        FOREIGN KEY (weekly_task_id) REFERENCES weekly_tasks(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 첨부파일 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        daily_task_id INTEGER,
        weekly_task_id INTEGER,
        uploaded_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (daily_task_id) REFERENCES daily_tasks(id),
        FOREIGN KEY (weekly_task_id) REFERENCES weekly_tasks(id),
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `);

    // 주간보고서 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        week_start_date TEXT NOT NULL,
        week_end_date TEXT NOT NULL,
        total_tasks INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        cancelled_tasks INTEGER DEFAULT 0,
        postponed_tasks INTEGER DEFAULT 0,
        total_hours INTEGER DEFAULT 0,
        completion_rate INTEGER DEFAULT 0,
        summary TEXT,
        challenges TEXT,
        achievements TEXT,
        next_week_plan TEXT,
        manager_comment TEXT,
        submitted_at TEXT,
        reviewed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 업무 분석 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        total_tasks INTEGER DEFAULT 0,
        completed_tasks INTEGER DEFAULT 0,
        total_hours INTEGER DEFAULT 0,
        productivity_score INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log("✅ 모든 테이블 생성 완료");
  }

  // 주간 시작일/종료일 계산 헬퍼 메서드
  private getWeekStartDate(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 월요일을 시작으로
    return new Date(date.setDate(diff));
  }

  private getWeekEndDate(date: Date): Date {
    const start = this.getWeekStartDate(new Date(date));
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000); // 일요일
  }

  // 사용자 관리
  async createUser(userData: InsertUser): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [user] = await this.drizzle.insert(schema.users).values({
        ...userData,
        password: hashedPassword,
      }).returning();
      return user;
    } catch (error) {
      console.error("❌ 사용자 생성 실패:", error);
      throw new Error(`사용자 생성 중 오류 발생: ${error}`);
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const [user] = await this.drizzle
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .limit(1);
      return user || null;
    } catch (error) {
      console.error("❌ 사용자 조회 실패:", error);
      return null;
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      const [user] = await this.drizzle
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
      return user || null;
    } catch (error) {
      console.error("❌ 사용자 ID 조회 실패:", error);
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users = await this.drizzle.select().from(schema.users).orderBy(asc(schema.users.name));
      console.log("📋 모든 사용자 조회 성공:", users.length, "명");
      return users;
    } catch (error) {
      console.error("❌ 사용자 목록 조회 실패:", error);
      throw new Error(`사용자 목록 조회 중 오류 발생: ${error}`);
    }
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // 일간업무 관리
  async createDailyTask(taskData: InsertDailyTask): Promise<DailyTask> {
    try {
      console.log("📝 새 일간업무 생성 중:", taskData);
      const [task] = await this.drizzle.insert(schema.dailyTasks).values(taskData).returning();
      console.log("✅ 일간업무 생성 성공:", task);
      return task;
    } catch (error) {
      console.error("❌ 일간업무 생성 실패:", error);
      throw new Error(`일간업무 생성 중 오류 발생: ${error}`);
    }
  }

  async getDailyTasks(filters: {
    assignedTo?: number;
    status?: string;
    workDate?: string;
    weeklyTaskId?: number;
  } = {}): Promise<DailyTaskWithDetails[]> {
    try {
      console.log("📋 일간업무 목록 조회 시작, 필터:", filters);
      
      let query = this.drizzle
        .select()
        .from(schema.dailyTasks)
        .orderBy(desc(schema.dailyTasks.createdAt));

      // Apply filters - 기본적인 where 조건만 사용
      if (filters.assignedTo) {
        query = query.where(eq(schema.dailyTasks.assignedTo, filters.assignedTo));
      }
      if (filters.status) {
        const existingWhere = query.where;
        if (existingWhere) {
          query = query.where(and(existingWhere, eq(schema.dailyTasks.status, filters.status)));
        } else {
          query = query.where(eq(schema.dailyTasks.status, filters.status));
        }
      }

      const tasks = await query;
      
      // Get additional details for each task
      const tasksWithDetails: DailyTaskWithDetails[] = [];
      for (const task of tasks) {
        // Get assigned user
        const [assignedUser] = await this.drizzle
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, task.assignedTo))
          .limit(1);

        // Get creator
        const [creator] = await this.drizzle
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, task.createdBy))
          .limit(1);

        // Get weekly task if exists
        let weeklyTask = null;
        if (task.weeklyTaskId) {
          const [wt] = await this.drizzle
            .select()
            .from(schema.weeklyTasks)
            .where(eq(schema.weeklyTasks.id, task.weeklyTaskId))
            .limit(1);
          weeklyTask = wt;
        }

        // Get comments
        const comments = await this.drizzle
          .select({
            comment: schema.comments,
            user: schema.users,
          })
          .from(schema.comments)
          .leftJoin(schema.users, eq(schema.comments.userId, schema.users.id))
          .where(and(
            eq(schema.comments.taskId, task.id),
            eq(schema.comments.taskType, "daily")
          ));

        // Get attachments
        const attachments = await this.drizzle
          .select()
          .from(schema.attachments)
          .where(and(
            eq(schema.attachments.taskId, task.id),
            eq(schema.attachments.taskType, "daily")
          ));

        if (assignedUser && creator) {
          tasksWithDetails.push({
            ...task,
            assignedUser,
            creator,
            weeklyTask,
            comments: comments.map(c => ({ ...c.comment, user: c.user! })),
            attachments,
          });
        }
      }

      console.log("📋 조회된 일간업무 수:", tasksWithDetails.length);
      return tasksWithDetails;
    } catch (error) {
      console.error("❌ 일간업무 목록 조회 실패:", error);
      throw new Error(`일간업무 목록 조회 중 오류 발생: ${error}`);
    }
  }

  async getDailyTask(id: number): Promise<DailyTaskWithDetails | null> {
    try {
      const tasks = await this.getDailyTasks({});
      return tasks.find(task => task.id === id) || null;
    } catch (error) {
      console.error("❌ 일간업무 조회 실패:", error);
      return null;
    }
  }

  async updateDailyTask(id: number, updates: Partial<InsertDailyTask>): Promise<DailyTask | null> {
    try {
      console.log("📝 일간업무 수정 중:", { id, updates });
      
      // Date 객체들을 문자열로 변환
      const processedUpdates = { ...updates };
      
      // Date 객체 처리
      if (processedUpdates.completedAt && processedUpdates.completedAt instanceof Date) {
        processedUpdates.completedAt = processedUpdates.completedAt.toISOString();
      }
      if (processedUpdates.workDate && processedUpdates.workDate instanceof Date) {
        processedUpdates.workDate = processedUpdates.workDate.toISOString().split('T')[0]; // YYYY-MM-DD 형태
      }
      
      const updateData = {
        ...processedUpdates,
        updatedAt: new Date().toISOString(),
      };

      console.log("📝 처리된 업데이트 데이터:", updateData);

      const [task] = await this.drizzle
        .update(schema.dailyTasks)
        .set(updateData)
        .where(eq(schema.dailyTasks.id, id))
        .returning();

      console.log("✅ 일간업무 수정 성공:", task);
      return task || null;
    } catch (error) {
      console.error("❌ 일간업무 수정 실패:", error);
      throw new Error(`일간업무 수정 중 오류 발생: ${error}`);
    }
  }

  async deleteDailyTask(id: number): Promise<boolean> {
    try {
      console.log("🗑️ 일간업무 삭제 중:", id);
      
      // Delete related comments and attachments first
      await this.drizzle.delete(schema.comments).where(
        and(eq(schema.comments.taskId, id), eq(schema.comments.taskType, "daily"))
      );
      await this.drizzle.delete(schema.attachments).where(
        and(eq(schema.attachments.taskId, id), eq(schema.attachments.taskType, "daily"))
      );
      
      await this.drizzle.delete(schema.dailyTasks).where(eq(schema.dailyTasks.id, id));
      
      console.log("✅ 일간업무 삭제 성공");
      return true;
    } catch (error) {
      console.error("❌ 일간업무 삭제 실패:", error);
      throw new Error(`일간업무 삭제 중 오류 발생: ${error}`);
    }
  }

  // 알림 관리
  async getNotifications(userId: number): Promise<Notification[]> {
    try {
      const notifications = await this.drizzle
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, userId))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(50);
      
      return notifications;
    } catch (error) {
      console.error("❌ 알림 조회 실패:", error);
      return [];
    }
  }

  // 기존 호환성을 위한 메서드들
  async createTask(taskData: InsertDailyTask): Promise<DailyTask> {
    return this.createDailyTask(taskData);
  }

  async getTasks(filters: any = {}): Promise<DailyTaskWithDetails[]> {
    return this.getDailyTasks(filters);
  }

  async getTask(id: number): Promise<DailyTaskWithDetails | null> {
    return this.getDailyTask(id);
  }

  async updateTask(id: number, updates: any): Promise<DailyTask | null> {
    return this.updateDailyTask(id, updates);
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.deleteDailyTask(id);
  }

  // routes.ts에서 사용하는 addTask 메서드 추가
  addTask(taskData: any): void {
    // 동기적으로 호출되므로 비동기 처리를 위해 Promise를 사용하지 않음
    this.createDailyTask(taskData).catch(error => {
      console.error("❌ addTask 실패:", error);
    });
  }
}

export const storage = new DatabaseStorage();
