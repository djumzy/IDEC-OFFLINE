import { pgTable, text, serial, integer, boolean, timestamp, varchar, pgEnum, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum definitions
export enum UserRole {
  ADMIN = "admin",
  VHT = "vht"
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending"
}

export enum ScreeningResult {
  NORMAL = "normal",
  MODERATE = "moderate", 
  SEVERE = "severe"
}

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("fullName").notNull(),
  mobilePhone: text("mobilePhone"),
  role: text("role", { enum: ["admin", "vht"] }).notNull().default(UserRole.VHT),
  district: text("district"),
  healthFacility: text("healthFacility"),
  status: text("status", { enum: ["active", "inactive", "pending"] }).notNull().default(UserStatus.ACTIVE),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Children table
export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  childId: varchar("childId", { length: 10 }).notNull().unique(),
  fullName: text("fullName").notNull(),
  dateOfBirth: text("dateOfBirth").notNull(), // Changed from timestamp to text
  gender: text("gender").notNull(),
  district: text("district").notNull(),
  healthFacility: text("healthFacility").notNull(),
  caretakerName: text("caretakerName").notNull(),
  caretakerContact: text("caretakerContact"),
  address: text("address"),
  status: text("status").default("healthy"),
  registeredBy: integer("registeredBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Screenings table
export const screenings = pgTable("screenings", {
  id: serial("id").primaryKey(),
  childId: integer("childId").notNull().references(() => children.id),
  date: text("date").notNull(),
  weight: text("weight"),
  height: text("height"),
  muac: text("muac"),
  hearingScreening: text("hearingScreening").default("Not tested"),
  visionScreening: text("visionScreening").default("Not tested"),
  mdatSF1: text("mdatSF1").default("Not tested"),
  mdatLF1: text("mdatLF1").default("Not tested"),
  mdatSF2: text("mdatSF2").default("Not tested"),
  mdatLF2: text("mdatLF2").default("Not tested"),
  currentAge: text("currentAge"),
  screeningDate: text("screeningDate").default(new Date().toISOString().split("T")[0]),
  oedema: boolean("oedema").default(false),
  appetite: text("appetite").default("good"),
  symptoms: text("symptoms"),
  heightForAge: text("heightForAge", { enum: ["normal", "moderate", "severe"] }).default(ScreeningResult.NORMAL),
  weightForAge: text("weightForAge", { enum: ["normal", "moderate", "severe"] }).default(ScreeningResult.NORMAL),
  weightForHeight: text("weightForHeight", { enum: ["normal", "moderate", "severe"] }).default(ScreeningResult.NORMAL),
  muacResult: text("muacResult", { enum: ["normal", "moderate", "severe"] }).default(ScreeningResult.NORMAL),
  referralRequired: boolean("referralRequired").default(false),
  referralFacility: text("referralFacility"),
  referralDate: text("referralDate"),
  referralReason: text("referralReason"),
  tierIIMotor: boolean("tierIIMotor").default(false),
  tierIICST: boolean("tierIICST").default(false),
  tierIII: boolean("tierIII").default(false),
  screenedBy: integer("screenedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Add triers table
export const triers = pgTable("triers", {
  id: serial("id").primaryKey(),
  childId: integer("childId").notNull().references(() => children.id),
  screeningId: integer("screeningId").notNull().references(() => screenings.id),
  tierType: text("tierType").notNull(), // e.g. "TIER II Motor", "TIER II CST", "TIER III"
  createdAt: timestamp("createdAt").defaultNow(),
});

// Add follow_ups table
export const followUps = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  trierId: integer("trierId").notNull().references(() => triers.id),
  followUpDate: text("followUpDate").notNull(),
  observation: text("observation"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true 
});

// Create a custom schema for child insertion with dateOfBirth as string
export const insertChildSchema = z.object({
  childId: z.string(),
  fullName: z.string(),
  dateOfBirth: z.string(), // Changed from date to string
  gender: z.string(),
  district: z.string(),
  healthFacility: z.string(),
  caretakerName: z.string(),
  caretakerContact: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  registeredBy: z.number().optional()
});

export const insertScreeningSchema = createInsertSchema(screenings).omit({ 
  id: true, 
  createdAt: true 
});

// Add Zod schemas for new tables
export const insertTrierSchema = z.object({
  childId: z.number(),
  screeningId: z.number(),
  tierType: z.string(),
});

export const insertFollowUpSchema = z.object({
  trierId: z.number(),
  followUpDate: z.string(),
  observation: z.string().optional(),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Child = typeof children.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Screening = typeof screenings.$inferSelect;
export type InsertScreening = z.infer<typeof insertScreeningSchema>;
export type Trier = typeof triers.$inferSelect;
export type InsertTrier = z.infer<typeof insertTrierSchema>;
export type FollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
