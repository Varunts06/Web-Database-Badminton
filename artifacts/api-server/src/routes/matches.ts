import { Router, type IRouter } from "express";
import { db, matchesTable, playersTable, betsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/matches", async (req, res) => {
  try {
    const {
      sessionId,
      team1Player1Id,
      team1Player2Id,
      team2Player1Id,
      team2Player2Id,
      winnerTeam,
      betAmount,
    } = req.body;

    if (!sessionId || !team1Player1Id || !team1Player2Id || !team2Player1Id || !team2Player2Id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const amount = parseFloat(betAmount || "20");

    const [match] = await db.insert(matchesTable).values({
      sessionId,
      team1Player1Id,
      team1Player2Id,
      team2Player1Id,
      team2Player2Id,
      winnerTeam: winnerTeam || null,
      betAmount: amount.toFixed(2),
    }).returning();

    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p]));

    if (winnerTeam) {
      const perPlayerBet = amount / 2;
      let winnerIds: number[];
      let loserIds: number[];

      if (winnerTeam === 1) {
        winnerIds = [team1Player1Id, team1Player2Id];
        loserIds = [team2Player1Id, team2Player2Id];
      } else {
        winnerIds = [team2Player1Id, team2Player2Id];
        loserIds = [team1Player1Id, team1Player2Id];
      }

      for (const loserId of loserIds) {
        for (const winnerId of winnerIds) {
          await db.insert(betsTable).values({
            matchId: match.id,
            fromPlayerId: loserId,
            toPlayerId: winnerId,
            amount: perPlayerBet.toFixed(2),
            description: `Match bet: ${playerMap.get(loserId)?.name} owes ${playerMap.get(winnerId)?.name}`,
          });
          const loser = playerMap.get(loserId);
          if (loser) {
            const newBalance = parseFloat(loser.balance) - perPlayerBet;
            await db.update(playersTable).set({ balance: newBalance.toFixed(2) }).where(eq(playersTable.id, loserId));
          }
          const winner = playerMap.get(winnerId);
          if (winner) {
            const newBalance = parseFloat(winner.balance) + perPlayerBet;
            await db.update(playersTable).set({ balance: newBalance.toFixed(2) }).where(eq(playersTable.id, winnerId));
          }
        }
      }
    }

    const t1p1 = playerMap.get(team1Player1Id);
    const t1p2 = playerMap.get(team1Player2Id);
    const t2p1 = playerMap.get(team2Player1Id);
    const t2p2 = playerMap.get(team2Player2Id);

    res.status(201).json({
      ...match,
      betAmount: parseFloat(match.betAmount),
      team1Player1Name: t1p1?.name || "Unknown",
      team1Player2Name: t1p2?.name || "Unknown",
      team2Player1Name: t2p1?.name || "Unknown",
      team2Player2Name: t2p2?.name || "Unknown",
      createdAt: match.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create match");
    res.status(500).json({ error: "Failed to create match" });
  }
});

router.get("/matches/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }
    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    res.json({
      ...match,
      betAmount: parseFloat(match.betAmount),
      team1Player1Name: playerMap.get(match.team1Player1Id) || "Unknown",
      team1Player2Name: playerMap.get(match.team1Player2Id) || "Unknown",
      team2Player1Name: playerMap.get(match.team2Player1Id) || "Unknown",
      team2Player2Name: playerMap.get(match.team2Player2Id) || "Unknown",
      createdAt: match.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get match");
    res.status(500).json({ error: "Failed to get match" });
  }
});

export default router;
