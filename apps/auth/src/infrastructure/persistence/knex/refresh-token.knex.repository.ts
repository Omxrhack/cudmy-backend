import { Injectable } from '@nestjs/common';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import {
  ClaimOutcome,
  NewRefreshToken,
  RefreshTokenRepository,
} from '../../../domain/ports/refresh-token.repository';
import { KnexService } from './knex.service';
import { RefreshTokenRow, toRefreshToken } from './rows';

@Injectable()
export class RefreshTokenKnexRepository extends RefreshTokenRepository {
  constructor(private readonly db: KnexService) {
    super();
  }

  async create(data: NewRefreshToken): Promise<RefreshToken> {
    const [row] = await this.db
      .knex<RefreshTokenRow>('refresh_tokens')
      .insert({
        user_id: data.userId,
        jti: data.jti,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
      })
      .returning('*');
    return toRefreshToken(row);
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    const row = await this.db
      .knex<RefreshTokenRow>('refresh_tokens')
      .where({ jti })
      .first();
    return row ? toRefreshToken(row) : null;
  }

  /**
   * Consume atómicamente el token: el UPDATE ... WHERE revoked_at IS NULL solo
   * afecta filas activas, así dos refresh concurrentes con el mismo jti no pueden
   * ganar ambos (cierra el TOCTOU). Si no afecta filas: o no existe, o ya estaba
   * revocado (replay ⇒ reúso).
   */
  async claimForRotation(
    jti: string,
    replacedBy: string,
  ): Promise<ClaimOutcome> {
    return this.db.knex.transaction(async (trx) => {
      const [claimed] = await trx<RefreshTokenRow>('refresh_tokens')
        .where({ jti, revoked_at: null })
        .update({ revoked_at: new Date(), replaced_by: replacedBy })
        .returning('*');

      if (claimed) {
        return { status: 'rotated', token: toRefreshToken(claimed) };
      }

      const existing = await trx<RefreshTokenRow>('refresh_tokens')
        .where({ jti })
        .first();
      if (!existing) {
        return { status: 'not_found' };
      }
      return { status: 'reuse', userId: existing.user_id };
    });
  }

  async revokeByJti(jti: string): Promise<void> {
    await this.db
      .knex<RefreshTokenRow>('refresh_tokens')
      .where({ jti, revoked_at: null })
      .update({ revoked_at: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .knex<RefreshTokenRow>('refresh_tokens')
      .where({ user_id: userId, revoked_at: null })
      .update({ revoked_at: new Date() });
  }
}
