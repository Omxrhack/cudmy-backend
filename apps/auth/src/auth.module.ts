import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateAuthEnv } from './infrastructure/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateAuthEnv }),
  ],
})
export class AuthModule {}
