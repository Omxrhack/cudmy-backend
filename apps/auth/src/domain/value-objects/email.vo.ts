import { InvalidEmailError } from '../errors/auth-domain.errors';

/** Value object de email: normaliza (trim + minúsculas) y valida el formato. */
export class Email {
  private static readonly PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private readonly value: string;

  constructor(value: string) {
    const normalized = (value ?? '').trim().toLowerCase();
    if (normalized.length === 0 || !Email.PATTERN.test(normalized)) {
      throw new InvalidEmailError(value);
    }
    this.value = normalized;
  }

  get raw(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
