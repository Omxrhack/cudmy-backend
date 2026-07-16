import { OtpCode, OtpCodeProps } from '../../domain/entities/otp-code.entity';
import {
  InvalidChannelError,
  ResendCooldownError,
} from '../../domain/errors/verification-domain.errors';
import { VerificationCodeRepository } from '../../domain/ports/verification-code.repository';
import { OtpPolicy } from '../dtos/verification.dtos';
import { Clock } from '../ports/clock.port';
import { CodeGenerator } from '../ports/code-generator.port';
import { CodeHasher } from '../ports/code-hasher.port';
import { Notifier } from '../ports/notifier.port';
import { RequestVerificationCodeUseCase } from './request-verification-code.use-case';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const policy: OtpPolicy = {
  ttlMs: 600_000,
  codeLength: 6,
  maxAttempts: 5,
  cooldownMs: 60_000,
};

function buildOtp(overrides: Partial<OtpCodeProps> = {}): OtpCode {
  return new OtpCode({
    id: 'c1',
    userId: 'u1',
    channel: 'email',
    destination: 'a@b.com',
    codeHash: 'h',
    expiresAt: new Date(NOW.getTime() + policy.ttlMs),
    consumedAt: null,
    attempts: 0,
    createdAt: NOW,
    ...overrides,
  });
}

describe('RequestVerificationCodeUseCase', () => {
  let codes: jest.Mocked<VerificationCodeRepository>;
  let generator: jest.Mocked<CodeGenerator>;
  let hasher: jest.Mocked<CodeHasher>;
  let notifier: jest.Mocked<Notifier>;
  let clock: jest.Mocked<Clock>;
  let useCase: RequestVerificationCodeUseCase;

  beforeEach(() => {
    codes = {
      createInvalidatingPrevious: jest.fn(),
      findActive: jest.fn(),
      incrementAttempts: jest.fn(),
      consume: jest.fn(),
    };
    generator = { generate: jest.fn() };
    hasher = { hash: jest.fn(), verify: jest.fn() };
    notifier = { send: jest.fn() };
    clock = { now: jest.fn().mockReturnValue(NOW) };
    useCase = new RequestVerificationCodeUseCase(
      codes,
      generator,
      hasher,
      notifier,
      clock,
      policy,
    );
  });

  it('genera, hashea, guarda y entrega el código (sin devolverlo)', async () => {
    codes.findActive.mockResolvedValue(null);
    generator.generate.mockReturnValue('123456');
    hasher.hash.mockResolvedValue('hashed');
    codes.createInvalidatingPrevious.mockResolvedValue(buildOtp());

    const out = await useCase.execute({
      userId: 'u1',
      channel: 'email',
      destination: 'a@b.com',
    });

    expect(generator.generate).toHaveBeenCalledWith(6);
    expect(hasher.hash).toHaveBeenCalledWith('123456');
    expect(codes.createInvalidatingPrevious).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        channel: 'email',
        codeHash: 'hashed',
      }),
    );
    expect(notifier.send).toHaveBeenCalledWith({
      channel: 'email',
      destination: 'a@b.com',
      code: '123456',
    });
    expect(out).toEqual({
      channel: 'email',
      expiresAt: new Date(NOW.getTime() + policy.ttlMs),
    });
    expect(out).not.toHaveProperty('code');
  });

  it('rechaza el reenvío dentro del cooldown', async () => {
    codes.findActive.mockResolvedValue(buildOtp({ createdAt: NOW }));

    await expect(
      useCase.execute({
        userId: 'u1',
        channel: 'email',
        destination: 'a@b.com',
      }),
    ).rejects.toBeInstanceOf(ResendCooldownError);
    expect(codes.createInvalidatingPrevious).not.toHaveBeenCalled();
  });

  it('permite el reenvío pasado el cooldown', async () => {
    codes.findActive.mockResolvedValue(
      buildOtp({ createdAt: new Date(NOW.getTime() - 120_000) }),
    );
    generator.generate.mockReturnValue('654321');
    hasher.hash.mockResolvedValue('h2');
    codes.createInvalidatingPrevious.mockResolvedValue(buildOtp());

    await useCase.execute({
      userId: 'u1',
      channel: 'email',
      destination: 'a@b.com',
    });
    expect(codes.createInvalidatingPrevious).toHaveBeenCalledTimes(1);
  });

  it('rechaza un canal inválido', async () => {
    await expect(
      useCase.execute({ userId: 'u1', channel: 'pigeon', destination: 'x' }),
    ).rejects.toBeInstanceOf(InvalidChannelError);
  });
});
