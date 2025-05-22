// Create a new screening
router.post("/", async (req, res) => {
  try {
    const data = insertScreeningSchema.parse(req.body);
    
    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Insert the screening
      const [screening] = await tx.insert(screenings).values({
        ...data,
        tierIIMotor: data.tierIIMotor || false,
        tierIICST: data.tierIICST || false,
        tierIII: data.tierIII || false,
      }).returning();

      // If any TIER is selected, create trier records
      if (data.tierIIMotor || data.tierIICST || data.tierIII) {
        const trierValues = [];
        
        if (data.tierIIMotor) {
          trierValues.push({
            childId: data.childId,
            screeningId: screening.id,
            tierType: "TIER II Motor",
          });
        }
        
        if (data.tierIICST) {
          trierValues.push({
            childId: data.childId,
            screeningId: screening.id,
            tierType: "TIER II CST",
          });
        }
        
        if (data.tierIII) {
          trierValues.push({
            childId: data.childId,
            screeningId: screening.id,
            tierType: "TIER III",
          });
        }

        await tx.insert(triers).values(trierValues);
      }

      return screening;
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error("Error creating screening:", error);
      res.status(500).json({ error: "Failed to create screening" });
    }
  }
}); 