import { reportsController } from "@/controllers";
import { authenticate, requireRole, validate } from "@/middleware";
import { Router } from "express";
import { body } from "express-validator";

const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.use(requireRole("admin", "gov"));
reportsRouter.get("/stats", reportsController.getStats);
reportsRouter.get("/", reportsController.getAll);
reportsRouter.get("/:id", reportsController.getOne);
reportsRouter.post(
  "/",
  body("id_analisis").isInt().withMessage("id_analisis requerido"),
  body("tipo").notEmpty().withMessage("tipo requerido"),
  validate,
  reportsController.create
);

export default reportsRouter;
