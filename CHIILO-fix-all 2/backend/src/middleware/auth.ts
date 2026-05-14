import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/services";

/**
 * Verifica el token JWT en el header Authorization: Bearer <token>
 */
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Token requerido" });
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id_usuario: payload.id_usuario,
      correo: payload.correo,
      rol: payload.rol,
      nombre: payload.nombre
    };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ ok: false, error: "Token inválido o expirado" });
  }
};

/**
 * Restringe acceso a roles específicos.
 * Uso: requireRole('admin') o requireRole('admin', 'gov')
 */
const requireRole =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user)
      return res.status(401).json({ ok: false, error: "No autenticado" });
    if (!roles.includes(req.user.rol)) {
      return res
        .status(403)
        .json({ ok: false, error: "Acceso denegado para tu rol" });
    }
    next();
  };

export { authenticate, requireRole };
