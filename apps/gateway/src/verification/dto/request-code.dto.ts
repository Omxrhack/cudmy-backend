import { IsIn } from 'class-validator';
import { VerificationChannel } from '@app/common';

export class RequestCodeDto {
  @IsIn(['sms', 'email'])
  channel!: VerificationChannel;
}
