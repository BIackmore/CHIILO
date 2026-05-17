import { dashboardController } from "@/controllers";
import { authenticate } from "@/middleware";
import { Router } from "express";

const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get("/", dashboardController.getDashboard);
dashboardRouter.get("/niveles", dashboardController.getNiveles);

export default dashboardRouter;
