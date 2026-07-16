import { Injectable } from '@nestjs/common';
import {
  ChannelValue,
  OtpCode,
} from '../../../domain/entities/otp-code.entity';
import {
  NewOtpCode,
  VerificationCodeRepository,
} from '../../../domain/ports/verification-code.repository';
import { KnexService } from './knex.service';
import { toOtpCode, VerificationCodeRow } from './rows';

@Injectable()
export class VerificationCodeKnexRepository extends VerificationCodeRepository {
  constructor(private readonly db: KnexService) {
    super();
  }

  async createInvalidatingPrevious(data: NewOtpCode): Promise<OtpCode> {
    return this.db.knex.transaction(async (trx) => {
      await trx<VerificationCodeRow>('verification_codes')
        .where({
          user_id: data.userId,
          channel: data.channel,
          consumed_at: null,
        })
        .update({ consumed_at: new Date() });

      const [row] = await trx<VerificationCodeRow>('verification_codes')
        .insert({
          user_id: data.userId,
          channel: data.channel,
          destination: data.destination,
          code_hash: data.codeHash,
          expires_at: data.expiresAt,
          attempts: 0,
        })
        .returning('*');
      return toOtpCode(row);
    });
  }

  async findActive(
    userId: string,
    channel: ChannelValue,
  ): Promise<OtpCode | null> {
    const row = await this.db
      .knex<VerificationCodeRow>('verification_codes')
      .where({ user_id: userId, channel, consumed_at: null })
      .orderBy('created_at', 'desc')
      .first();
    return row ? toOtpCode(row) : null;
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.db
      .knex<VerificationCodeRow>('verification_codes')
      .where({ id })
      .increment('attempts', 1);
  }

  async consume(id: string): Promise<void> {
    await this.db
      .knex<VerificationCodeRow>('verification_codes')
      .where({ id })
      .update({ consumed_at: new Date() });
  }
}
