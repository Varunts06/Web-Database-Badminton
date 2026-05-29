import { Router, type IRouter, type Request, type Response } from "express";
import { db, courtBookingsTable, playersTable, betsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function buildBookingResponse(booking: typeof courtBookingsTable.$inferSelect, playerMap: Map<number, string>) {
  const total = parseFloat(booking.totalAmount);
  const split = total / 4;
  const allIds = [booking.player1Id, booking.player2Id, booking.player3Id, booking.player4Id];
  const otherIds = allIds.filter(id => id !== booking.payerId);
  const debts = otherIds.map(id => ({
    fromPlayerName: playerMap.get(id) ?? "Unknown",
    toPlayerName: playerMap.get(booking.payerId) ?? "Unknown",
    amount: split,
  }));

  return {
    ...booking,
    totalAmount: total,
    splitAmount: split,
    payerName: playerMap.get(booking.payerId) ?? "Unknown",
    player1Name: playerMap.get(booking.player1Id) ?? "Unknown",
    player2Name: playerMap.get(booking.player2Id) ?? "Unknown",
    player3Name: playerMap.get(booking.player3Id) ?? "Unknown",
    player4Name: playerMap.get(booking.player4Id) ?? "Unknown",
    debts,
    createdAt: booking.createdAt.toISOString(),
  };
}

router.get("/court-bookings", async (req: Request, res: Response) => {
  try {
    const bookings = await db.select().from(courtBookingsTable).orderBy(desc(courtBookingsTable.createdAt));
    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    return res.json(bookings.map(b => buildBookingResponse(b, playerMap)));
  } catch (err) {
    req.log.error({ err }, "Failed to get court bookings");
    return res.status(500).json({ error: "Failed to get court bookings" });
  }
});

router.post("/court-bookings", async (req: Request, res: Response) => {
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
    const otherPlayerIds = allPlayerIds.filter((id: number) => id !== payerId);

    for (const otherPlayerId of otherPlayerIds) {
      await db.insert(betsTable).values({
        courtBookingId: booking.id,
        fromPlayerId: otherPlayerId,
        toPlayerId: payerId,
        amount: perPlayer.toFixed(2),
        description: `Court fee: ${playerMap.get(otherPlayerId)?.name} owes ${playerMap.get(payerId)?.name} ₹${perPlayer}`,
      });

      const otherPlayer = playerMap.get(otherPlayerId);
      if (otherPlayer) {
        const newBal = parseFloat(otherPlayer.balance) - perPlayer;
        const newCourtBal = parseFloat(otherPlayer.courtBalance) - perPlayer;
        await db.update(playersTable).set({
          balance: newBal.toFixed(2),
          courtBalance: newCourtBal.toFixed(2),
        }).where(eq(playersTable.id, otherPlayerId));
        playerMap.set(otherPlayerId, { ...otherPlayer, balance: newBal.toFixed(2), courtBalance: newCourtBal.toFixed(2) });
      }

      const payer = playerMap.get(payerId);
      if (payer) {
        const newBal = parseFloat(payer.balance) + perPlayer;
        const newCourtBal = parseFloat(payer.courtBalance) + perPlayer;
        await db.update(playersTable).set({
          balance: newBal.toFixed(2),
          courtBalance: newCourtBal.toFixed(2),
        }).where(eq(playersTable.id, payerId));
        playerMap.set(payerId, { ...payer, balance: newBal.toFixed(2), courtBalance: newCourtBal.toFixed(2) });
      }
    }

    const nameMap = new Map(players.map(p => [p.id, p.name]));
    return res.status(201).json(buildBookingResponse(booking, nameMap));
  } catch (err) {
    req.log.error({ err }, "Failed to create court booking");
    return res.status(500).json({ error: "Failed to create court booking" });
  }
});

router.delete("/court-bookings/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [booking] = await db.select().from(courtBookingsTable).where(eq(courtBookingsTable.id, id));
    if (!booking) {
      return res.status(404).json({ error: "Court booking not found" });
    }

    const courtBets = await db.select().from(betsTable).where(eq(betsTable.courtBookingId, id));
    const players = await db.select().from(playersTable);
    const playerMap = new Map(players.map(p => [p.id, p]));

    for (const bet of courtBets) {
      const betAmt = parseFloat(bet.amount);

      const fromPlayer = playerMap.get(bet.fromPlayerId);
      if (fromPlayer) {
        const newBal = parseFloat(fromPlayer.balance) + betAmt;
        const newCourtBal = parseFloat(fromPlayer.courtBalance) + betAmt;
        await db.update(playersTable).set({
          balance: newBal.toFixed(2),
          courtBalance: newCourtBal.toFixed(2),
        }).where(eq(playersTable.id, bet.fromPlayerId));
        playerMap.set(bet.fromPlayerId, { ...fromPlayer, balance: newBal.toFixed(2), courtBalance: newCourtBal.toFixed(2) });
      }

      const toPlayer = playerMap.get(bet.toPlayerId);
      if (toPlayer) {
        const newBal = parseFloat(toPlayer.balance) - betAmt;
        const newCourtBal = parseFloat(toPlayer.courtBalance) - betAmt;
        await db.update(playersTable).set({
          balance: newBal.toFixed(2),
          courtBalance: newCourtBal.toFixed(2),
        }).where(eq(playersTable.id, bet.toPlayerId));
        playerMap.set(bet.toPlayerId, { ...toPlayer, balance: newBal.toFixed(2), courtBalance: newCourtBal.toFixed(2) });
      }
    }

    await db.delete(betsTable).where(eq(betsTable.courtBookingId, id));
    await db.delete(courtBookingsTable).where(eq(courtBookingsTable.id, id));

    return res.json({ success: true, message: "Court booking deleted and fees reversed" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete court booking");
    return res.status(500).json({ error: "Failed to delete court booking" });
  }
});

export default router;
