/** Puerto de hashing (implementado con argon2 en infraestructura). */
export abstract class PasswordHasher {
  /** Devuelve el hash del texto plano. */
  abstract hash(plain: string): Promise<string>;
  /** Verifica el texto plano contra un hash previo (comparación en tiempo constante). */
  abstract verify(hash: string, plain: string): Promise<boolean>;
}
