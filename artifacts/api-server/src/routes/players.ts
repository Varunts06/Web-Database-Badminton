import { Router, type IRouter, type Request, type Response } from "express";
import { db, playersTable, betsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function formatPlayer(p: typeof playersTable.$inferSelect) {
  return {
    ...p,
    balance: parseFloat(p.balance),
    betBalance: parseFloat(p.betBalance),
    courtBalance: parseFloat(p.courtBalance),
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/players", async (req: Request, res: Response): Promise<void> => {
  try {
    const players = await db.select().from(playersTable).orderBy(playersTable.id);
    res.json(players.map(formatPlayer));
  } catch (err) {
    req.log.error({ err }, "Failed to get players");
    res.status(500).json({ error: "Failed to get players" });
  }
});

router.post("/players", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, isFixed } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [player] = await db.insert(playersTable).values({
      name,
      isFixed: isFixed ?? false,
      balance: "0",
      betBalance: "0",
      courtBalance: "0",
    }).returning();
    res.status(201).json(formatPlayer(player));
  } catch (err) {
    req.log.error({ err }, "Failed to create player");
    res.status(500).json({ error: "Failed to create player" });
  }
});

router.get("/players/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    res.json(formatPlayer(player));
  } catch (err) {
    req.log.error({ err }, "Failed to get player");
    res.status(500).json({ error: "Failed to get player" });
  }
});

router.patch("/players/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, amount, description } = req.body;

    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const updates: Partial<typeof playersTable.$inferInsert> = {};

    if (name !== undefined && name.trim()) {
      updates.name = name.trim();
    }

    if (amount !== undefined) {
      const delta = parseFloat(amount);
      const newBalance = parseFloat(player.balance) + delta;
      const newBetBalance = parseFloat(player.betBalance) + delta;
      updates.balance = newBalance.toFixed(2);
      updates.betBalance = newBetBalance.toFixed(2);

      if (description) {
        await db.insert(betsTable).values({
          fromPlayerId: id,
          toPlayerId: id,
          amount: Math.abs(delta).toFixed(2),
          description: description || `Manual adjustment: ${delta > 0 ? "+" : ""}${delta}rs`,
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db.update(playersTable)
      .set(updates)
      .where(eq(playersTable.id, id))
      .returning();

    res.json(formatPlayer(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update player");
    res.status(500).json({ error: "Failed to update player" });
  }
});

router.delete("/players/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    if (player.isFixed) {
      res.status(400).json({ error: "Cannot delete a fixed player" });
      return;
    }
    await db.delete(playersTable).where(eq(playersTable.id, id));
    res.json({ success: true, message: "Player deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete player");
    res.status(500).json({ error: "Failed to delete player" });
  }
});

export default router;
