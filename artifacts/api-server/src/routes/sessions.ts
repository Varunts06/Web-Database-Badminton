import { Router, type IRouter } from "express";
import { db, sessionsTable, matchesTable, playersTable, betsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function formatSession(s: typeof sessionsTable.$inferSelect, playerMap: Map<number, string>) {
  const ids: number[] = JSON.parse(s.playerIds || "[]");
  return {
    ...s,
    playerIds: ids,
    playerNames: ids.map(id => playerMap.get(id) || "Unknown"),
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/sessions", async (req, res) => {
  try {
    const sessions = await db.select().from(sessionsTable).orderBy(desc(sessionsTable.id));
    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    res.json(sessions.map(s => formatSession(s, playerMap)));
  } catch (err) {
    req.log.error({ err }, "Failed to get sessions");
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const { date, playerIds, guestPlayerName, notes } = req.body;
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }
    const ids: number[] = Array.isArray(playerIds) ? playerIds : [];
    const [session] = await db.insert(sessionsTable).values({
      date,
      playerIds: JSON.stringify(ids),
      guestPlayerName: guestPlayerName || null,
      notes: notes || null,
    }).returning();

    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    res.status(201).json(formatSession(session, playerMap));
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
      ...formatSession(session, playerMap),
      matches: matchesWithNames,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get session");
    res.status(500).json({ error: "Failed to get session" });
  }
});

// PATCH session — update date, players, guest name
router.patch("/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { date, playerIds, guestPlayerName, notes } = req.body;

    const [existing] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Session not found" });
    }

    const updates: Partial<typeof sessionsTable.$inferInsert> = {};
    if (date !== undefined) updates.date = date;
    if (playerIds !== undefined) updates.playerIds = JSON.stringify(Array.isArray(playerIds) ? playerIds : []);
    if (guestPlayerName !== undefined) updates.guestPlayerName = guestPlayerName || null;
    if (notes !== undefined) updates.notes = notes || null;

    const [updated] = await db.update(sessionsTable)
      .set(updates)
      .where(eq(sessionsTable.id, id))
      .returning();

    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    res.json(formatSession(updated, playerMap));
  } catch (err) {
    req.log.error({ err }, "Failed to update session");
    res.status(500).json({ error: "Failed to update session" });
  }
});

// DELETE session — reverses all match bets and deletes everything
router.delete("/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get all matches in this session
    const matches = await db.select().from(matchesTable).where(eq(matchesTable.sessionId, id));

    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p]));

    // Reverse bets for each match
    for (const match of matches) {
      const matchBets = await db.select().from(betsTable).where(eq(betsTable.matchId, match.id));
      for (const bet of matchBets) {
        const betAmt = parseFloat(bet.amount);
        const fromPlayer = playerMap.get(bet.fromPlayerId);
        if (fromPlayer) {
          const newBal = parseFloat(fromPlayer.balance) + betAmt;
          const newBetBal = parseFloat(fromPlayer.betBalance) + betAmt;
          await db.update(playersTable).set({
            balance: newBal.toFixed(2),
            betBalance: newBetBal.toFixed(2),
          }).where(eq(playersTable.id, bet.fromPlayerId));
          playerMap.set(bet.fromPlayerId, { ...fromPlayer, balance: newBal.toFixed(2), betBalance: newBetBal.toFixed(2) });
        }
        const toPlayer = playerMap.get(bet.toPlayerId);
        if (toPlayer) {
          const newBal = parseFloat(toPlayer.balance) - betAmt;
          const newBetBal = parseFloat(toPlayer.betBalance) - betAmt;
          await db.update(playersTable).set({
            balance: newBal.toFixed(2),
            betBalance: newBetBal.toFixed(2),
          }).where(eq(playersTable.id, bet.toPlayerId));
          playerMap.set(bet.toPlayerId, { ...toPlayer, balance: newBal.toFixed(2), betBalance: newBetBal.toFixed(2) });
        }
      }
      await db.delete(betsTable).where(eq(betsTable.matchId, match.id));
    }

    // Delete all matches, then session
    await db.delete(matchesTable).where(eq(matchesTable.sessionId, id));
    await db.delete(sessionsTable).where(eq(sessionsTable.id, id));

    res.json({ success: true, message: "Session and all matches deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete session");
    res.status(500).json({ error: "Failed to delete session" });
  }
});

export default router;
