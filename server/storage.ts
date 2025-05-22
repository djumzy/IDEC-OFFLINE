import { children, users, screenings, type User, type InsertUser, type Child, type InsertChild, type Screening, type InsertScreening } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for the storage
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
  
  // Screening operations
  getScreening(id: number): Promise<Screening | undefined>;
  getScreeningsByChild(childId: number): Promise<Screening[]>;
  getScreeningsByUser(userId: number): Promise<Screening[]>;
  createScreening(screening: InsertScreening): Promise<Screening>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private childrenMap: Map<number, Child>;
  private screeningsMap: Map<number, Screening>;
  private userIdCounter: number;
  private childIdCounter: number;
  private screeningIdCounter: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.usersMap = new Map();
    this.childrenMap = new Map();
    this.screeningsMap = new Map();
    this.userIdCounter = 1;
    this.childIdCounter = 1;
    this.screeningIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Add an admin user by default
    this.createUser({
      username: "admin",
      password: "admin123",
      fullName: "Admin User",
      role: "admin",
      status: "active",
      district: "Kampala",
      healthFacility: "Central Hospital",
    });
    
    // Add a VHT user by default
    this.createUser({
      username: "vht",
      password: "vht123",
      fullName: "VHT User",
      role: "vht",
      status: "active",
      district: "Wakiso",
      healthFacility: "District Health Center",
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { ...userData, id, createdAt: now };
    this.usersMap.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.usersMap.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.usersMap.values());
  }

  // Child methods
  async getChild(id: number): Promise<Child | undefined> {
    return this.childrenMap.get(id);
  }

  async getChildren(filters?: { district?: string, healthFacility?: string, registeredBy?: number }): Promise<Child[]> {
    let children = Array.from(this.childrenMap.values());
    
    if (filters) {
      if (filters.district) {
        children = children.filter(child => child.district === filters.district);
      }
      
      if (filters.healthFacility) {
        children = children.filter(child => child.healthFacility === filters.healthFacility);
      }
      
      if (filters.registeredBy) {
        children = children.filter(child => child.registeredBy === filters.registeredBy);
      }
    }
    
    return children;
  }

  async createChild(childData: InsertChild): Promise<Child> {
    const id = this.childIdCounter++;
    const now = new Date();
    
    // Generate a child ID in format CH-001, CH-002, etc. if not provided
    let childId = childData.childId;
    if (!childId || childId.trim() === '') {
      childId = `CH-${String(id).padStart(3, '0')}`;
    }
    
    // Create the child object with all supplied data
    const child: Child = { 
      ...childData, 
      id, 
      childId,
      createdAt: now,
      status: "healthy"
    };
    
    console.log("Creating child with data:", child);
    
    this.childrenMap.set(id, child);
    return child;
  }

  async updateChild(id: number, data: Partial<Child>): Promise<Child | undefined> {
    const child = this.childrenMap.get(id);
    if (!child) return undefined;
    
    const updatedChild = { ...child, ...data };
    this.childrenMap.set(id, updatedChild);
    return updatedChild;
  }

  // Screening methods
  async getScreening(id: number): Promise<Screening | undefined> {
    return this.screeningsMap.get(id);
  }

  async getScreeningsByChild(childId: number): Promise<Screening[]> {
    return Array.from(this.screeningsMap.values()).filter(
      (screening) => screening.childId === childId
    );
  }

  async getScreeningsByUser(userId: number): Promise<Screening[]> {
    return Array.from(this.screeningsMap.values()).filter(
      (screening) => screening.screenedBy === userId
    );
  }

  async createScreening(screeningData: InsertScreening): Promise<Screening> {
    const id = this.screeningIdCounter++;
    const now = new Date();
    
    console.log("Inside storage.createScreening with data:", screeningData);
    
    // Ensure all values are properly set with their correct types or null
    // to avoid type errors when creating the screening object
    const screening: Screening = { 
      id,
      childId: screeningData.childId,
      date: screeningData.date || now.toISOString().split('T')[0],
      weight: screeningData.weight || null,
      height: screeningData.height || null,
      muac: screeningData.muac || null,
      
      // New screening fields
      hearingScreening: screeningData.hearingScreening || "pass",
      visionScreening: screeningData.visionScreening || "pass",
      mdatSF1: screeningData.mdatSF1 || "pass",
      mdatLF1: screeningData.mdatLF1 || "pass",
      mdatSF2: screeningData.mdatSF2 || "pass",
      mdatLF2: screeningData.mdatLF2 || "pass",
      currentAge: screeningData.currentAge || "",
      screeningDate: screeningData.screeningDate || now.toISOString().split('T')[0],
      
      // Existing fields (keeping for backward compatibility)
      oedema: typeof screeningData.oedema === 'boolean' ? screeningData.oedema : false,
      appetite: screeningData.appetite || 'good',
      symptoms: screeningData.symptoms || null,
      heightForAge: screeningData.heightForAge || 'normal',
      weightForAge: screeningData.weightForAge || 'normal',
      weightForHeight: screeningData.weightForHeight || 'normal',
      muacResult: screeningData.muacResult || 'normal',
      
      referralRequired: typeof screeningData.referralRequired === 'boolean' ? screeningData.referralRequired : false,
      referralFacility: screeningData.referralFacility || null,
      referralDate: screeningData.referralDate || null,
      referralReason: screeningData.referralReason || null,
      screenedBy: screeningData.screenedBy || null,
      createdAt: now
    };
    
    console.log("Constructed screening object:", screening);
    
    this.screeningsMap.set(id, screening);
    
    // Update child status based on screening results
    const child = this.childrenMap.get(screeningData.childId);
    if (child) {
      let status = "healthy";
      
      // Simple logic to determine child status:
      // If any result is severe, child is referred
      // If any result is moderate, child is in monitoring
      // Otherwise child is healthy
      const results = [
        screeningData.heightForAge,
        screeningData.weightForAge,
        screeningData.weightForHeight,
        screeningData.muacResult
      ];
      
      if (results.includes("severe") || screeningData.referralRequired) {
        status = "referred";
      } else if (results.includes("moderate")) {
        status = "monitoring";
      }
      
      this.updateChild(child.id, { status });
    }
    
    return screening;
  }
}

export const storage = new MemStorage();
