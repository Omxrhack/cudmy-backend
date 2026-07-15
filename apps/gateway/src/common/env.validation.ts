import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, validateSync } from 'class-validator';

/** Variables de entorno requeridas por el gateway HTTP. */
class GatewayEnv {
  @IsInt()
  GATEWAY_PORT!: number;

  @IsString()
  @IsNotEmpty()
  NATS_URL!: string;

  // Compartido con auth: el gateway valida el access token localmente.
  @IsString()
  @IsNotEmpty()
  ACCESS_TOKEN_SECRET!: string;
}

export function validateGatewayEnv(
  config: Record<string, unknown>,
): GatewayEnv {
  const validated = plainToInstance(GatewayEnv, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Configuración de entorno inválida (gateway):\n${errors
        .map((e) => e.toString())
        .join('\n')}`,
    );
  }
  return validated;
}
