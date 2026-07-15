/** Value object que envuelve una contraseña ya hasheada (nunca el texto plano). */
export class HashedPassword {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('HashedPassword no puede estar vacío');
    }
    this.value = value;
  }

  get raw(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
