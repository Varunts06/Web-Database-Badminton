import { Router, type IRouter } from "express";
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

router.get("/players", async (req, res) => {
  try {
    const players = await db.select().from(playersTable).orderBy(playersTable.id);
    res.json(players.map(formatPlayer));
  } catch (err) {
    req.log.error({ err }, "Failed to get players");
    res.status(500).json({ error: "Failed to get players" });
  }
});

router.post("/players", async (req, res) => {
  try {
    const { name, isFixed } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
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

router.get("/players/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json(formatPlayer(player));
  } catch (err) {
    req.log.error({ err }, "Failed to get player");
    res.status(500).json({ error: "Failed to get player" });
  }
});

router.patch("/players/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { amount, description } = req.body;
    if (amount === undefined) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const delta = parseFloat(amount);
    const newBalance = parseFloat(player.balance) + delta;
    const newBetBalance = parseFloat(player.betBalance) + delta;

    const [updated] = await db.update(playersTable)
      .set({
        balance: newBalance.toFixed(2),
        betBalance: newBetBalance.toFixed(2),
      })
      .where(eq(playersTable.id, id))
      .returning();

    if (description) {
      await db.insert(betsTable).values({
        fromPlayerId: id,
        toPlayerId: id,
        amount: Math.abs(delta).toFixed(2),
        description: description || `Manual adjustment: ${delta > 0 ? '+' : ''}${delta}rs`,
      });
    }

    res.json(formatPlayer(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update balance");
    res.status(500).json({ error: "Failed to update balance" });
  }
});

export default router;
