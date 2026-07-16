/** Hashing de códigos OTP (argon2 en infraestructura). */
export abstract class CodeHasher {
  abstract hash(code: string): Promise<string>;
  abstract verify(hash: string, code: string): Promise<boolean>;
}
