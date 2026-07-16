/** Patrones de mensaje NATS del microservicio de verificación (request/response). */
export const VERIFICATION_PATTERNS = {
  REQUEST: 'verification.request',
  VERIFY: 'verification.verify',
} as const;

export type VerificationPattern =
  (typeof VERIFICATION_PATTERNS)[keyof typeof VERIFICATION_PATTERNS];

/** Canal por el que se envía/verifica un código OTP. */
export type VerificationChannel = 'sms' | 'email';
