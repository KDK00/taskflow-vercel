import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../shared/schema";
import { Pool } from 'pg';

// PostgreSQL 연결 설정 (Supabase)
const connectionString = process.env.DATABASE_URL || "postgresql://postgres.yutvzerxfihgqcnuzmuz:Kdkissbye!00@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// 연결 풀 싱글톤 패턴
export function getDb() {
  if (!db) {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10, // Vercel Functions에서는 연결 수 제한
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    db = drizzle(pool, { schema });
  }
  
  return db;
}

export function getPool() {
  if (!pool) {
    getDb(); // db 초기화 시 pool도 함께 생성됨
  }
  return pool!;
} 