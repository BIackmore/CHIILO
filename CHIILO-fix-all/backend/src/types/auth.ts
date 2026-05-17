import { JwtPayload } from "jsonwebtoken";

export type TokenType = "access" | "refresh";

export interface TokenPayload extends JwtPayload {
  id_usuario: number;
  correo: string;
  rol: string;
  nombre: string;
  tokenType: TokenType;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenBody {
  refreshToken: string;
}
