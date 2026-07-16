import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { VerificationRpcExceptionFilter } from './presentation/verification-rpc-exception.filter';
import { VerificationModule } from './verification.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    VerificationModule,
    {
      transport: Transport.NATS,
      options: {
        servers: [process.env.NATS_URL ?? 'nats://localhost:4222'],
      },
    },
  );
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new VerificationRpcExceptionFilter());
  await app.listen();

  console.log('[verification] microservicio escuchando en NATS');
}

void bootstrap();
