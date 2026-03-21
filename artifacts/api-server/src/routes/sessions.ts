import { Router, type IRouter } from "express";
import { db, sessionsTable, matchesTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sessions", async (req, res) => {
  try {
    const sessions = await db.select().from(sessionsTable).orderBy(sessionsTable.id);
    res.json(sessions.map(s => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get sessions");
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const { date, guestPlayerName, notes } = req.body;
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }
    const [session] = await db.insert(sessionsTable).values({
      date,
      guestPlayerName: guestPlayerName || null,
      notes: notes || null,
    }).returning();
    res.status(201).json({
      ...session,
      createdAt: session.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create session");
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const matches = await db.select().from(matchesTable).where(eq(matchesTable.sessionId, id));
    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p.name]));

    const matchesWithNames = matches.map(m => ({
      ...m,
      betAmount: parseFloat(m.betAmount),
      team1Player1Name: playerMap.get(m.team1Player1Id) || "Unknown",
      team1Player2Name: playerMap.get(m.team1Player2Id) || "Unknown",
      team2Player1Name: playerMap.get(m.team2Player1Id) || "Unknown",
      team2Player2Name: playerMap.get(m.team2Player2Id) || "Unknown",
      createdAt: m.createdAt.toISOString(),
    }));

    res.json({
      ...session,
      createdAt: session.createdAt.toISOString(),
      matches: matchesWithNames,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get session");
    res.status(500).json({ error: "Failed to get session" });
  }
});

export default router;
