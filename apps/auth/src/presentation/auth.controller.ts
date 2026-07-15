import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AUTH_PATTERNS,
  AuthTokensResponse,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegisterRequest,
  RegisterResponse,
} from '@app/common';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RefreshTokensUseCase } from '../application/use-cases/refresh-tokens.use-case';
import { RegisterUseCase } from '../application/use-cases/register.use-case';

@Controller()
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshTokensUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @MessagePattern(AUTH_PATTERNS.REGISTER)
  register(@Payload() data: RegisterRequest): Promise<RegisterResponse> {
    return this.registerUseCase.execute(data);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() data: LoginRequest): Promise<AuthTokensResponse> {
    return this.loginUseCase.execute(data);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  refresh(@Payload() data: RefreshRequest): Promise<AuthTokensResponse> {
    return this.refreshUseCase.execute(data);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  async logout(@Payload() data: LogoutRequest): Promise<{ success: true }> {
    await this.logoutUseCase.execute(data);
    return { success: true };
  }
}
