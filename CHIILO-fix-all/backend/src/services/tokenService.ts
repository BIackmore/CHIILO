import jwt, { SignOptions } from "jsonwebtoken";
import { AuthTokens, TokenPayload, TokenType, User } from "@/types";

type TokenUser = Pick<User, "id_usuario" | "correo" | "nombre"> & {
  rol?: string;
  rol_nombre?: string;
};

const accessTokenSecret = process.env.JWT_SECRET as string;
const refreshTokenSecret =
  (process.env.JWT_REFRESH_SECRET as string | undefined) || accessTokenSecret;

const accessTokenExpiresIn = (process.env.JWT_EXPIRES_IN || "15m") as NonNullable<
  SignOptions["expiresIn"]
>;
const refreshTokenExpiresIn =
  (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as NonNullable<
    SignOptions["expiresIn"]
  >;

const getRole = (user: TokenUser) => user.rol_nombre || user.rol || "user";

const buildPayload = (user: TokenUser, tokenType: TokenType): TokenPayload => ({
  id_usuario: user.id_usuario,
  correo: user.correo,
  rol: getRole(user),
  nombre: user.nombre,
  tokenType
});

const signAccessToken = (user: TokenUser) =>
  jwt.sign(buildPayload(user, "access"), accessTokenSecret, {
    expiresIn: accessTokenExpiresIn
  });

const signRefreshToken = (user: TokenUser) =>
  jwt.sign(buildPayload(user, "refresh"), refreshTokenSecret, {
    expiresIn: refreshTokenExpiresIn
  });

const issueAuthTokens = (user: TokenUser): AuthTokens => ({
  accessToken: signAccessToken(user),
  refreshToken: signRefreshToken(user)
});

const verifyToken = (token: string, secret: string, tokenType: TokenType) => {
  const payload = jwt.verify(token, secret);

  if (typeof payload === "string" || payload.tokenType !== tokenType) {
    throw new Error("Invalid token");
  }

  return payload as TokenPayload;
};

const verifyAccessToken = (token: string) =>
  verifyToken(token, accessTokenSecret, "access");

const verifyRefreshToken = (token: string) =>
  verifyToken(token, refreshTokenSecret, "refresh");

export { issueAuthTokens, signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
