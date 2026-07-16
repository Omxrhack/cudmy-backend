import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  validateSync,
} from 'class-validator';

class VerificationEnv {
  @IsString()
  @IsNotEmpty()
  VERIFICATION_DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  NATS_URL!: string;

  @IsInt()
  OTP_TTL_SECONDS!: number;

  @IsInt()
  OTP_CODE_LENGTH!: number;

  @IsInt()
  OTP_MAX_ATTEMPTS!: number;

  @IsInt()
  OTP_RESEND_COOLDOWN_SECONDS!: number;

  @IsIn(['console', 'memory', 'twilio'])
  SMS_PROVIDER!: string;

  @IsIn(['console', 'memory', 'smtp'])
  EMAIL_PROVIDER!: string;
}

export function validateVerificationEnv(
  config: Record<string, unknown>,
): VerificationEnv {
  const validated = plainToInstance(VerificationEnv, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Configuración de entorno inválida (verification):\n${errors
        .map((e) => e.toString())
        .join('\n')}`,
    );
  }
  return validated;
}
