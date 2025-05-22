import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { postgresStorage as storage } from "./postgres-storage";
import { setupAuth } from "./auth";
import { insertChildSchema, insertScreeningSchema, insertUserSchema } from "@shared/postgres-schema"; // Use PostgreSQL schema
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import type { InferSelectModel } from "drizzle-orm";
import { users } from "@shared/postgres-schema";
import bcrypt from "bcrypt";

type DbUser = InferSelectModel<typeof users>;

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Middleware to ensure user is authenticated
  const ensureAuthenticated = (req: Request & { user?: DbUser }, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    return next();
  };

  // Middleware to ensure user is admin
  const ensureAdmin = (req: Request & { user?: DbUser }, res: Response, next: Function) => {
    const user = checkAuth(req);
    if (user.role === "admin") {
      return next();
    }
    res.status(403).json({ message: "Access denied" });
  };

  // User routes (admin only)
  app.get("/api/users", ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      return res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error fetching users", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/users", ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Error creating user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/users/:id", ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Error deleting user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/users/:id", ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedUser = await storage.updateUser(id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating user" });
    }
  });

  // Helper function to check user authentication
  const checkAuth = (req: Request & { user?: DbUser }) => {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    return req.user;
  };

  // Children routes
  app.get("/api/children", ensureAuthenticated, async (req, res) => {
    try {
      const { district, healthFacility, search } = req.query;
      let filters: any = {};
      
      // Only apply district filter if it's not "_all"
      if (district && district !== "_all") {
        filters.district = district as string;
      }
      
      // Only apply health facility filter if it's not "_all"
      if (healthFacility && healthFacility !== "_all") {
        filters.healthFacility = healthFacility as string;
      }
      
      // VHT users can only see children they registered
      const user = checkAuth(req);
      if (user.role === "vht") {
        filters.registeredBy = user.id;
      }
      
      // Get all children first
      let children = await storage.getChildren(filters);
      
      // Apply search filter if provided
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        children = children.filter(child => 
          child.fullName.toLowerCase().includes(searchTerm) || 
          child.childId.toLowerCase().includes(searchTerm)
        );
      }

      // Add debug logging
      console.log("Fetched children:", children.length);
      console.log("Filters applied:", filters);
      
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Error fetching children" });
    }
  });

  app.get("/api/children/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const child = await storage.getChild(id);
      
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }
      
      // VHT users can only access children they registered
      const user = checkAuth(req);
      if (user.role === "vht" && child.registeredBy !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(child);
    } catch (error) {
      if (error instanceof Error && error.message === "User not authenticated") {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Error fetching child" });
    }
  });

  app.post("/api/children", ensureAuthenticated, async (req, res) => {
    try {
      // Add debug logging
      console.log("Received child data:", req.body);
      
      // Using a more permissive approach to handle validation
      let childData: any;
      try {
        childData = insertChildSchema.parse(req.body);
      } catch (validationError) {
        console.error("Validation error:", validationError);
        return res.status(400).json({ 
          message: validationError instanceof ZodError 
            ? fromZodError(validationError).message
            : "Invalid child data" 
        });
      }
      
      // Set the current user as the registerer
      const user = checkAuth(req);
      childData.registeredBy = user.id;
      
      try {
        const newChild = await storage.createChild(childData);
        res.status(201).json(newChild);
      } catch (dbError: any) {
        // Handle specific database errors
        if (dbError.code === '23505') { // Unique violation
          return res.status(400).json({ 
            message: `Child ID "${childData.childId}" already exists. Please use a different ID.` 
          });
        }
        throw dbError; // Re-throw other errors
      }
    } catch (error) {
      if (error instanceof Error && error.message === "User not authenticated") {
        return res.status(401).json({ message: error.message });
      }
      console.error("Error creating child:", error);
      res.status(500).json({ 
        message: "Error creating child",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/children/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const child = await storage.getChild(id);
      
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }
      
      // Only admin or the VHT who registered the child can update it
      const user = checkAuth(req);
      if (user.role !== "admin" && child.registeredBy !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedChild = await storage.updateChild(id, req.body);
      res.json(updatedChild);
    } catch (error) {
      if (error instanceof Error && error.message === "User not authenticated") {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Error updating child" });
    }
  });

  app.delete("/api/children/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const child = await storage.getChild(id);
      
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }
      
      // Only admin or the VHT who registered the child can delete it
      const user = checkAuth(req);
      if (user.role !== "admin" && child.registeredBy !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteChild(id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "User not authenticated") {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Error deleting child" });
    }
  });

  // Screening routes
  app.get("/api/screenings", ensureAuthenticated, async (req, res) => {
    try {
      const { childId } = req.query;
      const user = checkAuth(req);
      
      if (childId) {
        const id = parseInt(childId as string);
        const child = await storage.getChild(id);
        
        if (!child) {
          return res.status(404).json({ message: "Child not found" });
        }
        
        // VHT users can only access screenings for children they registered
        if (user.role === "vht" && child.registeredBy !== user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        const screenings = await storage.getScreeningsByChild(id);
        return res.json(screenings);
      }
      
      // If no childId, return all screenings for admin users, or user-specific screenings for VHT users
      const screenings = user.role === "admin" 
        ? await storage.getScreenings({}) 
        : await storage.getScreeningsByUser(user.id);
      res.json(screenings);
    } catch (error) {
      if (error instanceof Error && error.message === "User not authenticated") {
        return res.status(401).json({ message: error.message });
      }
      res.status(500).json({ message: "Error fetching screenings" });
    }
  });

  // Add single screening by ID endpoint
  app.get("/api/screenings/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const screening = await storage.getScreening(id);
      if (!screening) {
        return res.status(404).json({ message: "Screening not found" });
      }
      // Optionally, add role-based access control here if needed
      res.json(screening);
    } catch (error) {
      res.status(500).json({ message: "Error fetching screening" });
    }
  });

  app.post("/api/screenings", ensureAuthenticated, async (req, res) => {
    try {
      const user = checkAuth(req);
      const screeningData = insertScreeningSchema.parse({
        ...req.body,
        screenedBy: user.id
      });
      
      const newScreening = await storage.createScreening(screeningData);
      res.status(201).json(newScreening);
    } catch (error) {
      if (error instanceof Error && error.message === "User not authenticated") {
        return res.status(401).json({ message: error.message });
      }
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Error creating screening" });
    }
  });

  app.delete("/api/screenings/:id", ensureAuthenticated, async (req, res) => {
    try {
      await storage.deleteScreening(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting screening:', error);
      res.status(500).json({ message: 'Error deleting screening' });
    }
  });

  // Stats endpoint
  app.get("/api/stats", ensureAuthenticated, async (req, res) => {
    try {
      const { district, healthFacility, search } = req.query;
      let filters: any = {};
      
      if (district && district !== "_all") {
        filters.district = district as string;
      }
      
      if (healthFacility) {
        filters.healthFacility = healthFacility as string;
      }
      
      // VHT users can only see children they registered
      const user = checkAuth(req);
      if (user.role === "vht") {
        filters.registeredBy = user.id;
      }
      
      let children = await storage.getChildren(filters);
      
      // Apply search filter if provided
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        children = children.filter(child => 
          child.fullName.toLowerCase().includes(searchTerm) || 
          child.childId.toLowerCase().includes(searchTerm)
        );
      }

      const screenings = await storage.getScreenings(filters);
      const referrals = screenings.filter((s: { referralRequired: boolean }) => s.referralRequired);
      const users = await storage.getUsers({ role: "vht", status: "active" });

      // Calculate stats
      const stats = {
        totalChildren: children.length,
        totalScreenings: screenings.length,
        totalReferrals: referrals.length,
        activeUsers: users.length,
        districtDistribution: children.reduce((acc: Record<string, number>, child) => {
          const district = child.district || "Unknown";
          acc[district] = (acc[district] || 0) + 1;
          return acc;
        }, {}),
        statusDistribution: children.reduce((acc: Record<string, number>, child) => {
          const status = child.status || "Unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}),
        recentChildren: children
          .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
          .slice(0, 5)
          .map(child => ({
            id: child.id,
            fullName: child.fullName,
            district: child.district || "Unknown",
            healthFacility: child.healthFacility || "Unknown",
            status: child.status || "Unknown"
          }))
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get referred children
  app.get("/api/children/referred", ensureAuthenticated, async (req, res) => {
    try {
      const user = checkAuth(req);
      const filters: any = { status: "referred" };
      
      // VHT users can only see children they registered
      if (user.role === "vht") {
        filters.registeredBy = user.id;
      }
      
      const children = await storage.getChildren(filters);
      
      // Get the latest screening for each child to get referral details
      const childrenWithScreenings = await Promise.all(
        children.map(async (child) => {
          const screenings = await storage.getScreeningsByChild(child.id);
          const latestScreening = screenings
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          
          // Get latest follow-up if any
          const followUps = await storage.getFollowUps(child.id);
          const latestFollowUp = followUps
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          
          return {
            ...child,
            referralDate: latestScreening?.date,
            referralReason: latestScreening?.referralReason,
            lastFollowUp: latestFollowUp?.date,
            lastObservation: latestFollowUp?.observation
          };
        })
      );
      
      res.json(childrenWithScreenings);
    } catch (error) {
      console.error("Error fetching referred children:", error);
      res.status(500).json({ message: "Error fetching referred children" });
    }
  });

  // Get follow-ups for a child
  app.get("/api/followups/:childId", ensureAuthenticated, async (req, res) => {
    try {
      const childId = parseInt(req.params.childId);
      const child = await storage.getChild(childId);
      
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }
      
      // VHT users can only access children they registered
      const user = checkAuth(req);
      if (user.role === "vht" && child.registeredBy !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const followUps = await storage.getFollowUps(childId);
      res.json(followUps);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
      res.status(500).json({ message: "Error fetching follow-ups" });
    }
  });

  // Add a follow-up
  app.post("/api/followups", ensureAuthenticated, async (req, res) => {
    try {
      const user = checkAuth(req);
      const { childId, date, observation } = req.body;
      
      // Validate input
      if (!childId || !date || !observation) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const child = await storage.getChild(childId);
      
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }
      
      // VHT users can only add follow-ups for children they registered
      if (user.role === "vht" && child.registeredBy !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const followUp = await storage.createFollowUp({
        childId,
        date,
        observation,
        createdBy: user.id
      });
      
      res.status(201).json(followUp);
    } catch (error) {
      console.error("Error creating follow-up:", error);
      res.status(500).json({ message: "Error creating follow-up" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
