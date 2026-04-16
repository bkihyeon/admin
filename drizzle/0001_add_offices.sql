CREATE TABLE "offices" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "office_id" text REFERENCES "offices"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "duty_items" ADD COLUMN "office_id" text REFERENCES "offices"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "duties" RENAME COLUMN "free_employee_names" TO "free_employees";
