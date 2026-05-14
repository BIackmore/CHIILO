import { bitacorasController } from "@/controllers";
import { authenticate, requireRole } from "@/middleware";
import { Router } from "express";

const bitacorasRouter = Router();
bitacorasRouter.use(authenticate);
bitacorasRouter.get("/", requireRole("admin"), bitacorasController.getAll);

export default bitacorasRouter;
