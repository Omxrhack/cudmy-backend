import { InvalidPhoneNumberError } from '../errors/auth-domain.errors';

/** Value object de teléfono en formato E.164 (p. ej. +5216181234567). */
export class PhoneNumber {
  private static readonly PATTERN = /^\+[1-9]\d{1,14}$/;

  private readonly value: string;

  constructor(value: string) {
    const normalized = (value ?? '').trim();
    if (!PhoneNumber.PATTERN.test(normalized)) {
      throw new InvalidPhoneNumberError(value);
    }
    this.value = normalized;
  }

  get raw(): string {
    return this.value;
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
