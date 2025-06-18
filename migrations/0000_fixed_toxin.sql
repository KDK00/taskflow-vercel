CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`task_type` text DEFAULT 'daily' NOT NULL,
	`file_name` text NOT NULL,
	`file_url` text NOT NULL,
	`file_size` integer NOT NULL,
	`uploaded_by` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`task_type` text DEFAULT 'daily' NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`assigned_to` integer NOT NULL,
	`created_by` integer NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`work_date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`estimated_hours` integer DEFAULT 1,
	`actual_hours` integer,
	`memo` text,
	`weekly_task_id` integer,
	`completed_at` text,
	`follow_up_assignee_general` integer,
	`follow_up_assignee_contract` integer,
	`follow_up_memo` text,
	`is_follow_up_task` integer DEFAULT false,
	`parent_task_id` integer,
	`follow_up_type` text,
	`is_recurring` integer DEFAULT false,
	`recurring_type` text,
	`recurring_days` text,
	`recurring_end_date` text,
	`is_indefinite` integer DEFAULT false,
	`is_recurring_task` integer DEFAULT false,
	`recurring_parent_id` integer,
	`recurring_sequence` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`task_id` integer,
	`task_type` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedule_instances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schedule_id` integer NOT NULL,
	`instance_date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`is_modified` integer DEFAULT false,
	`is_cancelled` integer DEFAULT false,
	`title` text,
	`description` text,
	`location` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_by` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`start_time` text,
	`end_time` text,
	`all_day` integer DEFAULT false,
	`is_recurring` integer DEFAULT false,
	`recurring_type` text,
	`recurring_interval` integer DEFAULT 1,
	`recurring_days` text,
	`recurring_end_date` text,
	`recurring_count` integer,
	`location` text,
	`reminder` integer,
	`color` text DEFAULT '#3b82f6',
	`category` text DEFAULT '기타',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`task_type` text NOT NULL,
	`analysis_date` text NOT NULL,
	`time_efficiency` integer,
	`quality_score` integer,
	`difficulty_level` integer,
	`satisfaction_level` integer,
	`comments` text,
	`recommended_improvements` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'employee' NOT NULL,
	`name` text NOT NULL,
	`department` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `weekly_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`week_start_date` text NOT NULL,
	`week_end_date` text NOT NULL,
	`total_tasks` integer DEFAULT 0,
	`completed_tasks` integer DEFAULT 0,
	`cancelled_tasks` integer DEFAULT 0,
	`postponed_tasks` integer DEFAULT 0,
	`total_hours` integer DEFAULT 0,
	`completion_rate` integer DEFAULT 0,
	`summary` text,
	`challenges` text,
	`achievements` text,
	`next_week_plan` text,
	`manager_comment` text,
	`submitted_at` text,
	`reviewed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weekly_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`assigned_to` integer NOT NULL,
	`created_by` integer NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`week_start_date` text NOT NULL,
	`week_end_date` text NOT NULL,
	`estimated_hours` integer DEFAULT 8,
	`actual_hours` integer DEFAULT 0,
	`completion_rate` integer DEFAULT 0,
	`is_next_week_planned` integer DEFAULT false,
	`target_week_start_date` text,
	`memo` text,
	`completed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
