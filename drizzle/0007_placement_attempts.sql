CREATE TABLE "placement_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_ids" jsonb NOT NULL,
	"skill_ids" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"result" jsonb
);
--> statement-breakpoint
ALTER TABLE "placement_attempts" ADD CONSTRAINT "placement_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "placement_user_idx" ON "placement_attempts" USING btree ("user_id","started_at");