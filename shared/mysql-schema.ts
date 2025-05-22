import { mysqlTable, serial, text, int, boolean, timestamp, varchar, mysqlEnum } from "drizzle-orm/mysql-core";
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
export const users = mysqlTable("edic_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fullName: text("fullName").notNull(),
  mobilePhone: text("mobilePhone"),
  role: mysqlEnum("role", ["admin", "vht"]).notNull().default(UserRole.VHT),
  district: text("district"),
  healthFacility: text("healthFacility"),
  status: mysqlEnum("status", ["active", "inactive", "pending"]).notNull().default(UserStatus.ACTIVE),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Children table
export const children = mysqlTable("edic_children", {
  id: serial("id").primaryKey(),
  childId: varchar("childId", { length: 10 }).notNull(),
  fullName: text("fullName").notNull(),
  dateOfBirth: text("dateOfBirth").notNull(), // Using text for consistent date format
  gender: text("gender").notNull(),
  district: text("district").notNull(),
  healthFacility: text("healthFacility").notNull(),
  caretakerName: text("caretakerName").notNull(),
  caretakerContact: text("caretakerContact"),
  address: text("address"),
  status: text("status").default("healthy"),
  registeredBy: int("registeredBy"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Screenings table
export const screenings = mysqlTable("edic_screenings", {
  id: serial("id").primaryKey(),
  childId: int("childId").notNull(),
  date: text("date").notNull(), // Using text for consistent date format
  weight: text("weight"), 
  height: text("height"), 
  muac: text("muac"), 
  
  // New screening fields
  hearingScreening: text("hearingScreening").default("pass"), // Hearing Screening: pass / fail
  visionScreening: text("visionScreening").default("pass"),   // Vision screening: pass / fail
  mdatSF1: text("mdatSF1").default("pass"),                  // MDAT-SF: pass / fail
  mdatLF1: text("mdatLF1").default("pass"),                  // MDAT-LF: pass / fail
  mdatSF2: text("mdatSF2").default("pass"),                  // MDAT-SF: pass / fail
  mdatLF2: text("mdatLF2").default("pass"),                  // MDAT-LF: pass / fail
  currentAge: text("currentAge"),                           // Current Age field
  screeningDate: text("screeningDate").default(new Date().toISOString().split("T")[0]), // Current date as placeholder
  
  // Keeping these fields for backward compatibility
  oedema: boolean("oedema").default(false),
  appetite: text("appetite").default("good"),
  symptoms: text("symptoms"),
  heightForAge: mysqlEnum("heightForAge", ["normal", "moderate", "severe"]).default(ScreeningResult.NORMAL),
  weightForAge: mysqlEnum("weightForAge", ["normal", "moderate", "severe"]).default(ScreeningResult.NORMAL),
  weightForHeight: mysqlEnum("weightForHeight", ["normal", "moderate", "severe"]).default(ScreeningResult.NORMAL),
  muacResult: mysqlEnum("muacResult", ["normal", "moderate", "severe"]).default(ScreeningResult.NORMAL),
  
  referralRequired: boolean("referralRequired").default(false),
  referralFacility: text("referralFacility"),
  referralDate: text("referralDate"), 
  referralReason: text("referralReason"),
  screenedBy: int("screenedBy"),
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
  dateOfBirth: z.string(), // Using string for dates
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

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Child = typeof children.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Screening = typeof screenings.$inferSelect;
export type InsertScreening = z.infer<typeof insertScreeningSchema>;