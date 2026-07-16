ALTER TABLE "duties" DROP CONSTRAINT "duties_month_office_unique";--> statement-breakpoint
ALTER TABLE "duties" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "duties" ADD CONSTRAINT "duties_month_office_version_unique" UNIQUE NULLS NOT DISTINCT("month","office_id","version");