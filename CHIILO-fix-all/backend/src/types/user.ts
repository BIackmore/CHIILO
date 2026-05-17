import { JwtPayload } from "jsonwebtoken";

export interface User extends JwtPayload {
  id_usuario: number;
  correo: string;
  rol: string;
  nombre: string;
}
