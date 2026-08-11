CREATE TABLE `question_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`certification_slug` text NOT NULL,
	`question_id` text NOT NULL,
	`is_correct` integer NOT NULL,
	`attempts_count` integer DEFAULT 1 NOT NULL,
	`last_attempted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_attempts_cert_question_unique` ON `question_attempts` (`certification_slug`,`question_id`);--> statement-breakpoint
CREATE TABLE `user_certifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`certification_slug` text NOT NULL,
	`added_at` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`job_title` text NOT NULL,
	`onboarding_done` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
