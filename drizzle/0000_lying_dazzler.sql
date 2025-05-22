DO $$ BEGIN
 CREATE TYPE "screening_result" AS ENUM('normal', 'moderate', 'severe');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('admin', 'vht');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_status" AS ENUM('active', 'inactive', 'pending');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "edic_children" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" varchar(10) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"date_of_birth" varchar(255) NOT NULL,
	"gender" varchar(50) NOT NULL,
	"district" varchar(255) NOT NULL,
	"health_facility" varchar(255) NOT NULL,
	"caretaker_name" varchar(255) NOT NULL,
	"caretaker_contact" varchar(255),
	"address" varchar(255),
	"status" varchar(50) DEFAULT 'healthy',
	"registered_by" serial NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "edic_children_child_id_unique" UNIQUE("child_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "edic_screenings" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" serial NOT NULL,
	"date" varchar(50) NOT NULL,
	"weight" varchar(50),
	"height" varchar(50),
	"muac" varchar(50),
	"hearing_screening" varchar(50) DEFAULT 'pass',
	"vision_screening" varchar(50) DEFAULT 'pass',
	"mdat_sf1" varchar(50) DEFAULT 'pass',
	"mdat_lf1" varchar(50) DEFAULT 'pass',
	"mdat_sf2" varchar(50) DEFAULT 'pass',
	"mdat_lf2" varchar(50) DEFAULT 'pass',
	"current_age" varchar(50),
	"screening_date" varchar(50),
	"oedema" boolean DEFAULT false,
	"appetite" varchar(50) DEFAULT 'good',
	"symptoms" text,
	"height_for_age" "screening_result" DEFAULT 'normal',
	"weight_for_age" "screening_result" DEFAULT 'normal',
	"weight_for_height" "screening_result" DEFAULT 'normal',
	"muac_result" "screening_result" DEFAULT 'normal',
	"referral_required" boolean DEFAULT false,
	"referral_facility" varchar(255),
	"referral_date" varchar(50),
	"referral_reason" text,
	"screened_by" serial NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "edic_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"mobile_phone" varchar(255),
	"role" "user_role" DEFAULT 'vht' NOT NULL,
	"district" varchar(255),
	"health_facility" varchar(255),
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "edic_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "edic_children" ADD CONSTRAINT "edic_children_registered_by_edic_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "edic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "edic_screenings" ADD CONSTRAINT "edic_screenings_child_id_edic_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "edic_children"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "edic_screenings" ADD CONSTRAINT "edic_screenings_screened_by_edic_users_id_fk" FOREIGN KEY ("screened_by") REFERENCES "edic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
