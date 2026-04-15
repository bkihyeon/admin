CREATE TABLE "duties" (
	"id" text PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"assignments" jsonb NOT NULL,
	"free_employee_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "duties_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "duty_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"required_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recycling_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"current_index" integer DEFAULT 0 NOT NULL,
	"schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
