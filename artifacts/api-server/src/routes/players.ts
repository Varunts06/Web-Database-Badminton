import { Router, type IRouter } from "express";
import { db, playersTable, betsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/players", async (req, res) => {
  try {
    const players = await db.select().from(playersTable).orderBy(playersTable.id);
    res.json(players.map(p => ({
      ...p,
      balance: parseFloat(p.balance),
      createdAt: p.createdAt.toISOString(),
    })));
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
      isFixed: isFixed ?? true,
      balance: "0",
    }).returning();
    res.status(201).json({
      ...player,
      balance: parseFloat(player.balance),
      createdAt: player.createdAt.toISOString(),
    });
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
    res.json({
      ...player,
      balance: parseFloat(player.balance),
      createdAt: player.createdAt.toISOString(),
    });
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

    const newBalance = parseFloat(player.balance) + parseFloat(amount);
    const [updated] = await db.update(playersTable)
      .set({ balance: newBalance.toFixed(2) })
      .where(eq(playersTable.id, id))
      .returning();

    if (description) {
      await db.insert(betsTable).values({
        fromPlayerId: amount < 0 ? id : id,
        toPlayerId: id,
        amount: Math.abs(parseFloat(amount)).toFixed(2),
        description: description || `Manual balance adjustment: ${amount > 0 ? '+' : ''}${amount}rs`,
      });
    }

    res.json({
      ...updated,
      balance: parseFloat(updated.balance),
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update balance");
    res.status(500).json({ error: "Failed to update balance" });
  }
});

export default router;
