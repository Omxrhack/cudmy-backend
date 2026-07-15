import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  AUTH_PATTERNS,
  AUTH_SERVICE,
  AuthTokensResponse,
  RegisterResponse,
} from '@app/common';
import { AuthUser, JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly client: ClientProxy) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    return this.forward(AUTH_PATTERNS.REGISTER, dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthTokensResponse> {
    return this.forward(AUTH_PATTERNS.LOGIN, dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto): Promise<AuthTokensResponse> {
    return this.forward(AUTH_PATTERNS.REFRESH, dto);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.forward(AUTH_PATTERNS.LOGOUT, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  private forward<T>(pattern: string, data: unknown): Promise<T> {
    return firstValueFrom(this.client.send<T>(pattern, data));
  }
}
