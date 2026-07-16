import { OtpCode, OtpCodeProps } from '../../domain/entities/otp-code.entity';
import {
  CodeExpiredError,
  InvalidCodeError,
  NoActiveCodeError,
  TooManyAttemptsError,
} from '../../domain/errors/verification-domain.errors';
import { VerificationCodeRepository } from '../../domain/ports/verification-code.repository';
import { Clock } from '../ports/clock.port';
import { CodeHasher } from '../ports/code-hasher.port';
import { ContactVerifiedPublisher } from '../ports/contact-verified.publisher.port';
import { VerifyCodeUseCase } from './verify-code.use-case';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const MAX = 5;

function buildOtp(overrides: Partial<OtpCodeProps> = {}): OtpCode {
  return new OtpCode({
    id: 'c1',
    userId: 'u1',
    channel: 'email',
    destination: 'a@b.com',
    codeHash: 'h',
    expiresAt: new Date(NOW.getTime() + 600_000),
    consumedAt: null,
    attempts: 0,
    createdAt: NOW,
    ...overrides,
  });
}

describe('VerifyCodeUseCase', () => {
  let codes: jest.Mocked<VerificationCodeRepository>;
  let hasher: jest.Mocked<CodeHasher>;
  let clock: jest.Mocked<Clock>;
  let publisher: jest.Mocked<ContactVerifiedPublisher>;
  let useCase: VerifyCodeUseCase;

  beforeEach(() => {
    codes = {
      createInvalidatingPrevious: jest.fn(),
      findActive: jest.fn(),
      incrementAttempts: jest.fn(),
      consume: jest.fn(),
    };
    hasher = { hash: jest.fn(), verify: jest.fn() };
    clock = { now: jest.fn().mockReturnValue(NOW) };
    publisher = { publish: jest.fn() };
    useCase = new VerifyCodeUseCase(codes, hasher, clock, publisher, MAX);
  });

  it('verifica el código, lo consume y publica contact.verified', async () => {
    codes.findActive.mockResolvedValue(buildOtp());
    hasher.verify.mockResolvedValue(true);

    const out = await useCase.execute({
      userId: 'u1',
      channel: 'email',
      code: '123456',
    });

    expect(codes.consume).toHaveBeenCalledWith('c1');
    expect(publisher.publish).toHaveBeenCalledWith('u1', 'email');
    expect(out).toEqual({ verified: true, channel: 'email' });
  });

  it('sin código activo -> NoActiveCodeError', async () => {
    codes.findActive.mockResolvedValue(null);
    await expect(
      useCase.execute({ userId: 'u1', channel: 'email', code: '000000' }),
    ).rejects.toBeInstanceOf(NoActiveCodeError);
  });

  it('código expirado -> CodeExpiredError', async () => {
    codes.findActive.mockResolvedValue(
      buildOtp({ expiresAt: new Date(NOW.getTime() - 1000) }),
    );
    await expect(
      useCase.execute({ userId: 'u1', channel: 'email', code: '123456' }),
    ).rejects.toBeInstanceOf(CodeExpiredError);
  });

  it('intentos agotados -> TooManyAttemptsError (sin verificar hash)', async () => {
    codes.findActive.mockResolvedValue(buildOtp({ attempts: MAX }));
    await expect(
      useCase.execute({ userId: 'u1', channel: 'email', code: '123456' }),
    ).rejects.toBeInstanceOf(TooManyAttemptsError);
    expect(hasher.verify).not.toHaveBeenCalled();
  });

  it('código incorrecto -> incrementa intentos y lanza InvalidCodeError', async () => {
    codes.findActive.mockResolvedValue(buildOtp({ attempts: 0 }));
    hasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ userId: 'u1', channel: 'email', code: '999999' }),
    ).rejects.toBeInstanceOf(InvalidCodeError);
    expect(codes.incrementAttempts).toHaveBeenCalledWith('c1');
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('código incorrecto en el último intento -> TooManyAttemptsError', async () => {
    codes.findActive.mockResolvedValue(buildOtp({ attempts: MAX - 1 }));
    hasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ userId: 'u1', channel: 'email', code: '999999' }),
    ).rejects.toBeInstanceOf(TooManyAttemptsError);
    expect(codes.incrementAttempts).toHaveBeenCalledWith('c1');
  });
});
