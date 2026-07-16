import { IsIn, Matches } from 'class-validator';
import { VerificationChannel } from '@app/common';

export class VerifyCodeDto {
  @IsIn(['sms', 'email'])
  channel!: VerificationChannel;

  @Matches(/^\d{6}$/, { message: 'code debe ser un código de 6 dígitos' })
  code!: string;
}
