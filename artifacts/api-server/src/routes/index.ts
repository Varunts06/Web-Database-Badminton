import { Router, type IRouter } from "express";
import healthRouter from "./health";
import playersRouter from "./players";
import sessionsRouter from "./sessions";
import matchesRouter from "./matches";
import betsRouter from "./bets";
import courtBookingsRouter from "./court_bookings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(playersRouter);
router.use(sessionsRouter);
router.use(matchesRouter);
router.use(betsRouter);
router.use(courtBookingsRouter);

export default router;
