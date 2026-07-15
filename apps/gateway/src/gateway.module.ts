import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/common';
import { AuthController } from './auth/auth.controller';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { validateGatewayEnv } from './common/env.validation';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateGatewayEnv }),
    JwtModule.register({}),
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.NATS,
          options: { servers: [config.getOrThrow<string>('NATS_URL')] },
        }),
      },
    ]),
  ],
  controllers: [HealthController, AuthController],
  providers: [JwtAuthGuard],
})
export class GatewayModule {}
