/** Genera códigos OTP numéricos (implementado con crypto en infraestructura). */
export abstract class CodeGenerator {
  abstract generate(length: number): string;
}
