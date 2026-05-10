import { usuariosController } from "@/controllers";
import { authenticate, requireRole } from "@/middleware";
import { Router } from "express";

const userRouter = Router();
// Todas requieren autenticación
userRouter.use(authenticate);

// GET /api/usuarios/stats
userRouter.get("/stats", requireRole("admin"), usuariosController.getStats);

// GET /api/usuarios
userRouter.get("/", requireRole("admin"), usuariosController.getAll);

// GET /api/usuarios/:id
userRouter.get("/:id", usuariosController.getOne);

// PATCH /api/usuarios/:id/estado  – activar/desactivar
userRouter.patch(
  "/:id/estado",
  requireRole("admin"),
  usuariosController.toggleEstado
);

// PATCH /api/usuarios/:id/perfil  – editar perfil
userRouter.patch("/:id/perfil", usuariosController.updatePerfil);

// DELETE /api/usuarios/:id
userRouter.delete("/:id", requireRole("admin"), usuariosController.deleteUser);

export default userRouter;
