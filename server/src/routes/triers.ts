import { Router } from "express";
import { db } from "../db";
import { triers, followUps } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Schema for creating a follow-up
const createFollowUpSchema = z.object({
  trierId: z.number(),
  followUpDate: z.string(),
  observation: z.string().min(1),
});

// Get all triers with their latest follow-up
router.get("/", async (req, res) => {
  try {
    const allTriers = await db.query.triers.findMany({
      with: {
        child: true,
        screening: true,
        followUps: {
          orderBy: (followUps, { desc }) => [desc(followUps.createdAt)],
          limit: 1,
        },
      },
    });

    const formattedTriers = allTriers.map((trier) => ({
      id: trier.id,
      childName: trier.child.fullName,
      tierType: trier.tierType,
      createdAt: trier.createdAt,
      lastFollowUp: trier.followUps[0]?.createdAt || null,
    }));

    res.json(formattedTriers);
  } catch (error) {
    console.error("Error fetching triers:", error);
    res.status(500).json({ error: "Failed to fetch triers" });
  }
});

// Create a follow-up
router.post("/follow-ups", async (req, res) => {
  try {
    const data = createFollowUpSchema.parse(req.body);

    const newFollowUp = await db.insert(followUps).values({
      trierId: data.trierId,
      followUpDate: data.followUpDate,
      observation: data.observation,
    }).returning();

    res.json(newFollowUp[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error("Error creating follow-up:", error);
      res.status(500).json({ error: "Failed to create follow-up" });
    }
  }
});

// Get follow-ups for a specific trier
router.get("/:trierId/follow-ups", async (req, res) => {
  try {
    const { trierId } = req.params;
    const trierFollowUps = await db.query.followUps.findMany({
      where: eq(followUps.trierId, parseInt(trierId)),
      orderBy: (followUps, { desc }) => [desc(followUps.createdAt)],
    });

    res.json(trierFollowUps);
  } catch (error) {
    console.error("Error fetching follow-ups:", error);
    res.status(500).json({ error: "Failed to fetch follow-ups" });
  }
});

export default router; 