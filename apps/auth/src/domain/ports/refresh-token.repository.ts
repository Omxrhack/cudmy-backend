import { RefreshToken } from '../entities/refresh-token.entity';

/** Datos para persistir un refresh token nuevo. */
export interface NewRefreshToken {
  userId: string;
  jti: string;
  tokenHash: string;
  expiresAt: Date;
}

/** Resultado del intento atómico de consumir (rotar) un refresh token por su jti. */
export type ClaimOutcome =
  | { status: 'rotated'; token: RefreshToken }
  | { status: 'reuse'; userId: string }
  | { status: 'not_found' };

/**
 * Puerto de persistencia de refresh tokens.
 *
 * `claimForRotation` es el núcleo de seguridad: marca el token como revocado
 * (`revoked_at`, `replaced_by`) SOLO si estaba activo, de forma atómica. Si el
 * token ya estaba revocado devuelve `reuse` (replay detectado); si no existe,
 * `not_found`.
 */
export abstract class RefreshTokenRepository {
  abstract create(data: NewRefreshToken): Promise<RefreshToken>;
  abstract findByJti(jti: string): Promise<RefreshToken | null>;
  abstract claimForRotation(
    jti: string,
    replacedBy: string,
  ): Promise<ClaimOutcome>;
  abstract revokeByJti(jti: string): Promise<void>;
  abstract revokeAllForUser(userId: string): Promise<void>;
}
