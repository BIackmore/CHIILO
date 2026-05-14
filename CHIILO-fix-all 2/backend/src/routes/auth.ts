import { Router } from "express";
import { body } from "express-validator";
import { authController } from "@/controllers";
import { authenticate, requireRole, validate } from "@/middleware";

const authRouter = Router();

// POST /api/auth/login
authRouter.post(
  "/login",
  body("correo").isEmail().withMessage("Correo inválido"),
  body("password").notEmpty().withMessage("Contraseña requerida"),
  authController.login
);

// POST /api/auth/register  (usuario común)
authRouter.post(
  "/register",
  body("nombre").notEmpty().withMessage("Nombre requerido"),
  body("correo").isEmail().withMessage("Correo inválido"),
  body("password").isLength({ min: 6 }).withMessage("Mínimo 6 caracteres"),
  validate,
  authController.register
);

// POST /api/auth/register-gov  (solo admin)
authRouter.post(
  "/register-gov",
  authenticate,
  requireRole("admin"),
  body("nombre").notEmpty(),
  body("correo").isEmail(),
  body("password").isLength({ min: 6 }),
  body("organizacion").notEmpty(),
  body("numTrabajador").notEmpty(),
  body("dependencia").notEmpty(),
  body("cargo").notEmpty(),
  validate,
  authController.registerGov
);

authRouter.post(
  "/refresh",
  body("refreshToken").notEmpty().withMessage("Refresh token requerido"),
  validate,
  authController.refresh
);

// GET /api/auth/me
authRouter.get("/me", authenticate, authController.me);

export default authRouter;
