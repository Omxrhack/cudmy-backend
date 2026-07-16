/**
 * Errores de dominio de verification. Puros: no conocen NestJS ni HTTP.
 * La presentación los traduce a códigos de negocio y status HTTP.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidChannelError extends DomainError {
  constructor(value: string) {
    super(`Canal de verificación inválido: "${value}"`);
  }
}

export class InvalidDestinationError extends DomainError {
  constructor() {
    super('Destino inválido para el canal de verificación');
  }
}

export class NoActiveCodeError extends DomainError {
  constructor() {
    super('No hay un código de verificación activo');
  }
}

export class CodeExpiredError extends DomainError {
  constructor() {
    super('El código de verificación expiró');
  }
}

export class TooManyAttemptsError extends DomainError {
  constructor() {
    super('Demasiados intentos; solicita un código nuevo');
  }
}

export class InvalidCodeError extends DomainError {
  constructor() {
    super('Código de verificación inválido');
  }
}

export class ResendCooldownError extends DomainError {
  constructor(secondsRemaining: number) {
    super(`Espera ${secondsRemaining}s antes de solicitar otro código`);
  }
}
