export interface RefreshTokenProps {
  id: string;
  userId: string;
  /** Hash (argon2) del refresh token crudo; nunca se guarda el token en claro. */
  tokenHash: string;
  jti: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: string | null;
  createdAt: Date;
}

/** Entidad de dominio para una sesión de refresh token persistida. */
export class RefreshToken {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly jti: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly replacedBy: string | null;
  readonly createdAt: Date;

  constructor(props: RefreshTokenProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.tokenHash = props.tokenHash;
    this.jti = props.jti;
    this.expiresAt = props.expiresAt;
    this.revokedAt = props.revokedAt;
    this.replacedBy = props.replacedBy;
    this.createdAt = props.createdAt;
  }

  get isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isExpired(now: Date): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }
}
