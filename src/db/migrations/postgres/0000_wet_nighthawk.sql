CREATE TABLE "question_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"certification_slug" text NOT NULL,
	"question_id" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"attempts_count" integer DEFAULT 1 NOT NULL,
	"last_attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"certification_slug" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"job_title" text NOT NULL,
	"onboarding_done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "question_attempts_cert_question_unique" ON "question_attempts" USING btree ("certification_slug","question_id");