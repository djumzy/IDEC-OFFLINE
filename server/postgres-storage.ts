import { eq, and, or, like, desc } from 'drizzle-orm';
import { users, children, screenings, referrals, followUps } from '@shared/postgres-schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import { initDB } from './db';
import { sql } from 'drizzle-orm';

const MemoryStore = createMemoryStore(session);

// Define types based on the schema
type User = InferSelectModel<typeof users>;
type InsertUser = InferInsertModel<typeof users>;
type Child = InferSelectModel<typeof children>;
type InsertChild = InferInsertModel<typeof children>;
type Screening = InferSelectModel<typeof screenings>;
type InsertScreening = InferInsertModel<typeof screenings>;

// Interface for the storage (same as the original)
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  
  // Child operations
  getChild(id: number): Promise<Child | undefined>;
  getChildren(filters?: { district?: string, healthFacility?: string, registeredBy?: number }): Promise<Child[]>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: number, data: Partial<Child>): Promise<Child | undefined>;
  deleteChild(id: number): Promise<void>;
  
  // Screening operations
  getScreening(id: number): Promise<Screening | undefined>;
  getScreeningsByChild(childId: number): Promise<Screening[]>;
  getScreeningsByUser(userId: number): Promise<Screening[]>;
  createScreening(screening: InsertScreening): Promise<Screening>;
  
  // Session store
  sessionStore: any; // Using any type to avoid SessionStore type issues

  // New operations
  getReferrals(filters: any): Promise<any[]>;
  getUsers(filters: { role?: string; status?: string }): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  deleteScreening(id: number): Promise<void>;

  // Follow-up operations
  getFollowUps(childId: number): Promise<InferSelectModel<typeof followUps>[]>;
  createFollowUp(data: {
    childId: number;
    date: string;
    observation: string;
    createdBy: number;
  }): Promise<InferSelectModel<typeof followUps>>;
}

export class PostgreSQLStorage implements IStorage {
  private db: any = null;
  sessionStore: any; // Using any type for session store

  constructor() {
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize database connection
    this.initializeDatabase();
  }
  
  private async initializeDatabase() {
    try {
      this.db = await initDB();
      console.log('PostgreSQL storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PostgreSQL storage:', error);
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      const result = await this.db.select().from(users).where(eq(users.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      const result = await this.db.select().from(users).where(eq(users.username, username));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      // Insert the user and get the result
      const result = await this.db.insert(users).values(userData).returning();
      
      if (!result || result.length === 0) {
        throw new Error("Failed to create user");
      }

      // Return the created user
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      await this.db.update(users).set(data).where(eq(users.id, id));
      
      // Fetch the updated user
      return this.getUser(id);
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async getUsers(): Promise<User[]> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      return await this.db.select().from(users);
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // Child methods
  async getChild(id: number): Promise<Child | undefined> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      const result = await this.db.select().from(children).where(eq(children.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Error getting child:', error);
      return undefined;
    }
  }

  async getChildren(filters: { district?: string, healthFacility?: string, registeredBy?: number } = {}): Promise<Child[]> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      let query = this.db.select().from(children);
      
      // Apply filters
      if (filters.district) {
        query = query.where(eq(children.district, filters.district));
      }
      
      if (filters.healthFacility) {
        query = query.where(eq(children.healthFacility, filters.healthFacility));
      }
      
      if (filters.registeredBy) {
        query = query.where(eq(children.registeredBy, filters.registeredBy));
      }

      // Add debug logging
      console.log("Executing children query with filters:", filters);
      
      const results = await query;
      
      // Add debug logging
      console.log("Query results:", results.length);
      
      return results;
    } catch (error) {
      console.error("Error in getChildren:", error);
      throw error;
    }
  }

  async createChild(childData: InsertChild): Promise<Child> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      // Generate a child ID in format CH-001, CH-002, etc. if not provided
      let childId = childData.childId;
      if (!childId || childId.trim() === '') {
        const allChildren = await this.getChildren();
        const id = allChildren.length + 1;
        childId = `CH-${String(id).padStart(3, '0')}`;
      }
      
      // Ensure registeredBy is a number
      if (!childData.registeredBy) {
        throw new Error('registeredBy is required when creating a child');
      }
      
      // Insert the child with the generated ID and return the created record
      const result = await this.db.insert(children)
        .values({
          ...childData,
          childId,
          status: "healthy"
        })
        .returning();
      
      if (!result || result.length === 0) {
        throw new Error("Failed to create child");
      }

      return result[0];
    } catch (error) {
      console.error('Error creating child:', error);
      throw error;
    }
  }

  async updateChild(id: number, data: Partial<Child>): Promise<Child | undefined> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      await this.db.update(children).set(data).where(eq(children.id, id));
      
      // Fetch the updated child
      return this.getChild(id);
    } catch (error) {
      console.error('Error updating child:', error);
      return undefined;
    }
  }

  async deleteChild(id: number): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      // First check if child exists
      const child = await this.getChild(id);
      if (!child) {
        throw new Error("Child not found");
      }

      // Delete the child and verify the deletion
      const result = await this.db.delete(children).where(eq(children.id, id)).returning();
      
      if (!result || result.length === 0) {
        throw new Error("Failed to delete child");
      }
    } catch (error) {
      console.error("Error deleting child:", error);
      throw error;
    }
  }

  // Screening methods
  async getScreening(id: number): Promise<Screening | undefined> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      const result = await this.db.select().from(screenings).where(eq(screenings.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Error getting screening:', error);
      return undefined;
    }
  }

  async getScreeningsByChild(childId: number): Promise<Screening[]> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      return await this.db.select().from(screenings).where(eq(screenings.childId, childId));
    } catch (error) {
      console.error('Error getting screenings by child:', error);
      return [];
    }
  }

  async getScreeningsByUser(userId: number): Promise<Screening[]> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      return await this.db.select().from(screenings).where(eq(screenings.screenedBy, userId));
    } catch (error) {
      console.error('Error getting screenings by user:', error);
      return [];
    }
  }

  async createScreening(screeningData: InsertScreening): Promise<Screening> {
    if (!this.db) await this.initializeDatabase();
    try {
      // Ensure childId and screenedBy are numbers
      if (!screeningData.childId) {
        throw new Error('childId is required when creating a screening');
      }
      if (!screeningData.screenedBy) {
        throw new Error('screenedBy is required when creating a screening');
      }
      // Log the screening data for debugging
      console.log('Inserting screening data:', screeningData);
      const result = await this.db.insert(screenings).values(screeningData).returning();
      const screeningId = result[0]?.id;
      return {
        id: screeningId,
        childId: screeningData.childId,
        date: screeningData.date,
        weight: screeningData.weight ?? null,
        height: screeningData.height ?? null,
        muac: screeningData.muac ?? null,
        hearingScreening: screeningData.hearingScreening ?? null,
        visionScreening: screeningData.visionScreening ?? null,
        mdatSF1: screeningData.mdatSF1 ?? null,
        mdatLF1: screeningData.mdatLF1 ?? null,
        mdatSF2: screeningData.mdatSF2 ?? null,
        mdatLF2: screeningData.mdatLF2 ?? null,
        currentAge: screeningData.currentAge ?? null,
        screeningDate: screeningData.screeningDate ?? null,
        oedema: screeningData.oedema,
        appetite: screeningData.appetite ?? null,
        symptoms: screeningData.symptoms ?? null,
        heightForAge: screeningData.heightForAge ?? null,
        weightForAge: screeningData.weightForAge ?? null,
        weightForHeight: screeningData.weightForHeight ?? null,
        muacResult: screeningData.muacResult ?? null,
        referralRequired: screeningData.referralRequired,
        referralFacility: screeningData.referralFacility ?? null,
        referralDate: screeningData.referralDate ?? null,
        referralReason: screeningData.referralReason ?? null,
        // TIER columns
        tierIIMotor: !!screeningData.tierIIMotor,
        tierIICST: !!screeningData.tierIICST,
        tierIII: !!screeningData.tierIII,
        screenedBy: screeningData.screenedBy,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating screening:', error);
      throw error;
    }
  }

  async getScreenings(filters: any = {}) {
    if (!this.db) await this.initializeDatabase();
    
    try {
      let query = this.db.select({
        id: screenings.id,
        childId: screenings.childId,
        date: screenings.date,
        weight: screenings.weight,
        height: screenings.height,
        muac: screenings.muac,
        hearingScreening: screenings.hearingScreening,
        visionScreening: screenings.visionScreening,
        mdatSF1: screenings.mdatSF1,
        mdatLF1: screenings.mdatLF1,
        mdatSF2: screenings.mdatSF2,
        mdatLF2: screenings.mdatLF2,
        currentAge: screenings.currentAge,
        screeningDate: screenings.screeningDate,
        oedema: screenings.oedema,
        appetite: screenings.appetite,
        symptoms: screenings.symptoms,
        heightForAge: screenings.heightForAge,
        weightForAge: screenings.weightForAge,
        weightForHeight: screenings.weightForHeight,
        muacResult: screenings.muacResult,
        referralRequired: screenings.referralRequired,
        referralFacility: screenings.referralFacility,
        referralDate: screenings.referralDate,
        referralReason: screenings.referralReason,
        screenedBy: screenings.screenedBy,
        createdAt: screenings.createdAt
      }).from(screenings);
      
      // Apply filters
      if (filters.screenedBy) {
        query = query.where(eq(screenings.screenedBy, filters.screenedBy));
      }
      
      // Order by date descending to show most recent first
      query = query.orderBy(desc(screenings.date));
      
      return await query;
    } catch (error) {
      console.error("Error getting screenings:", error);
      throw error;
    }
  }

  async getReferrals(filters: any = {}) {
    try {
      let query = this.db.select().from(screenings).where(eq(screenings.referralRequired, true));

      if (filters.registeredBy) {
        query = query.where(eq(screenings.screenedBy, filters.registeredBy));
      }

      if (filters.district) {
        query = query.where(eq(screenings.district, filters.district));
      }

      if (filters.search) {
        query = query.where(
          or(
            like(screenings.childId.toString(), `%${filters.search}%`),
            like(screenings.referralReason || '', `%${filters.search}%`)
          )
        );
      }

      return await query;
    } catch (error) {
      console.error("Error getting referrals:", error);
      throw error;
    }
  }

  async getUsers(filters: { role?: 'admin' | 'vht'; status?: 'active' | 'inactive' | 'pending' } = {}) {
    try {
      let query = this.db.select().from(users);

      if (filters.role) {
        query = query.where(eq(users.role, filters.role));
      }

      if (filters.status) {
        query = query.where(eq(users.status, filters.status));
      }

      return await query;
    } catch (error) {
      console.error("Error getting users:", error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    try {
      // First check if user exists
      const user = await this.getUser(id);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if this is the default admin user (id: 1)
      if (user.id === 1) {
        throw new Error("Cannot delete the default admin user");
      }

      // Check if user is the last admin
      if (user.role === "admin") {
        const admins = await this.getUsers({ role: "admin" });
        if (admins.length <= 1) {
          throw new Error("Cannot delete the last admin user");
        }
      }

      // Delete the user and verify the deletion
      const result = await this.db.delete(users).where(eq(users.id, id)).returning();
      
      if (!result || result.length === 0) {
        throw new Error("Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async deleteScreening(id: number): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    try {
      const result = await this.db.delete(screenings).where(eq(screenings.id, id)).returning();
      if (!result || result.length === 0) {
        throw new Error('Failed to delete screening');
      }
    } catch (error) {
      console.error('Error deleting screening:', error);
      throw error;
    }
  }

  // Follow-up methods
  async getFollowUps(childId: number): Promise<InferSelectModel<typeof followUps>[]> {
    return await this.db.query.followUps.findMany({
      where: eq(followUps.childId, childId),
      orderBy: [desc(followUps.createdAt)]
    });
  }

  async createFollowUp(data: {
    childId: number;
    date: string;
    observation: string;
    createdBy: number;
  }): Promise<InferSelectModel<typeof followUps>> {
    const [followUp] = await this.db.insert(followUps)
      .values(data)
      .returning();
    return followUp;
  }
}

export const postgresStorage = new PostgreSQLStorage();