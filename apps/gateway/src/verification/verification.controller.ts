import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  RequestCodeResponse,
  VERIFICATION_PATTERNS,
  VERIFICATION_SERVICE,
  VerifyCodeResponse,
} from '@app/common';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser, JwtAuthGuard } from '../common/jwt-auth.guard';
import { RequestCodeDto } from './dto/request-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(
    @Inject(VERIFICATION_SERVICE) private readonly client: ClientProxy,
  ) {}

  @Post('request')
  @HttpCode(202)
  request(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestCodeDto,
  ): Promise<RequestCodeResponse> {
    // El destino se resuelve del token del usuario, no del body.
    const destination = dto.channel === 'email' ? user.email : user.phoneNumber;
    return firstValueFrom(
      this.client.send<RequestCodeResponse>(VERIFICATION_PATTERNS.REQUEST, {
        userId: user.userId,
        channel: dto.channel,
        destination,
      }),
    );
  }

  @Post('verify')
  @HttpCode(200)
  verify(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyCodeDto,
  ): Promise<VerifyCodeResponse> {
    return firstValueFrom(
      this.client.send<VerifyCodeResponse>(VERIFICATION_PATTERNS.VERIFY, {
        userId: user.userId,
        channel: dto.channel,
        code: dto.code,
      }),
    );
  }
}
