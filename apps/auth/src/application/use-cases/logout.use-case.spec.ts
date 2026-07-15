import { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { TokenService } from '../ports/token-service.port';
import { LogoutUseCase } from './logout.use-case';

describe('LogoutUseCase', () => {
  let refreshTokens: jest.Mocked<RefreshTokenRepository>;
  let tokens: jest.Mocked<TokenService>;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    refreshTokens = {
      create: jest.fn(),
      findByJti: jest.fn(),
      claimForRotation: jest.fn(),
      revokeByJti: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    tokens = {
      signAccess: jest.fn(),
      signRefresh: jest.fn(),
      verifyRefresh: jest.fn(),
    };
    useCase = new LogoutUseCase(refreshTokens, tokens);
  });

  it('revoca solo la sesión presentada (por jti)', async () => {
    tokens.verifyRefresh.mockResolvedValue({ sub: 'user-1', jti: 'jti-1' });

    await useCase.execute({ refreshToken: 'raw' });

    expect(refreshTokens.revokeByJti).toHaveBeenCalledWith('jti-1');
    expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('con allSessions revoca todas las sesiones del usuario', async () => {
    tokens.verifyRefresh.mockResolvedValue({ sub: 'user-1', jti: 'jti-1' });

    await useCase.execute({ refreshToken: 'raw', allSessions: true });

    expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('user-1');
    expect(refreshTokens.revokeByJti).not.toHaveBeenCalled();
  });

  it('es idempotente: token inválido es un no-op', async () => {
    tokens.verifyRefresh.mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'garbage' }),
    ).resolves.toBeUndefined();
    expect(refreshTokens.revokeByJti).not.toHaveBeenCalled();
    expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
  });
});
