ALTER TABLE "lessons" ADD COLUMN "kind" text DEFAULT 'lesson' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "objectives" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "practice" jsonb DEFAULT '[]'::jsonb NOT NULL;