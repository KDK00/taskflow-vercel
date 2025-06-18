import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { Pool } from 'pg';

// PostgreSQL 연결 설정 (Supabase)
const connectionString = process.env.DATABASE_URL || "postgresql://postgres.yutvzerxfihgqcnuzmuz:Kdkissbye!00@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres";

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = drizzle(pool, { schema });

// 세션을 위한 Pool 연결
export { pool };

// 테이블 생성 함수 (PostgreSQL용으로 변경)
export async function initializeTables() {
  try {
    console.log("🔧 데이터베이스 테이블 초기화 시작...");

    // 사용자 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        department TEXT,
        role TEXT DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 작업 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        progress INTEGER DEFAULT 0,
        assigned_to INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        start_date TIMESTAMP NOT NULL,
        due_date TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // 댓글 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 알림 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        task_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      )
    `);

    // 첨부파일 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        task_id INTEGER NOT NULL,
        uploaded_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `);

    // 일간업무 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id SERIAL PRIMARY KEY,
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
        created_at TEXT DEFAULT NOW()::TEXT,
        updated_at TEXT DEFAULT NOW()::TEXT,
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // 주간업무 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weekly_tasks (
        id SERIAL PRIMARY KEY,
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
        created_at TEXT DEFAULT NOW()::TEXT,
        updated_at TEXT DEFAULT NOW()::TEXT,
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // 주간보고서 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id SERIAL PRIMARY KEY,
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
        created_at TEXT DEFAULT NOW()::TEXT,
        updated_at TEXT DEFAULT NOW()::TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 업무 분석 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_analytics (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        task_type TEXT NOT NULL,
        analysis_date TEXT NOT NULL,
        time_efficiency INTEGER,
        quality_score INTEGER,
        difficulty_level INTEGER,
        satisfaction_level INTEGER,
        comments TEXT,
        recommended_improvements TEXT,
        created_at TEXT DEFAULT NOW()::TEXT
      )
    `);

    // 일정 관리 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_by INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        start_time TEXT,
        end_time TEXT,
        all_day INTEGER DEFAULT 0,
        is_recurring INTEGER DEFAULT 0,
        recurring_type TEXT,
        recurring_interval INTEGER DEFAULT 1,
        recurring_days TEXT,
        recurring_end_date TEXT,
        recurring_count INTEGER,
        location TEXT,
        reminder INTEGER,
        color TEXT DEFAULT '#3b82f6',
        category TEXT DEFAULT '기타',
        created_at TEXT DEFAULT NOW()::TEXT,
        updated_at TEXT DEFAULT NOW()::TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // 일정 인스턴스 테이블 생성 (PostgreSQL 문법)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule_instances (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER NOT NULL,
        instance_date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        is_modified INTEGER DEFAULT 0,
        is_cancelled INTEGER DEFAULT 0,
        title TEXT,
        description TEXT,
        location TEXT,
        created_at TEXT DEFAULT NOW()::TEXT,
        updated_at TEXT DEFAULT NOW()::TEXT,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id)
      )
    `);

    console.log("✅ PostgreSQL 데이터베이스 테이블 초기화 완료");
  } catch (error) {
    console.error("❌ 데이터베이스 초기화 실패:", error);
    throw error;
  }
}
