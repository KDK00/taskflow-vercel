import { db } from "./db";
import { users, tasks, notifications } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedDatabase() {
  try {
    console.log("Seeding database with real employee data...");

    // Create users based on the work assignment table
    const hashedPassword = await hashPassword("password123");
    
    const userData = [
      {
        username: "user1",
        email: "user1@company.com",
        password: hashedPassword,
        name: "사용자1",
        department: "업무팀",
        role: "employee" as const,
      },
      {
        username: "user2", 
        email: "user2@company.com",
        password: hashedPassword,
        name: "사용자2",
        department: "업무팀",
        role: "employee" as const,
      },
      {
        username: "manager",
        email: "manager@company.com", 
        password: hashedPassword,
        name: "관리자",
        department: "관리팀",
        role: "manager" as const,
      }
    ];

    const createdUsers = await db.insert(users).values(userData).returning();
    console.log(`Created ${createdUsers.length} users`);

    // Find users for task assignment
    const user1 = createdUsers.find(u => u.username === "user1")!;
    const user2 = createdUsers.find(u => u.username === "user2")!;
    const manager = createdUsers.find(u => u.role === "manager")!;

    // 하드코딩된 샘플 업무 삭제됨 - 실제 사용자 업로드 데이터만 사용
    const allTasks: any[] = [];
    const createdTasks = await db.insert(tasks).values(allTasks).returning();
    console.log(`Created ${createdTasks.length} tasks`);

    // 하드코딩된 샘플 알림 삭제됨 - 실제 업무 기반 알림만 사용
    console.log("No sample notifications created");

    console.log("Database seeding completed successfully!");
    return { users: createdUsers, tasks: createdTasks };
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}