import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { RpcToHttpExceptionFilter } from './common/rpc-to-http.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(GatewayModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  const port = process.env.GATEWAY_PORT ?? 3000;
  await app.listen(port);

  console.log(`[gateway] HTTP escuchando en el puerto ${port}`);
}

void bootstrap();
