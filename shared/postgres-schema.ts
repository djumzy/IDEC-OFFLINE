import { pgTable, serial, varchar, timestamp, boolean, text, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from "drizzle-zod";
import { z } from 'zod';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'vht']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending']);
export const screeningResultEnum = pgEnum('screening_result', ['normal', 'moderate', 'severe']);

// Users table
export const users = pgTable('edic_users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  mobilePhone: varchar('mobile_phone', { length: 255 }),
  role: userRoleEnum('role').notNull().default('vht'),
  district: varchar('district', { length: 255 }),
  healthFacility: varchar('health_facility', { length: 255 }),
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow()
});

// Children table
export const children = pgTable('edic_children', {
  id: serial('id').primaryKey(),
  childId: varchar('child_id', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  dateOfBirth: varchar('date_of_birth', { length: 255 }).notNull(),
  gender: varchar('gender', { length: 50 }).notNull(),
  district: varchar('district', { length: 255 }).notNull(),
  healthFacility: varchar('health_facility', { length: 255 }).notNull(),
  caretakerName: varchar('caretaker_name', { length: 255 }).notNull(),
  caretakerContact: varchar('caretaker_contact', { length: 255 }),
  address: varchar('address', { length: 255 }),
  status: varchar('status', { length: 50 }).default('healthy'),
  registeredBy: serial('registered_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

// Screenings table
export const screenings = pgTable('edic_screenings', {
  id: serial('id').primaryKey(),
  childId: serial('child_id').references(() => children.id).notNull(),
  date: varchar('date', { length: 50 }).notNull(),
  weight: varchar('weight', { length: 50 }),
  height: varchar('height', { length: 50 }),
  muac: varchar('muac', { length: 50 }),
  hearingScreening: varchar('hearing_screening', { length: 50 }).default('pass'),
  visionScreening: varchar('vision_screening', { length: 50 }).default('pass'),
  mdatSF1: varchar('mdat_sf1', { length: 50 }).default('pass'),
  mdatLF1: varchar('mdat_lf1', { length: 50 }).default('pass'),
  mdatSF2: varchar('mdat_sf2', { length: 50 }).default('pass'),
  mdatLF2: varchar('mdat_lf2', { length: 50 }).default('pass'),
  currentAge: varchar('current_age', { length: 50 }),
  screeningDate: varchar('screening_date', { length: 50 }),
  oedema: boolean('oedema').default(false),
  appetite: varchar('appetite', { length: 50 }).default('good'),
  symptoms: text('symptoms'),
  heightForAge: screeningResultEnum('height_for_age').default('normal'),
  weightForAge: screeningResultEnum('weight_for_age').default('normal'),
  weightForHeight: screeningResultEnum('weight_for_height').default('normal'),
  muacResult: screeningResultEnum('muac_result').default('normal'),
  referralRequired: boolean('referral_required').default(false),
  referralFacility: varchar('referral_facility', { length: 255 }),
  referralDate: varchar('referral_date', { length: 50 }),
  referralReason: text('referral_reason'),
  // TIER referral columns
  tierIIMotor: boolean('tier_ii_motor').default(false),
  tierIICST: boolean('tier_ii_cst').default(false),
  tierIII: boolean('tier_iii').default(false),
  screenedBy: serial('screened_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

// Follow-ups table for referred children
export const followUps = pgTable('edic_followups', {
  id: serial('id').primaryKey(),
  childId: serial('child_id').references(() => children.id),
  date: varchar('date', { length: 255 }).notNull(),
  observation: text('observation').notNull(),
  createdBy: serial('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

// Validation schemas
export const insertUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string(),
  mobilePhone: z.string().optional(),
  role: z.enum(['admin', 'vht']).default('vht'),
  district: z.string().optional(),
  healthFacility: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active')
});

export const insertChildSchema = z.object({
  childId: z.string().min(1, "Child ID is required"),
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female"], {
    required_error: "Gender is required",
  }),
  district: z.string().min(1, "District is required"),
  healthFacility: z.string().min(1, "Health facility is required"),
  caretakerName: z.string().min(1, "Caretaker name is required"),
  caretakerContact: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.enum(["healthy", "monitoring", "referred"]).default("healthy"),
  registeredBy: z.number().optional()
});

export const insertScreeningSchema = z.object({
  childId: z.number(),
  date: z.string(),
  weight: z.string().optional(),
  height: z.string().optional(),
  muac: z.string().optional(),
  hearingScreening: z.string().default('pass'),
  visionScreening: z.string().default('pass'),
  mdatSF1: z.string().default('pass'),
  mdatLF1: z.string().default('pass'),
  mdatSF2: z.string().default('pass'),
  mdatLF2: z.string().default('pass'),
  currentAge: z.string().optional(),
  screeningDate: z.string().optional(),
  oedema: z.boolean().default(false),
  appetite: z.string().default('good'),
  symptoms: z.string().optional(),
  heightForAge: z.enum(['normal', 'moderate', 'severe']).default('normal'),
  weightForAge: z.enum(['normal', 'moderate', 'severe']).default('normal'),
  weightForHeight: z.enum(['normal', 'moderate', 'severe']).default('normal'),
  muacResult: z.enum(['normal', 'moderate', 'severe']).default('normal'),
  referralRequired: z.boolean().default(false),
  referralFacility: z.string().optional(),
  referralDate: z.string().optional(),
  referralReason: z.string().optional(),
  // TIER referral fields
  tierIIMotor: z.boolean().optional(),
  tierIICST: z.boolean().optional(),
  tierIII: z.boolean().optional(),
  screenedBy: z.number()
});

// Create schema for inserting follow-ups
export const insertFollowUpSchema = createInsertSchema(followUps, {
  date: z.string(),
  observation: z.string().min(1, "Observation is required"),
  childId: z.number(),
  createdBy: z.number()
}); 