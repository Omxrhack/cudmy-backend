/**
 * Errores de dominio de auth. Puros: no conocen NestJS ni HTTP.
 * La presentación (gateway) los traduce a códigos de negocio y status HTTP.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Credenciales inválidas');
  }
}

export class EmailAlreadyInUseError extends DomainError {
  constructor(email: string) {
    super(`El email "${email}" ya está en uso`);
  }
}

export class InvalidRefreshTokenError extends DomainError {
  constructor() {
    super('Refresh token inválido');
  }
}

export class RefreshTokenReuseError extends DomainError {
  constructor() {
    super(
      'Reúso de refresh token detectado; todas las sesiones fueron revocadas',
    );
  }
}

export class InvalidEmailError extends DomainError {
  constructor(value: string) {
    super(`Email inválido: "${value}"`);
  }
}
