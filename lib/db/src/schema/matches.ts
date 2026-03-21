import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";
import { playersTable } from "./players";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id),
  team1Player1Id: integer("team1_player1_id").notNull().references(() => playersTable.id),
  team1Player2Id: integer("team1_player2_id").notNull().references(() => playersTable.id),
  team2Player1Id: integer("team2_player1_id").notNull().references(() => playersTable.id),
  team2Player2Id: integer("team2_player2_id").notNull().references(() => playersTable.id),
  winnerTeam: integer("winner_team"),
  betAmount: numeric("bet_amount", { precision: 10, scale: 2 }).notNull().default("20"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
