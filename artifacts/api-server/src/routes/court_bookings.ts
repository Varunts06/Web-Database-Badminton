import { Router, type IRouter } from "express";
import { db, courtBookingsTable, playersTable, betsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/court-bookings", async (req, res) => {
  try {
    const bookings = await db.select().from(courtBookingsTable).orderBy(desc(courtBookingsTable.createdAt));
    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p.name]));

    res.json(bookings.map(b => ({
      ...b,
      totalAmount: parseFloat(b.totalAmount),
      payerName: playerMap.get(b.payerId) || "Unknown",
      player1Name: playerMap.get(b.player1Id) || "Unknown",
      player2Name: playerMap.get(b.player2Id) || "Unknown",
      player3Name: playerMap.get(b.player3Id) || "Unknown",
      player4Name: playerMap.get(b.player4Id) || "Unknown",
      createdAt: b.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get court bookings");
    res.status(500).json({ error: "Failed to get court bookings" });
  }
});

router.post("/court-bookings", async (req, res) => {
  try {
    const { sessionId, payerId, player1Id, player2Id, player3Id, player4Id, totalAmount, date } = req.body;

    if (!payerId || !player1Id || !player2Id || !player3Id || !player4Id || !totalAmount || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const total = parseFloat(totalAmount);
    const perPlayer = total / 4;

    const [booking] = await db.insert(courtBookingsTable).values({
      sessionId: sessionId || null,
      payerId,
      player1Id,
      player2Id,
      player3Id,
      player4Id,
      totalAmount: total.toFixed(2),
      date,
    }).returning();

    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p]));

    const allPlayerIds = [player1Id, player2Id, player3Id, player4Id];
    const otherPlayerIds = allPlayerIds.filter(id => id !== payerId);

    for (const otherPlayerId of otherPlayerIds) {
      await db.insert(betsTable).values({
        courtBookingId: booking.id,
        fromPlayerId: otherPlayerId,
        toPlayerId: payerId,
        amount: perPlayer.toFixed(2),
        description: `Court booking fee: ${playerMap.get(otherPlayerId)?.name} owes ${playerMap.get(payerId)?.name} ${perPlayer}rs`,
      });

      const otherPlayer = playerMap.get(otherPlayerId);
      if (otherPlayer) {
        const newBalance = parseFloat(otherPlayer.balance) - perPlayer;
        await db.update(playersTable).set({ balance: newBalance.toFixed(2) }).where(eq(playersTable.id, otherPlayerId));
      }

      const payer = playerMap.get(payerId);
      if (payer) {
        const newBalance = parseFloat(payer.balance) + perPlayer;
        await db.update(playersTable).set({ balance: newBalance.toFixed(2) }).where(eq(playersTable.id, payerId));
        playerMap.set(payerId, { ...payer, balance: newBalance.toFixed(2) });
      }
    }

    const finalPayer = playerMap.get(payerId);

    res.status(201).json({
      ...booking,
      totalAmount: parseFloat(booking.totalAmount),
      payerName: finalPayer?.name || "Unknown",
      player1Name: playerMap.get(player1Id)?.name || "Unknown",
      player2Name: playerMap.get(player2Id)?.name || "Unknown",
      player3Name: playerMap.get(player3Id)?.name || "Unknown",
      player4Name: playerMap.get(player4Id)?.name || "Unknown",
      createdAt: booking.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create court booking");
    res.status(500).json({ error: "Failed to create court booking" });
  }
});

export default router;
