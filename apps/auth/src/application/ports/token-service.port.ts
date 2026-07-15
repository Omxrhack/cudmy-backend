import { Role } from '../../domain/entities/user.entity';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: Role[];
  phoneNumber: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

/** Refresh token recién firmado: incluye su jti y fecha de expiración. */
export interface SignedRefreshToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

/** Puerto de emisión/verificación de JWT (implementado con @nestjs/jwt). */
export abstract class TokenService {
  abstract signAccess(payload: AccessTokenPayload): Promise<string>;
  /** Genera un jti nuevo, firma el refresh token y devuelve token + jti + expiración. */
  abstract signRefresh(sub: string): Promise<SignedRefreshToken>;
  /** Verifica firma y expiración del refresh token. Devuelve el payload o null. */
  abstract verifyRefresh(token: string): Promise<RefreshTokenPayload | null>;
}
