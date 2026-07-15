import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsString, validateSync } from 'class-validator';

/** Variables de entorno requeridas por el microservicio auth. */
class AuthEnv {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  NATS_URL!: string;

  @IsString()
  @IsNotEmpty()
  ACCESS_TOKEN_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  ACCESS_TOKEN_TTL!: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_TTL!: string;
}

export function validateAuthEnv(config: Record<string, unknown>): AuthEnv {
  const validated = plainToInstance(AuthEnv, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Configuración de entorno inválida (auth):\n${errors
        .map((e) => e.toString())
        .join('\n')}`,
    );
  }
  return validated;
}
