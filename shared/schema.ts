import { pgTable, text, integer, boolean, serial, timestamp } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("employee"), // enum 제약 조건은 별도 처리
  name: text("name").notNull(),
  department: text("department"),
  createdAt: text("created_at").notNull().default(sql`NOW()::TEXT`),
});

// 일간업무 테이블 - 개별 업무 관리
export const dailyTasks = pgTable("daily_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to").notNull(),
  createdBy: integer("created_by").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("scheduled"), // 예정/진행중/완료/취소/연기
  priority: text("priority").notNull().default("medium"),
  progress: integer("progress").notNull().default(0),
  workDate: text("work_date").notNull(), // 해당 일자
  startTime: text("start_time"), // 시작 시간
  endTime: text("end_time"), // 종료 시간
  estimatedHours: integer("estimated_hours").default(1), // 예상 소요 시간
  actualHours: integer("actual_hours"), // 실제 소요 시간
  memo: text("memo"), // 업무 메모
  weeklyTaskId: integer("weekly_task_id"), // 주간업무와 연결
  completedAt: text("completed_at"),
  
  // 후속담당자 관련 필드 추가
  followUpAssigneeGeneral: integer("follow_up_assignee_general"), // 경영일반 후속담당자
  followUpAssigneeContract: integer("follow_up_assignee_contract"), // 계약업무 후속담당자
  followUpMemo: text("follow_up_memo"), // 후속담당자에게 전달할 메모
  isFollowUpTask: boolean("is_follow_up_task").default(false), // 후속업무 여부
  parentTaskId: integer("parent_task_id"), // 원본 업무 ID
  followUpType: text("follow_up_type"), // 후속업무 타입 (general/contract)
  
  // 반복업무 관련 필드 추가
  isRecurring: boolean("is_recurring").default(false), // 반복 여부
  recurringType: text("recurring_type"), // 반복 유형 (daily/weekly/monthly/yearly/weekdays)
  recurringDays: text("recurring_days"), // 반복 요일 (JSON 배열: ["월", "화", "수"])
  recurringEndDate: text("recurring_end_date"), // 반복 종료 날짜
  isIndefinite: boolean("is_indefinite").default(false), // 무기한 반복 여부
  isRecurringTask: boolean("is_recurring_task").default(false), // 반복업무 인스턴스 여부
  recurringParentId: integer("recurring_parent_id"), // 반복업무 원본 ID
  recurringSequence: integer("recurring_sequence"), // 반복 순서
  
  createdAt: text("created_at").notNull().default(sql`NOW()::TEXT`),
  updatedAt: text("updated_at").notNull().default(sql`NOW()::TEXT`),
});

// 주간업무 테이블 - 주간 단위 업무 관리
export const weeklyTasks = pgTable("weekly_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to").notNull(),
  createdBy: integer("created_by").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("planned"),
  priority: text("priority").notNull().default("medium"),
  weekStartDate: text("week_start_date").notNull(), // 주차 시작일 (월요일)
  weekEndDate: text("week_end_date").notNull(), // 주차 종료일 (일요일)
  estimatedHours: integer("estimated_hours").default(8), // 예상 총 소요 시간
  actualHours: integer("actual_hours").default(0), // 실제 총 소요 시간
  completionRate: integer("completion_rate").default(0), // 완료율
  isNextWeekPlanned: boolean("is_next_week_planned").default(false), // 다음주 예정 업무 여부
  targetWeekStartDate: text("target_week_start_date"), // 다음주 예정일 경우 대상 주차
  memo: text("memo"), // 주간 업무 메모
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`NOW()::TEXT`),
  updatedAt: text("updated_at").notNull().default(sql`NOW()::TEXT`),
});

// 주간보고서 테이블
export const weeklyReports = pgTable("weekly_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekStartDate: text("week_start_date").notNull(),
  weekEndDate: text("week_end_date").notNull(),
  totalTasks: integer("total_tasks").default(0),
  completedTasks: integer("completed_tasks").default(0),
  cancelledTasks: integer("cancelled_tasks").default(0),
  postponedTasks: integer("postponed_tasks").default(0),
  totalHours: integer("total_hours").default(0),
  completionRate: integer("completion_rate").default(0),
  summary: text("summary"), // 주간 업무 요약
  challenges: text("challenges"), // 주간 어려움/문제점
  achievements: text("achievements"), // 주간 성과
  nextWeekPlan: text("next_week_plan"), // 다음주 계획
  managerComment: text("manager_comment"), // 관리자 코멘트
  submittedAt: text("submitted_at"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`NOW()::TEXT`),
  updatedAt: text("updated_at").notNull().default(sql`NOW()::TEXT`),
});

// 업무 분석 리포트 테이블
export const taskAnalytics = pgTable("task_analytics", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  taskType: text("task_type").notNull(), // daily/weekly
  analysisDate: text("analysis_date").notNull(),
  timeEfficiency: integer("time_efficiency"), // 시간 효율성 (1-5)
  qualityScore: integer("quality_score"), // 품질 점수 (1-5)
  difficultyLevel: integer("difficulty_level"), // 난이도 (1-5)
  satisfactionLevel: integer("satisfaction_level"), // 만족도 (1-5)
  comments: text("comments"), // 분석 코멘트
  recommendedImprovements: text("recommended_improvements"), // 개선 제안
  createdAt: text("created_at").notNull().default(sql`NOW()::TEXT`),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  taskType: text("task_type").notNull().default("daily"),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`NOW()::TEXT`),
});

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  taskType: text("task_type").notNull().default("daily"),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`NOW()::TEXT`),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  taskId: integer("task_id"),
  taskType: text("task_type"),
  createdAt: text("created_at").notNull().default(sql`NOW()::TEXT`),
});

// 일정 관리 테이블 - 반복 일정 기능 포함
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull(),
  startDate: text("start_date").notNull(), // 시작 날짜
  endDate: text("end_date"), // 종료 날짜 (선택적)
  startTime: text("start_time"), // 시작 시간 (HH:MM)
  endTime: text("end_time"), // 종료 시간 (HH:MM)
  allDay: boolean("all_day").default(false), // 종일 일정 여부
  
  // 반복 설정
  isRecurring: boolean("is_recurring").default(false), // 반복 여부
  recurringType: text("recurring_type"), // 반복 유형 (daily/weekly/monthly/yearly/weekdays/custom)
  recurringInterval: integer("recurring_interval").default(1), // 반복 간격 (예: 2주마다 = 2)
  recurringDays: text("recurring_days"), // 반복 요일 (JSON 배열: ["monday", "wednesday", "friday"])
  recurringEndDate: text("recurring_end_date"), // 반복 종료 날짜
  recurringCount: integer("recurring_count"), // 반복 횟수 제한
  
  // 기타 설정
  location: text("location"), // 장소
  reminder: integer("reminder"), // 알림 시간 (분 단위)
  color: text("color").default("#3b82f6"), // 일정 색상
  category: text("category").default("기타"), // 업무구분
  
  createdAt: text("created_at").notNull().default(sql`NOW()::TEXT`),
  updatedAt: text("updated_at").notNull().default(sql`NOW()::TEXT`),
});

// 반복 일정 인스턴스 테이블 - 개별 반복 일정 인스턴스
export const scheduleInstances = pgTable("schedule_instances", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull(),
  instanceDate: text("instance_date").notNull(), // 이 인스턴스의 날짜
  startTime: text("start_time"), // 이 인스턴스의 시작 시간 (수정된 경우)
  endTime: text("end_time"), // 이 인스턴스의 종료 시간 (수정된 경우)
  isModified: boolean("is_modified").default(false), // 원본과 다르게 수정되었는지 여부
  isCancelled: boolean("is_cancelled").default(false), // 이 인스턴스만 취소되었는지 여부
  title: text("title"), // 이 인스턴스의 제목 (수정된 경우)
  description: text("description"), // 이 인스턴스의 설명 (수정된 경우)
  location: text("location"), // 이 인스턴스의 장소 (수정된 경우)
  createdAt: text("created_at").notNull().default(sql`NOW()::TEXT`),
  updatedAt: text("updated_at").notNull().default(sql`NOW()::TEXT`),
});

// 관계 정의
export const userRelations = relations(users, ({ many }) => ({
  assignedDailyTasks: many(dailyTasks, { relationName: "assigned_to" }),
  createdDailyTasks: many(dailyTasks, { relationName: "created_by" }),
  assignedWeeklyTasks: many(weeklyTasks, { relationName: "weekly_assigned_to" }),
  createdWeeklyTasks: many(weeklyTasks, { relationName: "weekly_created_by" }),
  weeklyReports: many(weeklyReports),
  comments: many(comments),
  attachments: many(attachments),
  notifications: many(notifications),
  schedules: many(schedules),
}));

export const dailyTaskRelations = relations(dailyTasks, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [dailyTasks.assignedTo],
    references: [users.id],
    relationName: "assigned_to",
  }),
  creator: one(users, {
    fields: [dailyTasks.createdBy],
    references: [users.id],
    relationName: "created_by",
  }),
  weeklyTask: one(weeklyTasks, {
    fields: [dailyTasks.weeklyTaskId],
    references: [weeklyTasks.id],
  }),
  comments: many(comments),
  attachments: many(attachments),
  analytics: many(taskAnalytics),
}));

export const weeklyTaskRelations = relations(weeklyTasks, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [weeklyTasks.assignedTo],
    references: [users.id],
    relationName: "weekly_assigned_to",
  }),
  creator: one(users, {
    fields: [weeklyTasks.createdBy],
    references: [users.id],
    relationName: "weekly_created_by",
  }),
  dailyTasks: many(dailyTasks),
  comments: many(comments),
  attachments: many(attachments),
  analytics: many(taskAnalytics),
}));

export const weeklyReportRelations = relations(weeklyReports, ({ one }) => ({
  user: one(users, {
    fields: [weeklyReports.userId],
    references: [users.id],
  }),
}));

export const commentRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  dailyTask: one(dailyTasks, {
    fields: [comments.taskId],
    references: [dailyTasks.id],
  }),
  weeklyTask: one(weeklyTasks, {
    fields: [comments.taskId],
    references: [weeklyTasks.id],
  }),
}));

export const attachmentRelations = relations(attachments, ({ one }) => ({
  uploader: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id],
  }),
  dailyTask: one(dailyTasks, {
    fields: [attachments.taskId],
    references: [dailyTasks.id],
  }),
  weeklyTask: one(weeklyTasks, {
    fields: [attachments.taskId],
    references: [weeklyTasks.id],
  }),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const scheduleRelations = relations(schedules, ({ one, many }) => ({
  creator: one(users, {
    fields: [schedules.createdBy],
    references: [users.id],
  }),
  instances: many(scheduleInstances),
}));

export const scheduleInstanceRelations = relations(scheduleInstances, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleInstances.scheduleId],
    references: [schedules.id],
  }),
}));

export const taskAnalyticsRelations = relations(taskAnalytics, ({ one }) => ({
  dailyTask: one(dailyTasks, {
    fields: [taskAnalytics.taskId],
    references: [dailyTasks.id],
  }),
  weeklyTask: one(weeklyTasks, {
    fields: [taskAnalytics.taskId],
    references: [weeklyTasks.id],
  }),
}));

// Zod 스키마 정의
export const insertUserSchema = createInsertSchema(users);
export const insertDailyTaskSchema = createInsertSchema(dailyTasks);
export const insertWeeklyTaskSchema = createInsertSchema(weeklyTasks);
export const insertWeeklyReportSchema = createInsertSchema(weeklyReports);
export const insertTaskAnalyticsSchema = createInsertSchema(taskAnalytics);
export const insertCommentSchema = createInsertSchema(comments);
export const insertAttachmentSchema = createInsertSchema(attachments);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertScheduleSchema = createInsertSchema(schedules);
export const insertScheduleInstanceSchema = createInsertSchema(scheduleInstances);

// 타입 정의
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertDailyTask = z.infer<typeof insertDailyTaskSchema>;

export type WeeklyTask = typeof weeklyTasks.$inferSelect;
export type InsertWeeklyTask = z.infer<typeof insertWeeklyTaskSchema>;

export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type InsertWeeklyReport = z.infer<typeof insertWeeklyReportSchema>;

export type TaskAnalytics = typeof taskAnalytics.$inferSelect;
export type InsertTaskAnalytics = z.infer<typeof insertTaskAnalyticsSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type ScheduleInstance = typeof scheduleInstances.$inferSelect;
export type InsertScheduleInstance = z.infer<typeof insertScheduleInstanceSchema>;

// 상세 정보가 포함된 타입
export type DailyTaskWithDetails = DailyTask & {
  assignedUser: User;
  creator: User;
  weeklyTask?: WeeklyTask;
  comments: (Comment & { user: User })[];
  attachments: Attachment[];
  analytics?: TaskAnalytics[];
};

export type WeeklyTaskWithDetails = WeeklyTask & {
  assignedUser: User;
  creator: User;
  dailyTasks: DailyTask[];
  comments: (Comment & { user: User })[];
  attachments: Attachment[];
  analytics?: TaskAnalytics[];
};

export type WeeklyReportWithDetails = WeeklyReport & {
  user: User;
  dailyTasks: DailyTaskWithDetails[];
  weeklyTasks: WeeklyTaskWithDetails[];
};

export type ScheduleWithDetails = Schedule & {
  creator: User;
  instances?: ScheduleInstance[];
};

export type UserWithStats = User & {
  totalDailyTasks: number;
  completedDailyTasks: number;
  totalWeeklyTasks: number;
  completedWeeklyTasks: number;
  weeklyCompletionRate: number;
  averageTaskDuration: number;
};

// 호환성을 위한 별칭
export type Task = DailyTask;
export type InsertTask = InsertDailyTask;
export type TaskWithDetails = DailyTaskWithDetails;
