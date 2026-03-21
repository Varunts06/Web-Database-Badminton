import { Router, type IRouter } from "express";
import { db, betsTable, playersTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/bets", async (req, res) => {
  try {
    const bets = await db.select().from(betsTable).orderBy(desc(betsTable.createdAt));
    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p.name]));

    res.json(bets.map(b => ({
      ...b,
      amount: parseFloat(b.amount),
      fromPlayerName: playerMap.get(b.fromPlayerId) || "Unknown",
      toPlayerName: playerMap.get(b.toPlayerId) || "Unknown",
      createdAt: b.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get bets");
    res.status(500).json({ error: "Failed to get bets" });
  }
});

export default router;
