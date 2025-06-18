import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres.yutvzerxfihgqcnuzmuz:Kdkissbye!00@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres",
  },
});
