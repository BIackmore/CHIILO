import { analisisController } from "@/controllers";
import { authenticate } from "@/middleware/auth";
import { Router } from "express";

const analisisRouter = Router();
analisisRouter.use(authenticate);
analisisRouter.get("/stats", analisisController.getStats);
analisisRouter.get("/", analisisController.getAll);
analisisRouter.get("/:id", analisisController.getOne);

export default analisisRouter;
