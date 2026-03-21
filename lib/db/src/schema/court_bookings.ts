import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";

export const courtBookingsTable = pgTable("court_bookings", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id"),
  payerId: integer("payer_id").notNull().references(() => playersTable.id),
  player1Id: integer("player1_id").notNull().references(() => playersTable.id),
  player2Id: integer("player2_id").notNull().references(() => playersTable.id),
  player3Id: integer("player3_id").notNull().references(() => playersTable.id),
  player4Id: integer("player4_id").notNull().references(() => playersTable.id),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("200"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCourtBookingSchema = createInsertSchema(courtBookingsTable).omit({ id: true, createdAt: true });
export type InsertCourtBooking = z.infer<typeof insertCourtBookingSchema>;
export type CourtBooking = typeof courtBookingsTable.$inferSelect;
