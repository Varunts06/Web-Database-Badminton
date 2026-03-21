import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";

export const betsTable = pgTable("bets", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id"),
  courtBookingId: integer("court_booking_id"),
  fromPlayerId: integer("from_player_id").notNull().references(() => playersTable.id),
  toPlayerId: integer("to_player_id").notNull().references(() => playersTable.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBetSchema = createInsertSchema(betsTable).omit({ id: true, createdAt: true });
export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof betsTable.$inferSelect;
