ALTER TABLE "edic_children" ALTER COLUMN "child_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "edic_screenings" ADD COLUMN "tier_ii_motor" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "edic_screenings" ADD COLUMN "tier_ii_cst" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "edic_screenings" ADD COLUMN "tier_iii" boolean DEFAULT false;